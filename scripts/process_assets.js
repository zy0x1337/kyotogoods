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
  // Median ueber den ganzen Bildrand statt sechs Stichproben: einzelne Ecken
  // koennen vom Motiv oder von der Vignette verzogen sein.
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

// Sucht die Trennschwelle zwischen Hintergrund und Motiv im Histogramm der
// Farbabstaende. Ein fester Wert passt nicht: der Abstand des Motivs zum
// Chroma schwankt je Render stark -- bei der Katze beginnt es ab 100, bei den
// Buttons erst ab 150, beim Regalbrett ab 125. Gesucht wird das Tal zwischen
// dem Hintergrund-Peak bei 0 und der ersten dichten Motivregion.
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

  // Kein klares Tal: konservativer Standardwert
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

      // Despill: die Chroma-Flaeche strahlt auf helle Motive ab. Beim Katzen-
      // Render hat das cremefarbene Fell einen Magenta-Stich bekommen.
      // Korrigiert wird nur bei geringer Saettigung -- die azuki-rosé Pfeile der
      // Buttons haben ebenfalls b > g, sind aber kraeftig gesaettigt und
      // sollen ihre Farbe behalten.
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
        // Saum entfaerben, sonst bleibt ein magenta Rand am Objekt stehen
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
// Entfernt den Chroma-Spill entlang der Silhouette und glaettet die Alphakante.
//
// Zwei getrennte Probleme, beide sichtbar als "unsaubere Kante":
// 1. Die Chroma-Flaeche strahlt im Render auf das Motiv ab. Das Keying trennt
//    zwar sauber, aber der aeussere Saum des Objekts bleibt rosa -- am
//    Chasen-Sockel, unter dem Chashaku-Loeffel, am Rand des Koro.
// 2. Bei hartem Schwellwert entsteht stellenweise eine Treppe statt einer
//    weichen Kante.
//
// Der Despill laeuft nur in einem schmalen Band entlang der Kante und nimmt
// nach innen ab. Global angewandt wuerde er gewollt bunte Flaechen entfaerben --
// die azuki-roten Pfeile auf btn_shuffle liegen genau im selben Farbbereich.
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
    // Der Kanal, in dem der Chroma-Hintergrund am dunkelsten ist, ist der
    // Referenzwert -- bei Magenta das Gruen. Was in den beiden anderen Kanaelen
    // darueber liegt, ist Spill und wird abgezogen.
    const kc = [key.r, key.g, key.b];
    const lo = kc.indexOf(Math.min(...kc));
    const [h1, h2] = [0, 1, 2].filter(c => c !== lo);

    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (data[o + 3] < 8) continue;
      // Am Rand voll, in der Flaeche abgeschwaecht: die Chroma-Flaeche strahlt
      // auch ins Innere ab (unter dem Chashaku-Loeffel), aber dort steht der
      // Spill mit der Eigenfarbe des Motivs in Konkurrenz.
      const d = dist[i];
      const w = d > 0 && d <= radius ? 1 - (d - 1) / radius * 0.25 : 0.75;
      const excess = Math.min(data[o + h1], data[o + h2]) - data[o + lo];
      if (excess <= 0) continue;
      data[o + h1] = Math.round(data[o + h1] - w * excess);
      data[o + h2] = Math.round(data[o + h2] - w * excess);
    }
  }

  // Alphakante glaetten: 3x3-Mittel, aber nur dort, wo im Umfeld sowohl
  // deckende als auch transparente Pixel liegen. Flaechen bleiben unberuehrt.
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

// Schreibt eine fertig skalierte Pipeline und laeuft davor einmal ueber die
// Kante. Bewusst am Ende der Kette: bei voller Renderaufloesung waere das Band
// entlang der Silhouette 15x breiter als noetig und entsprechend langsam.
async function writeClean(pipeline, targetPath, key, radius = 5) {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cleanEdges(data, info.width, info.height, key, radius);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(targetPath);
  return { data, info };
}

async function cropToContent(filePath, strategy = 'union', trimShadow = false, softEdge = 0) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const key = detectKeyColor(data, info.width, info.height);
  if (key.chroma) console.log(`    Chroma rgb(${key.r},${key.g},${key.b}), Schwelle ${findKeyThreshold(data, key).cut.toFixed(0)}`);
  defringe(data, true, key);

  const holes = fillInteriorHoles(data, info.width, info.height);
  if (holes > 0) console.log(`    ${holes} Innenpixel wiederhergestellt`);

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

// Findet die Auflageflaeche eines Regalbretts: die Oberkante der dunklen
// Vorderkante. Gesucht wird der staerkste Helligkeitsabfall im unteren Drittel.
// Ergebnis: Anteil der Bildhoehe (0..1).
//
// Damit ist die Auflagelinie eine Eigenschaft des Assets statt einer Konstante
// im Code -- ein Brett mit anderer Kantenhoehe funktioniert ohne Nachjustieren.
function measurePlatformRatio(data, width, height) {
  const rowLum = y => {
    let sum = 0, n = 0;
    for (let x = Math.floor(width * 0.2); x < width * 0.8; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 200) { sum += (data[i] + data[i + 1] + data[i + 2]) / 3; n++; }
    }
    return n ? sum / n : null;
  };

  let bestDrop = 0, bestY = Math.floor(height * 0.88);
  let prev = rowLum(Math.floor(height * 0.55));

  for (let y = Math.floor(height * 0.55) + 1; y < height; y++) {
    const lum = rowLum(y);
    if (lum === null || prev === null) { prev = lum; continue; }
    const drop = prev - lum;
    if (drop > bestDrop) { bestDrop = drop; bestY = y; }
    prev = lum;
  }

  return parseFloat((bestY / height).toFixed(4));
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
  const shelfPlatforms = {};
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
        const { pipeline, box, key } = await cropToContent(filePath, 'union', true);
        const targetH = 512;
        const targetW = Math.max(32, Math.round(box.width * (targetH / box.height)));
        await writeClean(pipeline.resize(targetW, targetH, { fit: 'fill' }), targetPath, key);
        console.log(`  ${baseName}: sprite ${box.width}x${box.height} -> ${targetW}x${targetH}`);
        continue;
      }

      // Band-Layer: auf den Inhalt beschnitten, volle Breite, unten buendig.
      if (BGL_BANDS.includes(baseName)) {
        const { pipeline, box, key } = await cropToContent(filePath, 'union', false, 0.9);
        const targetW = 720;
        const targetH = Math.max(16, Math.round(box.height * (targetW / box.width)));
        await writeClean(pipeline.resize(targetW, targetH, { fit: 'fill' }), targetPath, key, 3);
        console.log(`  ${baseName}: band ${box.width}x${box.height} -> ${targetW}x${targetH}`);
        continue;
      }

      // Bildfuellende Ebene: nur freistellen, Position im Frame bleibt erhalten.
      const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const key = detectKeyColor(data, info.width, info.height);
      if (key.chroma) console.log(`    Chroma rgb(${key.r},${key.g},${key.b}), Schwelle ${findKeyThreshold(data, key).cut.toFixed(0)}`);
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
      // Nicht mehr auf ein festes Format ziehen: die Hoehe folgt der Breite im
      // Seitenverhaeltnis des Renders, sonst wird die Maserung gestaucht.
      const { pipeline, box, key } = await cropToContent(filePath, 'widest', true);
      const targetW = 608;
      const targetH = Math.max(32, Math.round(box.height * (targetW / box.width)));
      const { data: sd, info: si } = await writeClean(
        pipeline.resize(targetW, targetH, { fit: 'fill' }), targetPath, key, 3);
      shelfPlatforms[baseName] = measurePlatformRatio(sd, si.width, si.height);
      console.log(`  ${baseName}: ${targetW}x${targetH}, Auflage bei ${shelfPlatforms[baseName]}`);
      continue;
    }

    // FALL 3: UI-Karten. Randlos auf den sichtbaren Inhalt beschnitten, damit
    // NineSlice im Spiel exakt an der Kante der Karte ansetzt. Hoehe auf 128
    // normalisiert, Breite proportional (kein Verzerren des Rahmens).
    if (baseName.startsWith('ui_card_')) {
      const { pipeline, box, key } = await cropToContent(filePath, 'widest', true);
      const targetH = 128;
      const targetW = Math.max(64, Math.round(box.width * (targetH / box.height)));
      await writeClean(pipeline.resize(targetW, targetH, { fit: 'fill' }), targetPath, key, 3);
      console.log(`  ${baseName}: content ${box.width}x${box.height} -> ${targetW}x${targetH}`);
      continue;
    }

    // FALL 4: Match-FX (exakter Alpha-Crop, quadratischer Sprite)
    if (baseName.startsWith('fx_')) {
      const { pipeline, key } = await cropToContent(filePath);
      await writeClean(
        pipeline.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
        targetPath, key);
      continue;
    }

    // FALL 4b: Booster-Buttons & Icons (exakter Alpha-Crop, quadratisch zentriert)
    if (baseName.startsWith('btn_') || baseName.startsWith('ui_')) {
      const { pipeline, key } = await cropToContent(filePath);
      await writeClean(
        pipeline.resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }),
        targetPath, key);
      continue;
    }

    // FALL 5: Goods & UI-Icons (Freistellen, 256x256, Bottom-Offset berechnen)
    if (!ITEM_IDS.includes(baseName)) continue;

    // Defringing + exakter Alpha-Crop + Resize auf 256x256. Die finale Textur ist
    // die einzige verlaessliche Quelle fuer die sichtbare Unterkante im Spiel.
    const { pipeline, key } = await cropToContent(filePath);
    const processed = pipeline
      .resize(TARGET_SIZE, TARGET_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const { data: processedData, info: processedInfo } = await writeClean(processed, targetPath, key);
    const bounds = findAlphaBounds(processedData, processedInfo.width, processedInfo.height);
    const offsetDesign = bounds.bottom >= 0
      ? parseFloat(((bounds.bottom + 1 - processedInfo.height / 2) * (ITEM_DISPLAY_SIZE / processedInfo.height)).toFixed(2))
      : DEFAULT_OFFSET;

    offsets[baseName] = offsetDesign;
    console.log(`  ${baseName}: finalBottom=${bounds.bottom}px → ${offsetDesign}px design`);
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

  const platformLines = Object.keys(shelfPlatforms).sort()
    .map(id => `  ${id}: ${shelfPlatforms[id]}`)
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

// Auflageflaeche eines Regalbretts als Anteil seiner Bildhoehe.
export const SHELF_PLATFORM_RATIOS: Record<string, number> = {
${platformLines}
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
