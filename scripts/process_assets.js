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
  'brass_sphere', 'cast_iron_bell', 'chasen_whisk', 'chashaku_scoop',
  'chawan_cup', 'coldbrew_flask', 'copper_caddy', 'dango_plate',
  'dango_stick', 'gotoku_trivet', 'incense_burner', 'kissa_toast',
  'kuro_mame_dome', 'matcha_montblanc', 'matcha_roll', 'mizuhiki_knot',
  'origami_dripper', 'shou_sugi_block', 'tetsubin_kettle', 'yokan_prism'
];

const TARGET_SIZE = 256;
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

// Robuste Alpha-Bounding-Box. sharp.trim() ist bei weichen Defringe-Kanten
// unzuverlaessig, und ein einzelnes Streupixel aus dem Render (JPEG-Artefakt,
// Rest einer Signatur) blaeht eine naive Box auf die halbe Leinwand auf. Daher:
// pro Zeile/Spalte zaehlen und nur Reihen akzeptieren, die genug deckende Pixel
// haben.
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

  // Eine Reihe zaehlt, wenn mindestens 0.5% ihrer Laenge deckend ist
  const minRow = Math.max(3, Math.round((rx1 - rx0 + 1) * 0.005));
  const minCol = Math.max(3, Math.round((ry1 - ry0 + 1) * 0.005));

  let y0 = -1, y1 = -1, x0 = -1, x1 = -1;
  for (let y = ry0; y <= ry1; y++) if (rows[y] >= minRow) { if (y0 < 0) y0 = y; y1 = y; }
  for (let x = rx0; x <= rx1; x++) if (cols[x] >= minCol) { if (x0 < 0) x0 = x; x1 = x; }

  if (y0 < 0 || x0 < 0) return null;
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Zerlegt die Maske in zusammenhaengende Flaechen. Nano Banana Pro legt
// gelegentlich ein zweites Objekt mit ins Bild (Spillover vom Anchor-Render);
// eine globale Bounding-Box umschliesst dann beide und das Asset wird
// zusammengestaucht. Gelabelt wird auf einer 1/4-Maske -- das reicht, um die
// Objekte zu trennen, und haelt den Flood-Fill schnell.
//
// strategy 'union':  alle substanziellen Flaechen zusammen. Richtig fuer Items
//   und Buttons -- ein abgesetztes Detail (Butterwuerfel, Goldflocke) darf nicht
//   wegfallen, Defringe-Krimskrams schon.
// strategy 'widest':  breitestes Seitenverhaeltnis, eine einzelne Flaeche.
//   Richtig fuer UI-Balken -- dort ist das Stoerobjekt (eine Nische, ein Regal)
//   oft flaechiger als die gesuchte Leiste.
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
  // Krimskrams unter 8% der groessten Flaeche kommt nie in Frage
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

  // Mit einem Maskenpixel Rand zurueck in volle Aufloesung
  return {
    left: Math.max(0, (best.x0 - 1) * step),
    top: Math.max(0, (best.y0 - 1) * step),
    right: Math.min(width - 1, (best.x1 + 1) * step),
    bottom: Math.min(height - 1, (best.y1 + 1) * step)
  };
}

function defringe(data) {
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.sqrt((255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2);
    if (dist < 18) data[i + 3] = 0;
    else if (dist < 38) data[i + 3] = Math.floor(((dist - 18) / 20) * 255);
  }

  // Weisser Saum. Der weiche Schlagschatten der Renders ist heller als der
  // Putz-Hintergrund im Spiel -- er liest sich dort nicht als Schatten, sondern
  // als Glühen unter dem Objekt. Solche Pixel sind fast weiss UND nur teilweise
  // deckend; deckende Flaechen (helle Items wie Toast oder Chawan) bleiben
  // unangetastet, weil ihr Alpha bereits 255 ist.
  //
  // Die Schwelle darf nicht ueber den Defringe-Rampenwert geloest werden: ein
  // globales Anheben wuerde die Brotflaeche des Toasts halbtransparent machen.
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a >= 250) continue;
    if (Math.min(data[i], data[i + 1], data[i + 2]) > 225) data[i + 3] = 0;
  }

  return data;
}

// Der weiche Schlagschatten der Renders liegt auf weissem Papier und kommt
// deshalb als hellgrauer, voll deckender Streifen an -- die Alpha-Logik greift
// dort nicht. Auf dem Putz-Hintergrund des Spiels liest sich dieser Streifen als
// Glühen unter dem Objekt.
//
// Erkennungsmerkmal: unbunt (geringe Kanalspreizung) und hell. Geprueft wird das
// nur reihenweise an den Kanten der Crop-Box, nie im Inneren -- eine
// Pixelmaske wuerde sonst Lichter aus weisser Keramik ausstanzen.
function isShadowPixel(data, idx) {
  if (data[idx + 3] < 8) return true;
  const r = data[idx], g = data[idx + 1], b = data[idx + 2];
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return spread < 10 && Math.min(r, g, b) > 150;
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

// Defringe -> exakter Alpha-Crop. Liefert eine sharp-Pipeline auf dem reinen
// Inhalt. Mit singleObject wird vorher auf die groesste zusammenhaengende
// Flaeche eingegrenzt, damit ein zweites Objekt im Render nichts verschiebt.
async function cropToContent(filePath, strategy = 'union', trimShadow = false) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  defringe(data);

  const region = strategy === 'none' ? null : findBlobRegion(data, info.width, info.height, strategy);
  const rawBox = findAlphaBox(data, info.width, info.height, 80, region);
  const raw = { width: info.width, height: info.height, channels: 4 };

  if (!rawBox) return { pipeline: sharp(data, { raw }), box: { left: 0, top: 0, width: info.width, height: info.height } };

  const box = trimShadow ? trimShadowEdges(data, info.width, rawBox) : rawBox;
  const cut = (rawBox.height - box.height) + (rawBox.width - box.width);
  if (cut > 0) console.log(`    Schattenrand entfernt: ${rawBox.width}x${rawBox.height} -> ${box.width}x${box.height}`);

  return { pipeline: sharp(data, { raw }).extract(box), box };
}

// Misst die lichte Weite der Nische im Hintergrund-Render. Die dunkle Innenkante
// des Hinoki-Rahmens ist auf halber Hoehe das jeweils dunkelste Pixel im linken
// bzw. rechten Randdrittel. Ergebnis: Anteil der Bildbreite (0..1).
async function measureCavityRatio(buf, width, height) {
  const y = Math.floor(height * 0.5);
  const lum = x => {
    const i = (y * width + x) * 4;
    return (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
  };
  let xl = 0, minL = Infinity, xr = width - 1, minR = Infinity;
  for (let x = 0; x < width * 0.4; x++) if (lum(x) < minL) { minL = lum(x); xl = x; }
  for (let x = Math.floor(width * 0.6); x < width; x++) if (lum(x) < minR) { minR = lum(x); xr = x; }
  return parseFloat(((xr - xl) / width).toFixed(4));
}

async function processImages() {
  if (!fs.existsSync(RAW_DIR)) return;
  const files = fs.readdirSync(RAW_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
  });

  const offsets = {};
  const cavities = {};
  const produced = new Set();

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const baseName = path.parse(file).name;
    const targetPath = path.join(OUT_DIR, `${baseName}.png`);

    console.log(`Processing: ${file}`);

    // FALL 1: Hintergrund-Vollbild (Seitenverhaeltnis erhalten, Breite 720)
    if (baseName.startsWith('bg_')) {
      await sharp(filePath)
        .resize(720, null, { fit: 'inside' })
        .png({ quality: 90 })
        .toFile(targetPath);
      const { data: bgData, info: bgInfo } = await sharp(targetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      cavities[baseName] = await measureCavityRatio(bgData, bgInfo.width, bgInfo.height);
      console.log(`  ${baseName}: cavityRatio=${cavities[baseName]}`);
      continue;
    }

    // FALL 1b: Parallax-Layer (freigestellt, Breite 720, Hoehe proportional).
    // Position im Frame bleibt erhalten -> Layer koennen 1:1 uebereinander liegen.
    if (baseName.startsWith('bgl_')) {
      const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      defringe(data);
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(720, null, { fit: 'inside' })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      continue;
    }

    // FALL 2: Regal-Leiste (exakter Alpha-Crop, dann auf 608x184 gestreckt)
    if (baseName.startsWith('shelf_')) {
      const { pipeline } = await cropToContent(filePath, 'widest', true);
      await pipeline
        .resize(608, 184, { fit: 'fill' })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      continue;
    }

    // FALL 3: UI-Karten. Randlos auf den sichtbaren Inhalt beschnitten, damit
    // NineSlice im Spiel exakt an der Kante der Karte ansetzt. Hoehe auf 128
    // normalisiert, Breite proportional (kein Verzerren des Rahmens).
    if (baseName.startsWith('ui_card_')) {
      const { pipeline, box } = await cropToContent(filePath, 'widest', true);
      const targetH = 128;
      const targetW = Math.max(64, Math.round(box.width * (targetH / box.height)));
      await pipeline
        .resize(targetW, targetH, { fit: 'fill' })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      console.log(`  ${baseName}: content ${box.width}x${box.height} -> ${targetW}x${targetH}`);
      continue;
    }

    // FALL 4: Match-FX (exakter Alpha-Crop, quadratischer Sprite)
    if (baseName.startsWith('fx_')) {
      const { pipeline } = await cropToContent(filePath);
      await pipeline
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      continue;
    }

    // FALL 4b: Booster-Buttons & Icons (exakter Alpha-Crop, quadratisch zentriert)
    if (baseName.startsWith('btn_') || baseName.startsWith('ui_')) {
      const { pipeline } = await cropToContent(filePath);
      await pipeline
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      continue;
    }

    // FALL 5: Goods & UI-Icons (Freistellen, 256x256, Bottom-Offset berechnen)
    if (!ITEM_IDS.includes(baseName)) continue;

    // Defringing + exakter Alpha-Crop + Resize auf 256x256. Die finale Textur ist
    // die einzige verlaessliche Quelle fuer die sichtbare Unterkante im Spiel.
    const { pipeline } = await cropToContent(filePath);
    const processed = pipeline
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const { data: processedData, info: processedInfo } = await processed
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bounds = findAlphaBounds(processedData, processedInfo.width, processedInfo.height);
    const offsetDesign = bounds.bottom >= 0
      ? parseFloat(((bounds.bottom + 1 - processedInfo.height / 2) * (ITEM_DISPLAY_SIZE / processedInfo.height)).toFixed(2))
      : DEFAULT_OFFSET;

    offsets[baseName] = offsetDesign;
    console.log(`  ${baseName}: finalBottom=${bounds.bottom}px → ${offsetDesign}px design`);

    await sharp(processedData, {
      raw: { width: processedInfo.width, height: processedInfo.height, channels: processedInfo.channels }
    })
      .png({ compressionLevel: 9 })
      .toFile(targetPath);
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

  // Manifest: was liegt am Ende wirklich in OUT_DIR? Der Client laedt optionale
  // Assets (bgl_ Layer, hoehere BG-Tiers) nur, wenn sie hier stehen -- sonst
  // liefert der Dev-Server das HTML-Fallback und der Loader stolpert darueber.
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (path.extname(f).toLowerCase() === '.png') produced.add(path.parse(f).name);
  }

  const assetLines = [...produced].sort()
    .map(id => `  '${id}'`)
    .join(',\n');

  const cavityLines = Object.keys(cavities).sort()
    .map(id => `  ${id}: ${cavities[id]}`)
    .join(',\n');

  const tsContent = `// Auto-generated by scripts/process_assets.js — do not edit manually
export const ITEM_BOTTOM_OFFSETS: Record<string, number> = {
${lines}
};

// Lichte Weite der Nische je Hintergrund, gemessen am fertigen PNG (Anteil der Bildbreite).
export const BG_CAVITY_RATIOS: Record<string, number> = {
${cavityLines}
};

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
