import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const RAW_DIR = './raw_renders';
const OUT_DIR = './public/assets/items';
const OFFSETS_FILE = './src/item_offsets.generated.ts';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const ITEM_IDS = [
  'onigiri', 'nigiri', 'maki', 'temaki', 'gyoza', 'purin', 'dango',
  'yakitori', 'ramen', 'mochi', 'dorayaki', 'takoyaki', 'edamame',
  'matcha_latte', 'tamagoyaki', 'wagashi', 'kakigori', 'ichigo_daifuku',
  'sakura_mochi', 'inarizushi'
];

const OUT_EXT = 'webp';
const ENCODE = { quality: 95, alphaQuality: 100, effort: 6 };

const FRAME_WIDTH = 1440;
const CARD_HEIGHT = 256;
const TARGET_SIZE = 384;

const EDGE_SPRITE = 8;
const EDGE_LAYER = 6;

const ITEM_DISPLAY_SIZE = 72;
const DEFAULT_OFFSET = 36;

function findAlphaBounds(data, width, height) {
  let top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        break;
      }
    }
  }
  return { top, bottom };
}

function findAlphaBox(data, width, height, alphaMin = 80, region = null) {
  const rx0 = region ? region.left : 0;
  const ry0 = region ? region.top : 0;
  const rx1 = region ? region.right : width - 1;
  const ry1 = region ? region.bottom : height - 1;

  const rows = new Uint32Array(height);
  const cols = new Uint32Array(width);

  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaMin) {
        rows[y]++;
        cols[x]++;
      }
    }
  }

  const minRow = Math.max(3, Math.round((rx1 - rx0 + 1) * 0.005));
  const minCol = Math.max(3, Math.round((ry1 - ry0 + 1) * 0.005));

  let y0 = -1, y1 = -1, x0 = -1, x1 = -1;
  for (let y = ry0; y <= ry1; y++) if (rows[y] >= minRow) { if (y0 < 0) y0 = y; y1 = y; }
  for (let x = rx0; x <= rx1; x++) if (cols[x] >= minCol) { if (x0 < 0) x0 = x; x1 = x; }

  if (y0 < 0 || x0 < 0) return null;
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

function findBlobRegion(data, width, height, strategy = 'union', alphaMin = 80, step = 4) {
  const mw = Math.ceil(width / step);
  const mh = Math.ceil(height / step);
  const mask = new Uint8Array(mw * mh);

  for (let my = 0; my < mh; my++) {
    for (let mx = 0; mx < mw; mx++) {
      const x = Math.min(width - 1, mx * step);
      const y = Math.min(height - 1, my * step);
      if (data[(y * width + x) * 4 + 3] > alphaMin) mask[my * mw + mx] = 1;
    }
  }

  const seen = new Uint8Array(mw * mh);
  const stack = new Int32Array(mw * mh);
  const blobs = [];

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;

    let sp = 0;
    stack[sp++] = i;
    seen[i] = 1;

    let count = 0, x0 = mw, y0 = mh, x1 = -1, y1 = -1;

    while (sp > 0) {
      const cur = stack[--sp];
      const cx = cur % mw;
      const cy = (cur - cx) / mw;
      count++;
      if (cx < x0) x0 = cx;
      if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy;
      if (cy > y1) y1 = cy;

      if (cx > 0 && mask[cur - 1] && !seen[cur - 1]) { seen[cur - 1] = 1; stack[sp++] = cur - 1; }
      if (cx < mw - 1 && mask[cur + 1] && !seen[cur + 1]) { seen[cur + 1] = 1; stack[sp++] = cur + 1; }
      if (cy > 0 && mask[cur - mw] && !seen[cur - mw]) { seen[cur - mw] = 1; stack[sp++] = cur - mw; }
      if (cy < mh - 1 && mask[cur + mw] && !seen[cur + mw]) { seen[cur + mw] = 1; stack[sp++] = cur + mw; }
    }

    blobs.push({ count, x0, y0, x1, y1, aspect: (x1 - x0 + 1) / (y1 - y0 + 1) });
  }

  if (blobs.length === 0) return null;

  const maxCount = Math.max(...blobs.map(b => b.count));
  const candidates = blobs.filter(b => b.count >= maxCount * 0.08);

  let best;
  if (strategy === 'widest') {
    best = candidates.reduce((a, b) => (b.aspect > a.aspect ? b : a));
  } else {
    best = candidates.reduce((a, b) => ({
      x0: Math.min(a.x0, b.x0),
      y0: Math.min(a.y0, b.y0),
      x1: Math.max(a.x1, b.x1),
      y1: Math.max(a.y1, b.y1)
    }));
  }

  if (candidates.length > 1) {
    console.log(`    ${candidates.length} relevante Objekte im Render, Strategie '${strategy}'`);
  }

  return {
    left: Math.max(0, (best.x0 - 1) * step),
    top: Math.max(0, (best.y0 - 1) * step),
    right: Math.min(width - 1, (best.x1 + 1) * step),
    bottom: Math.min(height - 1, (best.y1 + 1) * step)
  };
}

function fillInteriorHoles(data, width, height, alphaMax = 250, maxShare = 0.02) {
  const n = width * height;
  const isHole = i => data[i * 4 + 3] <= alphaMax;

  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;

  const push = i => {
    if (!seen[i] && isHole(i)) { seen[i] = 1; stack[sp++] = i; }
  };

  for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }

  while (sp > 0) {
    const cur = stack[--sp];
    const cx = cur % width;
    const cy = (cur - cx) / width;
    if (cx > 0) push(cur - 1);
    if (cx < width - 1) push(cur + 1);
    if (cy > 0) push(cur - width);
    if (cy < height - 1) push(cur + width);
  }

  let solid = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] > alphaMax) solid++;
  const limit = Math.max(64, Math.round(solid * maxShare));

  const comp = new Int32Array(n);
  let filled = 0;
  let holes = 0;

  for (let start = 0; start < n; start++) {
    if (seen[start] || !isHole(start)) continue;

    let cp = 0;
    let head = 0;
    comp[cp++] = start;
    seen[start] = 1;

    while (head < cp) {
      const cur = comp[head++];
      const cx = cur % width;
      const cy = (cur - cx) / width;
      const add = i => { if (!seen[i] && isHole(i)) { seen[i] = 1; comp[cp++] = i; } };
      if (cx > 0) add(cur - 1);
      if (cx < width - 1) add(cur + 1);
      if (cy > 0) add(cur - width);
      if (cy < height - 1) add(cur + width);
    }

    if (cp > limit) { holes++; continue; }
    for (let k = 0; k < cp; k++) {
      if (data[comp[k] * 4 + 3] < 255) { data[comp[k] * 4 + 3] = 255; filled++; }
    }
  }

  return { filled, holes };
}

function detectKeyColor(data, width, height) {
  const ch = [[], [], []];
  const take = (x, y) => {
    const i = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) ch[c].push(data[i + c]);
  };
  for (let x = 0; x < width; x += 5) { take(x, 2); take(x, height - 3); }
  for (let y = 0; y < height; y += 5) { take(2, y); take(width - 3, y); }

  const med = ch.map(a => { a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; });
  const spread = Math.max(...med) - Math.min(...med);

  if (spread > 60) return { r: med[0], g: med[1], b: med[2], chroma: true };
  return { r: 255, g: 255, b: 255, chroma: false };
}

function findKeyThreshold(data, key) {
  const BIN = 5;
  const bins = new Array(Math.ceil(442 / BIN)).fill(0);
  const total = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    const d = Math.sqrt(
      (key.r - data[i]) ** 2 + (key.g - data[i + 1]) ** 2 + (key.b - data[i + 2]) ** 2);
    bins[Math.min(bins.length - 1, Math.floor(d / BIN))]++;
  }

  const quiet = total * 0.002;
  let lo = 0;
  while (lo < bins.length && bins[lo] > quiet) lo++;
  let hi = lo;
  while (hi < bins.length && bins[hi] <= quiet) hi++;

  if (hi >= bins.length || hi - lo < 2) return { cut: 60, ramp: 50 };

  const dLo = lo * BIN;
  const dHi = hi * BIN;
  return { cut: dLo + (dHi - dLo) * 0.5, ramp: Math.max(12, (dHi - dLo) * 0.4) };
}

function defringe(data, stripHalo = true, key = null) {
  if (key && key.chroma) {
    const { cut, ramp } = findKeyThreshold(data, key);

    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.sqrt(
        (key.r - data[i]) ** 2 + (key.g - data[i + 1]) ** 2 + (key.b - data[i + 2]) ** 2);

      if (dist >= cut) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        if (sat < 40 && r > g && b > g) {
          data[i] = Math.round(g + (r - g) * 0.3);
          data[i + 2] = Math.round(g + (b - g) * 0.3);
        }
      }

      if (dist < cut) data[i + 3] = 0;
      else if (dist < cut + ramp) {
        data[i + 3] = Math.floor(((dist - cut) / ramp) * 255);
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const t = 1 - (dist - cut) / ramp;
        data[i] = Math.round(data[i] * (1 - t) + lum * t);
        data[i + 1] = Math.round(data[i + 1] * (1 - t) + lum * t);
        data[i + 2] = Math.round(data[i + 2] * (1 - t) + lum * t);
      }
    }
    return data;
  }

  return defringeWhite(data, stripHalo);
}

function defringeWhite(data, stripHalo = true) {
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.sqrt((255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2);
    if (dist < 18) data[i + 3] = 0;
    else if (dist < 38) data[i + 3] = Math.floor(((dist - 18) / 20) * 255);
  }

  if (stripHalo) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0 || a >= 250) continue;
      if (Math.min(data[i], data[i + 1], data[i + 2]) > 225) data[i + 3] = 0;
    }
  }

  return data;
}

function isShadowPixel(data, idx) {
  if (data[idx + 3] < 8) return true;
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 10 && Math.min(r, g, b) > 150;
}

function trimSoftEdges(data, width, box, minCoverage = 0.6, alphaMin = 200) {
  let { left, top } = box;
  let right = box.left + box.width - 1;
  let bottom = box.top + box.height - 1;

  const rowCov = y => {
    let hit = 0;
    for (let x = left; x <= right; x++) if (data[(y * width + x) * 4 + 3] > alphaMin) hit++;
    return hit / (right - left + 1);
  };
  const colCov = x => {
    let hit = 0;
    for (let y = top; y <= bottom; y++) if (data[(y * width + x) * 4 + 3] > alphaMin) hit++;
    return hit / (bottom - top + 1);
  };

  while (bottom > top && rowCov(bottom) < minCoverage) bottom--;
  while (top < bottom && rowCov(top) < minCoverage) top++;
  while (right > left && colCov(right) < minCoverage) right--;
  while (left < right && colCov(left) < minCoverage) left++;

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function trimShadowEdges(data, width, box, threshold = 0.9) {
  let { left, top } = box;
  let right = box.left + box.width - 1;
  let bottom = box.top + box.height - 1;

  const rowIsShadow = y => {
    let hit = 0, total = 0;
    for (let x = left; x <= right; x++, total++) if (isShadowPixel(data, (y * width + x) * 4)) hit++;
    return total > 0 && hit / total >= threshold;
  };
  const colIsShadow = x => {
    let hit = 0, total = 0;
    for (let y = top; y <= bottom; y++, total++) if (isShadowPixel(data, (y * width + x) * 4)) hit++;
    return total > 0 && hit / total >= threshold;
  };

  while (bottom > top && rowIsShadow(bottom)) bottom--;
  while (top < bottom && rowIsShadow(top)) top++;
  while (right > left && colIsShadow(right)) right--;
  while (left < right && colIsShadow(left)) left++;

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function cleanEdges(data, width, height, key, radius = 5) {
  const n = width * height;
  const dist = new Int16Array(n).fill(-1);
  let queue = [];

  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) { dist[i] = 0; queue.push(i); }
  }
  if (queue.length === 0 || queue.length === n) return;

  for (let d = 0; d < radius && queue.length; d++) {
    const next = [];
    for (const i of queue) {
      const x = i % width, y = (i / width) | 0;
      if (x > 0 && dist[i - 1] < 0) { dist[i - 1] = d + 1; next.push(i - 1); }
      if (x < width - 1 && dist[i + 1] < 0) { dist[i + 1] = d + 1; next.push(i + 1); }
      if (y > 0 && dist[i - width] < 0) { dist[i - width] = d + 1; next.push(i - width); }
      if (y < height - 1 && dist[i + width] < 0) { dist[i + width] = d + 1; next.push(i + width); }
    }
    queue = next;
  }

  if (key && key.chroma) {
    const kc = [key.r, key.g, key.b];
    const lo = kc.indexOf(Math.min(...kc));
    const [h1, h2] = [0, 1, 2].filter(c => c !== lo);

    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (data[o + 3] < 8) continue;
      const d = dist[i];
      const w = d > 0 && d <= radius ? 1 - (d - 1) / radius * 0.25 : 0.75;
      const excess = Math.min(data[o + h1], data[o + h2]) - data[o + lo];
      if (excess <= 0) continue;
      data[o + h1] = Math.round(data[o + h1] - w * excess);
      data[o + h2] = Math.round(data[o + h2] - w * excess);
    }
  }

  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) alpha[i] = data[i * 4 + 3];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      let sum = 0, min = 255, max = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const a = alpha[i + dy * width + dx];
          sum += a;
          if (a < min) min = a;
          if (a > max) max = a;
        }
      }
      if (max - min < 200) continue;
      data[i * 4 + 3] = Math.round((alpha[i] + sum / 9) / 2);
    }
  }
}

async function writeClean(pipeline, targetPath, key, radius = EDGE_SPRITE) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cleanEdges(data, info.width, info.height, key, radius);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp(ENCODE)
    .toFile(targetPath);
  return { data, info };
}

async function cropToContent(filePath, strategy = 'union', trimShadow = false, softEdge = 0) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const key = detectKeyColor(data, info.width, info.height);
  if (key.chroma) console.log(`    Chroma rgb(${key.r},${key.g},${key.b}), Schwelle ${findKeyThreshold(data, key).cut.toFixed(0)}`);
  defringe(data, true, key);

  const { filled, holes } = fillInteriorHoles(data, info.width, info.height);
  if (filled > 0) console.log(`    ${filled} Innenpixel wiederhergestellt`);
  if (holes > 0) console.log(`    ${holes} Durchgangsloch/-loecher erkannt und offen gelassen`);

  const region = strategy === 'none' ? null : findBlobRegion(data, info.width, info.height, strategy);
  const rawBox = findAlphaBox(data, info.width, info.height, 80, region);
  const raw = { width: info.width, height: info.height, channels: 4 };

  if (!rawBox) return { pipeline: sharp(data, { raw }), box: { left: 0, top: 0, width: info.width, height: info.height }, key };

  let box = trimShadow ? trimShadowEdges(data, info.width, rawBox) : rawBox;
  if (softEdge > 0) box = trimSoftEdges(data, info.width, box, softEdge);
  const cut = (rawBox.height - box.height) + (rawBox.width - box.width);
  if (cut > 0) console.log(`    Schattenrand entfernt: ${rawBox.width}x${rawBox.height} -> ${box.width}x${box.height}`);

  return { pipeline: sharp(data, { raw }).extract(box), box, key };
}

async function processImages() {
  if (!fs.existsSync(RAW_DIR)) return;
  const files = fs.readdirSync(RAW_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
  });

  const offsets = {};
  const produced = new Set();

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const baseName = path.parse(file).name;
    const targetPath = path.join(OUT_DIR, `${baseName}.${OUT_EXT}`);

    console.log(`Processing: ${file}`);

    // FALL 1: Hintergrund-Szenen (bgl_). Deckende Vollbilder, kein Chroma-Keying.
    // Nur skalieren auf FRAME_WIDTH, Seitenverhaeltnis erhalten.
    if (baseName.startsWith('bgl_')) {
      await sharp(filePath)
        .resize(FRAME_WIDTH, null, { fit: 'inside' })
        .webp(ENCODE)
        .toFile(targetPath);
      console.log(`  ${baseName}: skaliert auf Breite ${FRAME_WIDTH}`);
      continue;
    }

    // FALL 2: UI-Karten (NineSlice). Randlos auf sichtbaren Inhalt beschnitten.
    if (baseName.startsWith('ui_card_')) {
      const { pipeline, box, key } = await cropToContent(filePath, 'widest', true);
      const targetH = CARD_HEIGHT;
      const targetW = Math.max(64, Math.round(box.width * (targetH / box.height)));
      await writeClean(pipeline.resize(targetW, targetH, { fit: 'fill' }), targetPath, key, EDGE_LAYER);
      console.log(`  ${baseName}: content ${box.width}x${box.height} -> ${targetW}x${targetH}`);
      continue;
    }

    // FALL 3: Match-FX (quadratisch)
    if (baseName.startsWith('fx_')) {
      const { pipeline, key } = await cropToContent(filePath);
      await writeClean(
        pipeline.resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
        targetPath, key);
      continue;
    }

    // FALL 4: Booster-Buttons & Icons (quadratisch zentriert)
    if (baseName.startsWith('btn_') || baseName.startsWith('ui_')) {
      const { pipeline, key } = await cropToContent(filePath);
      await writeClean(
        pipeline.resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
        targetPath, key);
      continue;
    }

    // FALL 5: Food-Items (Freistellen, TARGET_SIZE, Bottom-Offset berechnen)
    if (!ITEM_IDS.includes(baseName)) continue;

    const { pipeline, key } = await cropToContent(filePath);
    const processed = pipeline
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const { data: processedData, info: processedInfo } = await writeClean(processed, targetPath, key);
    const bounds = findAlphaBounds(processedData, processedInfo.width, processedInfo.height);
    const offsetDesign = bounds.bottom >= 0
      ? parseFloat(((bounds.bottom + 1 - processedInfo.height / 2) * (ITEM_DISPLAY_SIZE / processedInfo.height)).toFixed(2))
      : DEFAULT_OFFSET;

    offsets[baseName] = offsetDesign;
    console.log(`  ${baseName}: finalBottom=${bounds.bottom}px -> ${offsetDesign}px design`);
  }

  // Fehlende Items auf Default setzen
  for (const id of ITEM_IDS) {
    if (!(id in offsets)) {
      offsets[id] = DEFAULT_OFFSET;
      console.log(`  ${id}: missing raw file, using default ${DEFAULT_OFFSET}px`);
    }
  }

  // Offsets-Datei schreiben
  const lines = ITEM_IDS
    .map(id => `  ${id}: ${offsets[id]}`)
    .join(',\n');

  // Altbestand aus frueheren Ausgabeformaten entfernen
  for (const f of fs.readdirSync(OUT_DIR)) {
    const ext = path.extname(f).toLowerCase();
    if (ext !== `.${OUT_EXT}` && ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log(`  entfernt (altes Format): ${f}`);
    }
  }

  // Altbestand frueherer Item-/BG-Sets entfernen: Food-Items, die nicht (mehr)
  // in ITEM_IDS stehen, und bgl_-Szenen ohne passenden Raw-Render. btn_/fx_/ui_
  // bleiben unangetastet, solange sie noch keinen aktuellen Raw-Render haben --
  // das sind gueltige, in Benutzung befindliche Assets aus einem frueheren Stil.
  const expectedBglNames = new Set(
    files.filter(f => path.parse(f).name.startsWith('bgl_')).map(f => path.parse(f).name)
  );
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (path.extname(f).toLowerCase() !== `.${OUT_EXT}`) continue;
    const baseName = path.parse(f).name;
    const isStaleItem = !baseName.startsWith('bgl_') && !baseName.startsWith('btn_')
      && !baseName.startsWith('fx_') && !baseName.startsWith('ui_')
      && !ITEM_IDS.includes(baseName);
    const isStaleBg = baseName.startsWith('bgl_') && !expectedBglNames.has(baseName);
    if (isStaleItem || isStaleBg) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log(`  entfernt (Altbestand): ${f}`);
    }
  }

  for (const f of fs.readdirSync(OUT_DIR)) {
    if (path.extname(f).toLowerCase() === `.${OUT_EXT}`) produced.add(path.parse(f).name);
  }

  const assetLines = [...produced].sort()
    .map(id => `  '${id}'`)
    .join(',\n');

  const tsContent = `// Auto-generated by scripts/process_assets.js — do not edit manually
export const ITEM_BOTTOM_OFFSETS: Record<string, number> = {
${lines}
};

// Dateiendung der erzeugten Texturen. Der Loader haengt sie an den Asset-Key an.
export const ASSET_EXT = '${OUT_EXT}';

// Alle Texturen, die tatsaechlich in public/assets/items/ liegen.
export const AVAILABLE_ASSETS: ReadonlySet<string> = new Set([
${assetLines}
]);
`;

  fs.writeFileSync(OFFSETS_FILE, tsContent, 'utf-8');
  console.log(`\nWrote ${OFFSETS_FILE}`);
  console.log('Asset Processing Complete.');
}

processImages();
