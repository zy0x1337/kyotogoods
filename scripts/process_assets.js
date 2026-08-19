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

// Parallax-Layer, die als freigestelltes Einzelobjekt platziert werden statt
// als bildfuellende Ebene. Alle uebrigen bgl_ Layer behalten ihre Position im
// 9:16-Frame, damit sie sich im Spiel deckungsgleich stapeln lassen.
const BGL_SPRITES = ['bgl_cat', 'bgl_dog'];

// Layer, die als bildbreites Band am unteren Rand sitzen. Sie werden auf ihren
// Inhalt beschnitten, weil die Renders unterhalb des Motivs Weissraum lassen --
// als Vollbild-Ebene wuerde das Band sonst in der Luft haengen.
const BGL_BANDS = ['bgl_meadow'];

// Layer, bei denen die Innenflaeche ausgestanzt wird, damit der Hintergrund
// durchscheint. Der Render liefert das Gehaeuse mit geschlossener Putzrueckwand
// -- ohne Ausstanzen waere die Gartenszene dahinter unsichtbar.
const BGL_KNOCKOUT = ['bgl_niche_frame'];

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

// Stanzt die geschlossene Innenflaeche eines Rahmens aus. Gefuellt wird von der
// Bildmitte her ueber unbunte, mittelhelle Pixel -- das Putzpanel. Der Holzrahmen
// ist stark warm (Kanalspreizung > 80) und stoppt die Fuellung zuverlaessig, der
// reinweisse Aussenbereich wird nie erreicht.
//
// Rueckgabe: Bounding-Box des Lochs, also die lichte Nische.
function knockOutPanel(data, width, height) {
  const isPanel = i => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lo = Math.min(r, g, b);
    return Math.max(r, g, b) - lo < 30 && lo > 140 && lo < 250;
  };

  const seed = (Math.floor(height / 2) * width + Math.floor(width / 2));
  if (!isPanel(seed * 4)) return null;

  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let sp = 0;
  stack[sp++] = seed;
  seen[seed] = 1;

  let x0 = width, y0 = height, x1 = -1, y1 = -1;

  while (sp > 0) {
    const cur = stack[--sp];
    const cx = cur % width;
    const cy = (cur - cx) / width;

    data[cur * 4 + 3] = 0;
    if (cx < x0) x0 = cx;
    if (cx > x1) x1 = cx;
    if (cy < y0) y0 = cy;
    if (cy > y1) y1 = cy;

    if (cx > 0 && !seen[cur - 1] && isPanel((cur - 1) * 4)) { seen[cur - 1] = 1; stack[sp++] = cur - 1; }
    if (cx < width - 1 && !seen[cur + 1] && isPanel((cur + 1) * 4)) { seen[cur + 1] = 1; stack[sp++] = cur + 1; }
    if (cy > 0 && !seen[cur - width] && isPanel((cur - width) * 4)) { seen[cur - width] = 1; stack[sp++] = cur - width; }
    if (cy < height - 1 && !seen[cur + width] && isPanel((cur + width) * 4)) { seen[cur + width] = 1; stack[sp++] = cur + width; }
  }

  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// Freigestellt wird gegen Weiss -- bei einem cremeweissen Objekt trifft das
// auch dessen hellste Stellen. Bei der Katze riss das Loecher in Kopf und Fell.
//
// Reparatur: von den Bildraendern her durch die transparenten Pixel fluten. Was
// dabei nicht erreicht wird, liegt im Inneren des Objekts und bekommt seine
// Deckung zurueck. Weiche Aussenkanten bleiben unangetastet, weil sie vom Rand
// aus erreichbar sind.
function fillInteriorHoles(data, width, height, alphaMax = 250) {
  const isHole = i => data[i * 4 + 3] <= alphaMax;

  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
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

  let filled = 0;
  for (let i = 0; i < width * height; i++) {
    if (!seen[i] && data[i * 4 + 3] < 255) { data[i * 4 + 3] = 255; filled++; }
  }
  return filled;
}

// Erkennt, wogegen freigestellt werden muss. Standard ist Weiss. Ist der Rand
// dagegen kraeftig bunt und einheitlich, wurde gegen eine Chroma-Flaeche
// gerendert -- dann wird gegen diese Farbe gekeyt.
//
// Noetig fuer helle Motive: der Katzen-Render hat einen Studio-Hintergrund von
// 241..251 Grau, waehrend das cremeweisse Fell bei 249..251 liegt. An der Stirn
// sind Motiv und Hintergrund exakt dieselbe Farbe -- weder ein Schwellwert noch
// eine Konnektivitaetsanalyse koennen das trennen. Gegen ein saettigungsstarkes
// Chroma ist die Trennung dagegen eindeutig.
function detectKeyColor(data, width, height) {
  const samples = [];
  const inset = 4;
  for (const [x, y] of [
    [inset, inset], [width - 1 - inset, inset],
    [inset, height - 1 - inset], [width - 1 - inset, height - 1 - inset],
    [Math.floor(width / 2), inset], [Math.floor(width / 2), height - 1 - inset]
  ]) {
    const i = (y * width + x) * 4;
    samples.push([data[i], data[i + 1], data[i + 2]]);
  }

  const avg = [0, 1, 2].map(c => samples.reduce((a, p) => a + p[c], 0) / samples.length);
  const spread = Math.max(...avg) - Math.min(...avg);

  // Alle Ecken nah beieinander?
  const uniform = samples.every(p =>
    Math.abs(p[0] - avg[0]) < 30 && Math.abs(p[1] - avg[1]) < 30 && Math.abs(p[2] - avg[2]) < 30);

  if (uniform && spread > 60) {
    return { r: Math.round(avg[0]), g: Math.round(avg[1]), b: Math.round(avg[2]), chroma: true };
  }
  return { r: 255, g: 255, b: 255, chroma: false };
}

function defringe(data, stripHalo = true, key = null) {
  if (key && key.chroma) {
    // Chroma-Key: Abstand zur Hintergrundfarbe. Zusaetzlich wird der Farbstich
    // aus den Randpixeln gerechnet, sonst bleibt ein bunter Saum stehen.
    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.sqrt(
        (key.r - data[i]) ** 2 + (key.g - data[i + 1]) ** 2 + (key.b - data[i + 2]) ** 2);
      if (dist < 60) data[i + 3] = 0;
      else if (dist < 110) {
        data[i + 3] = Math.floor(((dist - 60) / 50) * 255);
        // Saum entfaerben: Richtung Graustufe des Pixels ziehen
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const t = 1 - (dist - 60) / 50;
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

  // Weisser Saum. Der weiche Schlagschatten der Renders ist heller als der
  // Putz-Hintergrund im Spiel -- er liest sich dort nicht als Schatten, sondern
  // als Glühen unter dem Objekt. Solche Pixel sind fast weiss UND nur teilweise
  // deckend; deckende Flaechen (helle Items wie Toast oder Chawan) bleiben
  // unangetastet, weil ihr Alpha bereits 255 ist.
  //
  // Die Schwelle darf nicht ueber den Defringe-Rampenwert geloest werden: ein
  // globales Anheben wuerde die Brotflaeche des Toasts halbtransparent machen.
  // Flache Grafik-Layer haben keinen Schlagschatten, dafuer aber absichtlich
  // sehr helle Flaechen -- bei den Wolken loescht die Halo-Regel sonst das
  // ganze Layer.
  if (stripHalo) {
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0 || a >= 250) continue;
      if (Math.min(data[i], data[i + 1], data[i + 2]) > 225) data[i + 3] = 0;
    }
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

// Schrumpft die Box, solange eine Randreihe nicht dicht genug gedeckt ist. Der
// Wiesen-Render lief rechts und unten weich aus; die Box umfasste diese fast
// transparenten Reihen noch, wodurch das Band im Spiel eine Luecke zum
// Bildrand liess.
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

// Defringe -> exakter Alpha-Crop. Liefert eine sharp-Pipeline auf dem reinen
// Inhalt. Mit singleObject wird vorher auf die groesste zusammenhaengende
// Flaeche eingegrenzt, damit ein zweites Objekt im Render nichts verschiebt.
async function cropToContent(filePath, strategy = 'union', trimShadow = false, softEdge = 0) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const key = detectKeyColor(data, info.width, info.height);
  if (key.chroma) console.log(`    Chroma-Hintergrund erkannt: rgb(${key.r},${key.g},${key.b})`);
  defringe(data, true, key);

  const holes = fillInteriorHoles(data, info.width, info.height);
  if (holes > 0) console.log(`    ${holes} Innenpixel wiederhergestellt`);

  const region = strategy === 'none' ? null : findBlobRegion(data, info.width, info.height, strategy);
  const rawBox = findAlphaBox(data, info.width, info.height, 80, region);
  const raw = { width: info.width, height: info.height, channels: 4 };

  if (!rawBox) return { pipeline: sharp(data, { raw }), box: { left: 0, top: 0, width: info.width, height: info.height } };

  let box = trimShadow ? trimShadowEdges(data, info.width, rawBox) : rawBox;
  if (softEdge > 0) box = trimSoftEdges(data, info.width, box, softEdge);
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
  const cavityRects = {};
  const frameRects = {};
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
      // Einzelobjekt-Layer: freistellen und auf den Inhalt beschneiden, damit
      // sie im Spiel frei positioniert werden koennen.
      if (BGL_SPRITES.includes(baseName)) {
        // Schattenrand mit abschneiden: die Figuren stehen im Spiel auf der
        // Wiese, ein gebackener Papierschatten darunter liest sich dort als
        // heller Fleck. Die Koerper sind durchgehend warm getoent, das
        // Kanten-Trimming kann sie nicht anknabbern.
        const { pipeline, box } = await cropToContent(filePath, 'union', true);
        const targetH = 512;
        const targetW = Math.max(32, Math.round(box.width * (targetH / box.height)));
        await pipeline
          .resize(targetW, targetH, { fit: 'fill' })
          .png({ compressionLevel: 9 })
          .toFile(targetPath);
        console.log(`  ${baseName}: sprite ${box.width}x${box.height} -> ${targetW}x${targetH}`);
        continue;
      }

      // Band-Layer: auf den Inhalt beschnitten, volle Breite, unten buendig.
      if (BGL_BANDS.includes(baseName)) {
        const { pipeline, box } = await cropToContent(filePath, 'union', false, 0.9);
        const targetW = 720;
        const targetH = Math.max(16, Math.round(box.height * (targetW / box.width)));
        await pipeline
          .resize(targetW, targetH, { fit: 'fill' })
          .png({ compressionLevel: 9 })
          .toFile(targetPath);
        console.log(`  ${baseName}: band ${box.width}x${box.height} -> ${targetW}x${targetH}`);
        continue;
      }

      // Bildfuellende Ebene: nur freistellen, Position im Frame bleibt erhalten.
      const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const key = detectKeyColor(data, info.width, info.height);
      if (key.chroma) console.log(`    Chroma-Hintergrund erkannt: rgb(${key.r},${key.g},${key.b})`);
      defringe(data, false, key);

      // Rahmen mit geschlossener Rueckwand: Innenflaeche ausstanzen. Das Loch ist
      // danach die exakte lichte Nische -- praeziser als die Helligkeits-Heuristik
      // von measureCavityRatio, weil es direkt aus dem Alphakanal kommt.
      if (BGL_KNOCKOUT.includes(baseName)) {
        const hole = knockOutPanel(data, info.width, info.height);
        if (hole) {
          cavityRects[baseName] = {
            x: parseFloat(((hole.left + hole.width / 2) / info.width).toFixed(4)),
            y: parseFloat((hole.top / info.height).toFixed(4)),
            w: parseFloat((hole.width / info.width).toFixed(4)),
            h: parseFloat((hole.height / info.height).toFixed(4))
          };
          cavities[baseName] = cavityRects[baseName].w;
          console.log(`  ${baseName}: Nische ausgestanzt, ${hole.width}x${hole.height} (ratio ${cavities[baseName]})`);
        } else {
          console.warn(`  ${baseName}: Innenflaeche nicht erkannt -- Rueckwand bleibt geschlossen`);
        }
      }

      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize(720, null, { fit: 'inside' })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);

      // Aeussere Kontur des Gehaeuses. Das Spiel skaliert danach, damit das
      // Moebel vollstaendig zwischen Header und Booster-Reihe steht statt vom
      // Cover-Scaling oben und unten angeschnitten zu werden.
      if (BGL_KNOCKOUT.includes(baseName)) {
        const { data: od, info: oi } = await sharp(targetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const outer = findAlphaBox(od, oi.width, oi.height, 40);
        if (outer) {
          frameRects[baseName] = {
            x: parseFloat(((outer.left + outer.width / 2) / oi.width).toFixed(4)),
            y: parseFloat((outer.top / oi.height).toFixed(4)),
            w: parseFloat((outer.width / oi.width).toFixed(4)),
            h: parseFloat((outer.height / oi.height).toFixed(4))
          };
          console.log(`  ${baseName}: Kontur ${outer.width}x${outer.height}`);
        }
      }
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

  const rectLines = Object.keys(cavityRects).sort()
    .map(id => `  ${id}: { x: ${cavityRects[id].x}, y: ${cavityRects[id].y}, w: ${cavityRects[id].w}, h: ${cavityRects[id].h} }`)
    .join(',\n');

  const frameLines = Object.keys(frameRects).sort()
    .map(id => `  ${id}: { x: ${frameRects[id].x}, y: ${frameRects[id].y}, w: ${frameRects[id].w}, h: ${frameRects[id].h} }`)
    .join(',\n');

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

// Lichte Nische als Rechteck in Bildanteilen: x ist die Mitte, y die Oberkante.
export const BG_CAVITY_RECTS: Record<string, { x: number; y: number; w: number; h: number }> = {
${rectLines}
};

// Aeussere Kontur eines freistehenden Rahmens in Bildanteilen.
export const BG_FRAME_RECTS: Record<string, { x: number; y: number; w: number; h: number }> = {
${frameLines}
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
