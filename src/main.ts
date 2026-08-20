import '@fontsource/m-plus-rounded-1c/latin-500.css';
import '@fontsource/m-plus-rounded-1c/latin-800.css';
import Phaser from 'phaser';
import { ITEM_BOTTOM_OFFSETS, ITEM_COVERAGE_RATIOS, BG_CAVITY_RATIOS, BG_CAVITY_RECTS, BG_FRAME_RECTS, SHELF_PLATFORM_RATIOS, AVAILABLE_ASSETS, ASSET_EXT } from './item_offsets.generated';

// ==========================================
// 1. CMF DESIGN SYSTEM & ITEM REGISTRY
// ==========================================
export const KYOTO = {
  bg: 0xF3EFEA,
  hinoki: 0xD5C3A5,
  kuroSteel: 0x1E2022,
  slotIndent: 0xBFA888,
  matcha: 0x4A6B47,
  azuki: 0x6E373B,
  dangoPink: 0xE8B4B8,
  brass: 0xC49A5A,
  toastGold: 0xC68B59,
  cream: 0xFDFBF7,
  sageGreen: 0x8FA89B
};

// M PLUS Rounded 1c: stark gerundete japanische Schrift mit deutlich mehr
// Spiel als eine neutrale Gothic -- passt zum Art-Toy-CMF der Goods. Wird lokal
// gebundelt (offline-tauglich fuer Capacitor).
const FONT_FAMILY = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", sans-serif';

// Kleine Grossbuchstaben-Labels ueber den Werten
function labelStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: '500' };
}

// Werte und Ueberschriften
function valueStyle(size: number, color: string): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT_FAMILY, fontSize: `${size}px`, color, fontStyle: '800' };
}

const DESIGN_WIDTH = 420;
const DESIGN_HEIGHT = 760;

// Geraete-Pixelverhaeltnis. Phaser rendert im Scale-Modus RESIZE in
// CSS-Pixeln: die Canvas bekommt exakt so viele Pixel, wie sie CSS-Pixel breit
// ist, und das Geraet blaest sie danach auf seine physischen Pixel auf -- auf
// einem 3x-Display wird jedes gerenderte Pixel zu einem 3x3-Block. Genau das
// war die Unschaerfe im Web-Deploy. Deshalb laeuft das Spiel im Modus NONE:
// die Canvas bekommt die volle Geraeteaufloesung, zoom = 1/DPR zieht sie per
// CSS wieder auf die richtige Anzeigegroesse.
//
// Die Weltkoordinaten sind damit Geraetepixel -- alles Sichtbare haengt an
// getLayoutScale(), das den Faktor mitfuehrt. Absolute Pixelwerte ohne diesen
// Faktor waeren auf einem 3x-Display ein Drittel zu klein.
//
// Deckel: mehr als 3x kostet Fuellrate ohne sichtbaren Gewinn. Ruckelt es auf
// schwachen Geraeten, ist MAX_DPR der Hebel (2 halbiert die Pixelmenge fast).
const MAX_DPR = 3;
export const DPR = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_DPR);
// Kantenlaenge eines Goods auf dem Regal. Die Bottom-Offsets aus der Pipeline
// sind in ITEM_OFFSET_BASE gerechnet (ITEM_DISPLAY_SIZE dort) -- wird die
// Anzeigegroesse geaendert, muss der Offset denselben Faktor bekommen.
const ITEM_OFFSET_BASE = 72;
const ITEM_SIZE = 58;
const ITEM_OFFSET_SCALE = ITEM_SIZE / ITEM_OFFSET_BASE;
const SHELF_PLATFORM_TOP_Y = 38;
const DEFAULT_ITEM_BOTTOM_OFFSET = 36;
const BG_CAVITY_RATIO = 0.6458;

// Anteil der lichten Nischenweite, den ein Regalbrett einnimmt.
//
// Am Asset gemessen: das ausgestanzte Loch endet an der inneren Schattenkante
// des Putzpanels, das sichtbare Holz beginnt 6 von 402 px weiter aussen -- also
// Faktor 1.015. Damit stossen die Messingstifte an den Brettenden genau an den
// Rahmen, statt darunter zu verschwinden. Dafuer sind die Stifte ja da.
const SHELF_CAVITY_FILL = 1.015;

// Hintergrund-Tiers: pro Level-Gruppe eine breiter werdende Nische. Das
// cavityRatio wird von scripts/process_assets.js am fertigen PNG gemessen.
const BG_TIERS: { key: string; levelRange: [number, number] }[] = [
  { key: 'bg_kissa_niche',      levelRange: [1, 3] },
  { key: 'bg_kissa_niche_mid',  levelRange: [4, 5] },
  { key: 'bg_kissa_niche_wide', levelRange: [6, 6] },
];

// Parallax-Layer des Hintergrunds. Jeder Layer ist ein eigenes freigestelltes
// PNG (Prefix bgl_) und wird nur gezeichnet, wenn er im Asset-Manifest steht.
//
// mode 'cover':  bildfuellende Ebene. Wurde im 9:16-Frame an ihrer endgueltigen
//   Position gerendert und wird wie der Hintergrund cover-skaliert -- die Layer
//   liegen dadurch deckungsgleich uebereinander.
// mode 'band':   auf den Inhalt beschnittenes Band, volle Breite, unten buendig.
// mode 'sprite': freigestelltes Einzelobjekt, ueber xRatio/yRatio platziert.
type BgMotion = 'none' | 'sway' | 'drift' | 'bob';
type BgLayerMode = 'cover' | 'band' | 'sprite';

interface BgLayer {
  key: string;
  mode: BgLayerMode;
  depth: number;
  motion: BgMotion;
  amount?: number;
  period?: number;
  /** sprite: Mittelpunkt in Anteilen der Canvas-Groesse, y ist die Standlinie */
  xRatio?: number;
  yRatio?: number;
  /** sprite: Breite als Anteil der Canvas-Breite */
  widthRatio?: number;
  /** sprite: horizontal spiegeln, damit die Figur zur Szene blickt */
  flipX?: boolean;
}

// Freistehendes Regalgehaeuse, das ueber der Gartenszene liegt. Solange es
// fehlt, bleibt der undurchsichtige Wand-Hintergrund bg_kissa_niche aktiv --
// der wuerde die Parallax-Layer sonst komplett verdecken.
const NICHE_FRAME_KEY = 'bgl_niche_frame';

const BG_LAYERS: BgLayer[] = [
  { key: 'bgl_sky',      mode: 'cover',  depth: -60, motion: 'none' },
  { key: 'bgl_clouds',   mode: 'cover',  depth: -58, motion: 'drift', amount: 0.06, period: 38000 },
  { key: 'bgl_hills',    mode: 'cover',  depth: -56, motion: 'none' },
  { key: 'bgl_meadow',   mode: 'band',   depth: -54, motion: 'none' },
  // Das Gehaeuse belegt rund x 0.17..0.85 -- die Tiere stehen in den schmalen
  // Wiesenstreifen links und rechts davon, sonst verschwinden sie dahinter.
  { key: 'bgl_cat',      mode: 'sprite', depth: -52, motion: 'bob', amount: 4, period: 2600,
    xRatio: 0.085, yRatio: 0.965, widthRatio: 0.14, flipX: true },
  { key: 'bgl_dog',      mode: 'sprite', depth: -52, motion: 'bob', amount: 5, period: 3100,
    xRatio: 0.87, yRatio: 0.965, widthRatio: 0.17 },
  // Laternen haengen an Schnueren, die an der Oberkante beginnen -- das Schwingen
  // dreht die Ebene deshalb um ihren oberen Rand, nicht um die Bildmitte.
  { key: 'bgl_lanterns', mode: 'cover',  depth: -50, motion: 'sway', amount: 1.2, period: 5200 },
];

function getCavityRatio(key: string): number {
  return BG_CAVITY_RATIOS[key] ?? BG_CAVITY_RATIO;
}

function getBgTier(level: number) {
  return BG_TIERS.find(t => level >= t.levelRange[0] && level <= t.levelRange[1]) ?? BG_TIERS[0];
}

// width kommt in Geraetepixeln herein, der Deckel gilt aber in CSS-Pixeln --
// sonst waere er auf einem 3x-Display schon bei einem Drittel der Breite erreicht.
function getLayoutScale(width: number): number {
  return Math.min(width / (DESIGN_WIDTH * DPR), 1.15) * DPR;
}

// Groessennormalisierung: gleiche sichtbare Masse statt gleicher Bounding Box.
//
// Die Pipeline zieht jedes Item auf dieselbe Kantenlaenge. Wie viel davon
// tatsaechlich Motiv ist, schwankt aber stark -- die Tetsubin deckt 40 % ab
// (der Buegelbogen ist Luft), der Chawan 62 %. Auf gleiche Box gezogen wirkt
// der Chawan dadurch deutlich groesser als die Kanne.
//
// Der Faktor gleicht die Flaeche an, nicht die Kante: bei doppelter Deckung
// braucht es die Wurzel aus zwei weniger Kantenlaenge. Bezugswert ist der
// Median des Katalogs, das Ergebnis ist also unabhaengig davon, wie gross die
// Renders insgesamt ausfallen.
const ITEM_SIZE_MIN = 0.8;
const ITEM_SIZE_MAX = 1.25;

// Manuelle Ausnahmen fuer Gegenstaende, die in echt aus der Reihe fallen.
const ITEM_SIZE_OVERRIDES: Record<string, number> = {};

const COVERAGE_MEDIAN = (() => {
  const values = Object.values(ITEM_COVERAGE_RATIOS).filter(v => v > 0).sort((a, b) => a - b);
  return values.length ? values[values.length >> 1] : 0;
})();

function getItemSizeFactor(itemId: string): number {
  const override = ITEM_SIZE_OVERRIDES[itemId];
  if (override !== undefined) return override;

  const coverage = ITEM_COVERAGE_RATIOS[itemId];
  if (!coverage || !COVERAGE_MEDIAN) return 1;

  return Phaser.Math.Clamp(Math.sqrt(COVERAGE_MEDIAN / coverage), ITEM_SIZE_MIN, ITEM_SIZE_MAX);
}

// Ruhelage eines Goods auf dem Brett. platformY ist die Auflageflaeche in
// Container-Koordinaten des Regals, gemessen am Asset statt fest verdrahtet.
function getItemRestY(itemId: string, itemScale: number, platformY: number): number {
  const bottomOffset = ITEM_BOTTOM_OFFSETS[itemId] ?? DEFAULT_ITEM_BOTTOM_OFFSET;
  // Der Offset gilt fuer die volle Anzeigegroesse und muss mitschrumpfen,
  // sonst schwebt ein verkleinertes Item ueber dem Brett.
  return platformY - bottomOffset * ITEM_OFFSET_SCALE * getItemSizeFactor(itemId) * itemScale;
}

export interface ItemDef {
  id: string;
  name: string;
  baseColor: number;
  accentColor: number;
  detailColor: number;
  shape: 'bowl' | 'kettle' | 'whisk' | 'cube' | 'prism' | 'sphere' | 'cylinder' | 'cone' | 'bell' | 'plate';
}

export const ITEMS: Record<string, ItemDef> = {
  // Batch 1 & 2: Core Heroes
  'chawan_cup':        { id: 'chawan_cup',        name: 'Chawan Cup',       baseColor: 0xEAE5D9, accentColor: KYOTO.matcha,    detailColor: 0xBAA788, shape: 'bowl' },
  'tetsubin_kettle':   { id: 'tetsubin_kettle',   name: 'Tetsubin Kettle',  baseColor: KYOTO.kuroSteel, accentColor: KYOTO.brass,detailColor: 0x3A3D40, shape: 'kettle' },
  'chasen_whisk':      { id: 'chasen_whisk',      name: 'Bamboo Whisk',     baseColor: KYOTO.hinoki, accentColor: 0x8C7A5E,    detailColor: KYOTO.matcha, shape: 'whisk' },
  'kissa_toast':       { id: 'kissa_toast',       name: 'Cube Toast',       baseColor: KYOTO.toastGold, accentColor: 0xF4D06F, detailColor: 0x8F572C, shape: 'cube' },
  'dango_stick':       { id: 'dango_stick',       name: 'Dango Skewer',     baseColor: KYOTO.dangoPink, accentColor: KYOTO.cream, detailColor: KYOTO.matcha, shape: 'sphere' },
  'yokan_prism':       { id: 'yokan_prism',       name: 'Yokan Prism',      baseColor: KYOTO.azuki,  accentColor: 0x481E21,    detailColor: KYOTO.brass,  shape: 'prism' },
  'copper_caddy':      { id: 'copper_caddy',      name: 'Copper Caddy',     baseColor: 0xB86D43,     accentColor: KYOTO.brass, detailColor: 0x7E3F1F, shape: 'cylinder' },
  'origami_dripper':   { id: 'origami_dripper',   name: 'Origami Dripper',  baseColor: KYOTO.matcha, accentColor: KYOTO.hinoki, detailColor: 0x364E34, shape: 'cone' },

  // Batch 3 & 4: Expansion
  'matcha_roll':       { id: 'matcha_roll',       name: 'Matcha Roll',      baseColor: KYOTO.matcha, accentColor: KYOTO.cream,  detailColor: 0x2D452B, shape: 'cylinder' },
  'shou_sugi_block':   { id: 'shou_sugi_block',   name: 'Yakisugi Block',   baseColor: KYOTO.kuroSteel, accentColor: KYOTO.brass,detailColor: 0x111214, shape: 'cube' },
  'coldbrew_flask':    { id: 'coldbrew_flask',    name: 'Cold Brew Flask',  baseColor: 0xDEE4E0,     accentColor: KYOTO.matcha, detailColor: 0xFFFFFF, shape: 'cylinder' },
  'brass_sphere':      { id: 'brass_sphere',      name: 'Brass Infuser',    baseColor: KYOTO.brass,  accentColor: 0x8C6B32,    detailColor: 0xEAD29C, shape: 'sphere' },

  // Batch 5: Mastery Items
  'matcha_montblanc':  { id: 'matcha_montblanc',  name: 'Mont Blanc',       baseColor: KYOTO.matcha, accentColor: KYOTO.toastGold, detailColor: KYOTO.brass, shape: 'cone' },
  'chashaku_scoop':    { id: 'chashaku_scoop',    name: 'Tea Scoop',        baseColor: KYOTO.hinoki, accentColor: 0xEAE5D9,    detailColor: KYOTO.matcha, shape: 'cylinder' },
  'incense_burner':    { id: 'incense_burner',    name: 'Incense Cone',     baseColor: KYOTO.brass,  accentColor: KYOTO.kuroSteel, detailColor: 0x111214, shape: 'cone' },
  'mizuhiki_knot':     { id: 'mizuhiki_knot',     name: 'Mizuhiki Knot',    baseColor: KYOTO.azuki,  accentColor: KYOTO.cream,  detailColor: KYOTO.brass,  shape: 'sphere' },
  'gotoku_trivet':     { id: 'gotoku_trivet',     name: 'Gotoku Trivet',    baseColor: KYOTO.kuroSteel, accentColor: 0x3A3D40, detailColor: KYOTO.kuroSteel, shape: 'kettle' },
  'kuro_mame_dome':    { id: 'kuro_mame_dome',    name: 'Kuromame Dome',    baseColor: 0x2A1820,     accentColor: KYOTO.hinoki, detailColor: 0x111214, shape: 'bowl' },
  'dango_plate':       { id: 'dango_plate',       name: 'Stoneware Plate',  baseColor: KYOTO.sageGreen, accentColor: KYOTO.toastGold, detailColor: 0x6E8579, shape: 'plate' },
  'cast_iron_bell':    { id: 'cast_iron_bell',    name: 'Furin Bell',       baseColor: KYOTO.kuroSteel, accentColor: KYOTO.dangoPink, detailColor: 0x3A3D40, shape: 'bell' }
};

type SlotData = { front: string | null; queue: string[] };

interface LevelDefinition {
  moves: number;
  targetMatches: number;
  layout: SlotData[][];
}

// Jede Stufe enthält exakt drei Exemplare pro Itemtyp. Die freien Slots
// öffnen zuerst den Kern-Loop und die Queues erhöhen danach die Planungstiefe.
//
// Progressionskurve (targetMatches = Anzahl unterschiedlicher Itemtypen je Level):
// L1: 4  L2: 5  L3: 6  L4: 7  L5: 8  L6: 10 — monoton steigend, keine Spitzen mehr.
// moves/targetMatches sinkt von 2.25 (Tutorial) auf 1.8 (Finale) -- der Move-Puffer
// wird bewusst enger, je geuebter die Spielmechanik beim Spieler sitzt.
// Itemkatalog wird in drei Wellen eingefuehrt: Batch 1&2 (Kernhelden) in L1-L2,
// Batch 3&4 (Expansion) in L3, Batch 5 (Mastery) in L4-L6. Alle 20 Items aus
// ITEMS kommen so mindestens einmal vor -- 'dango_stick' fehlte zuvor komplett.
const LEVELS: LevelDefinition[] = [
  // Level 1 – 4 Regale, 4 Matches, Tutorial (unveraendert, bereits gut getunt)
  {
    moves: 8,
    targetMatches: 4,
    layout: [
      [
        { front: 'chawan_cup', queue: [] },
        { front: 'chawan_cup', queue: [] },
        { front: null, queue: ['chasen_whisk'] }
      ],
      [
        { front: 'chawan_cup', queue: ['tetsubin_kettle'] },
        { front: 'tetsubin_kettle', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'tetsubin_kettle', queue: [] },
        { front: 'chasen_whisk', queue: [] },
        { front: null, queue: ['kissa_toast'] }
      ],
      [
        { front: 'chasen_whisk', queue: [] },
        { front: 'kissa_toast', queue: [] },
        { front: 'kissa_toast', queue: [] }
      ]
    ]
  },
  // Level 2 – 5 Regale, 5 Matches. Rest von Batch 1&2: dango_stick, yokan_prism,
  // copper_caddy, origami_dripper, matcha_roll als erster Ausblick auf Batch 3&4.
  {
    moves: 11,
    targetMatches: 5,
    layout: [
      [
        { front: 'dango_stick', queue: [] },
        { front: 'dango_stick', queue: [] },
        { front: null, queue: ['yokan_prism'] }
      ],
      [
        { front: 'dango_stick', queue: ['copper_caddy'] },
        { front: 'yokan_prism', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'yokan_prism', queue: [] },
        { front: 'copper_caddy', queue: [] },
        { front: null, queue: ['origami_dripper'] }
      ],
      [
        { front: 'copper_caddy', queue: ['matcha_roll'] },
        { front: 'origami_dripper', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'origami_dripper', queue: [] },
        { front: 'matcha_roll', queue: [] },
        { front: 'matcha_roll', queue: [] }
      ]
    ]
  },
  // Level 3 – 5 Regale, 6 Matches. Rest von Batch 3&4 (shou_sugi_block,
  // coldbrew_flask, brass_sphere) + Rueckkehr der drei Tutorial-Items mit
  // erster echter Regal-Zweitnutzung (ein Regal wird nach dem ersten Match
  // ueber die Queue fuer ein zweites Item weiterverwendet).
  {
    moves: 13,
    targetMatches: 6,
    layout: [
      [
        { front: 'chawan_cup', queue: [] },
        { front: 'chawan_cup', queue: [] },
        { front: null, queue: ['chasen_whisk'] }
      ],
      [
        { front: 'chawan_cup', queue: ['tetsubin_kettle'] },
        { front: 'tetsubin_kettle', queue: [] },
        { front: 'brass_sphere', queue: [] }
      ],
      [
        { front: 'tetsubin_kettle', queue: [] },
        { front: 'chasen_whisk', queue: [] },
        { front: null, queue: ['shou_sugi_block', 'brass_sphere'] }
      ],
      [
        { front: 'chasen_whisk', queue: [] },
        { front: 'shou_sugi_block', queue: [] },
        { front: null, queue: ['coldbrew_flask'] }
      ],
      [
        { front: 'shou_sugi_block', queue: ['brass_sphere'] },
        { front: 'coldbrew_flask', queue: [] },
        { front: 'coldbrew_flask', queue: [] }
      ]
    ]
  },
  // Level 4 – 5 Regale, 7 Matches. Erste Mastery-Welle (matcha_montblanc,
  // chashaku_scoop, incense_burner, mizuhiki_knot) gemischt mit drei
  // wiederkehrenden Favoriten (kissa_toast, yokan_prism, origami_dripper).
  {
    moves: 15,
    targetMatches: 7,
    layout: [
      [
        { front: 'matcha_montblanc', queue: [] },
        { front: 'matcha_montblanc', queue: [] },
        { front: null, queue: ['chashaku_scoop', 'origami_dripper'] }
      ],
      [
        { front: 'matcha_montblanc', queue: ['incense_burner'] },
        { front: 'chashaku_scoop', queue: [] },
        { front: 'kissa_toast', queue: ['origami_dripper'] }
      ],
      [
        { front: 'chashaku_scoop', queue: [] },
        { front: 'incense_burner', queue: [] },
        { front: null, queue: ['mizuhiki_knot', 'kissa_toast', 'yokan_prism'] }
      ],
      [
        { front: 'incense_burner', queue: [] },
        { front: 'mizuhiki_knot', queue: [] },
        { front: null, queue: ['yokan_prism'] }
      ],
      [
        { front: 'mizuhiki_knot', queue: ['yokan_prism'] },
        { front: 'kissa_toast', queue: [] },
        { front: 'origami_dripper', queue: [] }
      ]
    ]
  },
  // Level 5 – 6 Regale, 8 Matches. Zweite Mastery-Welle (gotoku_trivet,
  // kuro_mame_dome, dango_plate, cast_iron_bell) + vier Favoriten aus
  // Batch 1-4 (dango_stick, copper_caddy, matcha_roll, shou_sugi_block).
  {
    moves: 16,
    targetMatches: 8,
    layout: [
      [
        { front: 'gotoku_trivet', queue: [] },
        { front: 'gotoku_trivet', queue: [] },
        { front: null, queue: ['kuro_mame_dome'] }
      ],
      [
        { front: 'gotoku_trivet', queue: ['dango_plate'] },
        { front: 'kuro_mame_dome', queue: [] },
        { front: 'dango_stick', queue: [] }
      ],
      [
        { front: 'kuro_mame_dome', queue: [] },
        { front: 'dango_plate', queue: [] },
        { front: null, queue: ['cast_iron_bell', 'dango_stick'] }
      ],
      [
        { front: 'dango_plate', queue: [] },
        { front: 'cast_iron_bell', queue: [] },
        { front: null, queue: ['copper_caddy', 'copper_caddy'] }
      ],
      [
        { front: 'cast_iron_bell', queue: ['copper_caddy', 'matcha_roll'] },
        { front: 'matcha_roll', queue: [] },
        { front: 'matcha_roll', queue: [] }
      ],
      [
        { front: 'dango_stick', queue: ['shou_sugi_block'] },
        { front: 'shou_sugi_block', queue: [] },
        { front: 'shou_sugi_block', queue: [] }
      ]
    ]
  },
  // Level 6 – 6 Regale, 10 Matches. Finale: die komplette Mastery-Reihe
  // (matcha_montblanc, chashaku_scoop, incense_burner, mizuhiki_knot,
  // gotoku_trivet, kuro_mame_dome, dango_plate, cast_iron_bell) plus die
  // beiden letzten offenen Items coldbrew_flask und brass_sphere -- damit
  // waren im Verlauf des Spiels alle 20 Items mindestens einmal im Einsatz.
  // Regal 6 startet mit dem einzigen leeren Slot des Levels: der erste Zug
  // (mizuhiki_knot aus Regal 5 dorthin) loest sofort eine Kettenreaktion aus.
  {
    moves: 18,
    targetMatches: 10,
    layout: [
      [
        { front: 'coldbrew_flask', queue: [] },
        { front: 'coldbrew_flask', queue: [] },
        { front: 'brass_sphere', queue: ['gotoku_trivet', 'kuro_mame_dome'] }
      ],
      [
        { front: 'brass_sphere', queue: [] },
        { front: 'brass_sphere', queue: [] },
        { front: 'matcha_montblanc', queue: ['gotoku_trivet', 'dango_plate'] }
      ],
      [
        { front: 'matcha_montblanc', queue: [] },
        { front: 'matcha_montblanc', queue: [] },
        { front: 'chashaku_scoop', queue: ['kuro_mame_dome', 'cast_iron_bell'] }
      ],
      [
        { front: 'chashaku_scoop', queue: [] },
        { front: 'chashaku_scoop', queue: [] },
        { front: 'incense_burner', queue: ['dango_plate', 'cast_iron_bell'] }
      ],
      [
        { front: 'incense_burner', queue: [] },
        { front: 'incense_burner', queue: [] },
        { front: 'mizuhiki_knot', queue: ['gotoku_trivet', 'dango_plate'] }
      ],
      [
        { front: 'mizuhiki_knot', queue: [] },
        { front: 'mizuhiki_knot', queue: [] },
        { front: null, queue: ['coldbrew_flask', 'kuro_mame_dome', 'cast_iron_bell'] }
      ]
    ]
  }
];

// ==========================================
// 2. PROCEDURAL AUDIO & MOBILE HAPTICS
// ==========================================
class ZenAudioEngine {
  private ctx: AudioContext | null = null;

  public initOnGesture() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public vibrate(pattern: number | number[] = 12) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* Browser-Restriktionen ignorieren */
      }
    }
  }

  public playTap() {
    this.initOnGesture();
    this.vibrate(8);
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(820, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.035);

    f.type = 'bandpass';
    f.frequency.value = 1200;
    f.Q.value = 3.0;

    g.gain.setValueAtTime(0.28, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

    osc.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  public playDrop() {
    this.initOnGesture();
    this.vibrate(14);
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.05);

    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(g);
    g.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playMatch(combo = 1) {
    this.initOnGesture();
    this.vibrate([20, 40, 20]);
    if (!this.ctx || this.ctx.state === 'suspended') return;

    const scale = [293.66, 311.13, 392.00, 440.00, 523.25];
    const root = Math.min(combo - 1, scale.length - 2);

    [scale[root], scale[root + 1]].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, this.ctx.currentTime + i * 0.03);

      g.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.03);
      g.gain.linearRampToValueAtTime(0.22, this.ctx.currentTime + i * 0.03 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + i * 0.03 + 0.85);

      osc.connect(g);
      g.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + i * 0.03);
      osc.stop(this.ctx.currentTime + i * 0.03 + 0.9);
    });
  }

  public playWin() {
    this.initOnGesture();
    this.vibrate([40, 60, 40, 60, 100]);
    if (!this.ctx || this.ctx.state === 'suspended') return;

    [440, 880, 1320].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      g.gain.setValueAtTime(0.25 / (idx + 1), this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

      osc.connect(g);
      g.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.85);
    });
  }
}
export const ZenAudio = new ZenAudioEngine();

// ==========================================
// 3. GAME STATE & EVENT BUS
// ==========================================
export const GameEvents = {
  MOVE_EXECUTED: 'MOVE_EXECUTED',
  SCORE_UPDATED: 'SCORE_UPDATED',
  TRIPLE_MATCHED: 'TRIPLE_MATCHED',
  UNDO_TRIGGERED: 'UNDO_TRIGGERED',
  SHUFFLE_TRIGGERED: 'SHUFFLE_TRIGGERED',
  HAMMER_ACTIVE: 'HAMMER_ACTIVE'
};

export interface MoveRecord {
  fromShelf: number;
  fromSlot: number;
  toShelf: number;
  toSlot: number;
  itemId: string;
}

export const State = {
  currentLevel: 1,
  score: 0,
  moves: 22,
  initialMoves: 22,
  matchesMade: 0,
  targetMatches: 4,
  combo: 1,
  comboTimer: 0,
  activeBooster: null as 'hammer' | null,
  history: [] as MoveRecord[],
  reset(moves = 22, target = 4) {
    this.score = 0;
    this.moves = moves;
    this.initialMoves = moves;
    this.matchesMade = 0;
    this.targetMatches = target;
    this.combo = 1;
    this.comboTimer = 0;
    this.activeBooster = null;
    this.history = [];
  }
};

// ==========================================
// 4. ENTITIES: GOODS ITEM & SHELF
// ==========================================
export class GoodsItem extends Phaser.GameObjects.Container {
  public itemId: string;
  public itemDef: ItemDef;
  public readonly itemScale: number;
  public readonly restY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string, itemScale = 1, restY = y) {
    super(scene, x, y);
    this.itemId = itemId;
    this.itemDef = ITEMS[itemId] || ITEMS['chawan_cup'];
    this.itemScale = itemScale;
    this.restY = restY;
    this.setSize(76 * itemScale, 76 * itemScale);
    this.renderArt();
    scene.add.existing(this);
  }

  private renderArt() {
    const s = this.itemScale;

    if (this.scene.textures.exists(`item_${this.itemId}`)) {
      const size = ITEM_SIZE * s * getItemSizeFactor(this.itemId);
      const img = this.scene.add.image(0, 0, `item_${this.itemId}`).setDisplaySize(size, size);
      this.add(img);
      return;
    }

    // Procedural CMF Vector Fallback
    const g = this.scene.add.graphics();
    const d = this.itemDef;

    g.fillStyle(d.baseColor, 1.0).fillRoundedRect(-32, -32, 64, 64, 14);
    g.fillStyle(d.accentColor, 1.0);

    if (d.shape === 'bowl') {
      g.fillCircle(0, 0, 18);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 12);
    } else if (d.shape === 'kettle') {
      g.fillRect(-18, -10, 36, 22);
      g.lineStyle(3, d.detailColor, 1);
      g.strokeCircle(0, -12, 10);
    } else if (d.shape === 'cube') {
      g.fillRect(-14, -14, 28, 28);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-4, -4, 8, 8);
    } else if (d.shape === 'whisk') {
      g.fillTriangle(0, -18, -14, 16, 14, 16);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-4, -6, 8, 10);
    } else if (d.shape === 'sphere') {
      g.fillCircle(-10, 0, 8);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 8);
      g.fillStyle(d.baseColor, 1);
      g.fillCircle(10, 0, 8);
    } else if (d.shape === 'prism') {
      g.fillTriangle(-18, 14, 0, -18, 18, 14);
    } else if (d.shape === 'cone') {
      g.fillTriangle(-16, 16, 0, -16, 16, 16);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 16, 5);
    } else if (d.shape === 'plate') {
      g.fillRoundedRect(-22, -10, 44, 20, 4);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-4, -4, 8, 8);
    } else if (d.shape === 'bell') {
      // Glocke steht auf einem Ring, haengt nicht -- die Goods stehen im Regal.
      g.fillCircle(0, -2, 14);
      g.fillRect(-14, -2, 28, 12);
      g.fillStyle(d.detailColor, 1);
      g.fillRoundedRect(-16, 10, 32, 8, 4);
    } else {
      g.fillRoundedRect(-14, -18, 28, 36, 8);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 6);
    }

    g.lineStyle(1.5, 0xFFFFFF, 0.35).strokeRoundedRect(-32, -32, 64, 64, 14);
    g.setScale(this.itemScale);
    this.add(g);
  }

  public setSelected(selected: boolean) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: selected ? this.restY - 14 * this.itemScale : this.restY,
      scale: selected ? 1.15 : 1.0,
      duration: 150,
      ease: selected ? 'Back.easeOut' : 'Quad.easeOut'
    });
  }
}

export class Shelf extends Phaser.GameObjects.Container {
  public shelfIdx: number;
  public slots: (GoodsItem | null)[] = [null, null, null];
  public queues: string[][] = [[], [], []];
  public readonly spacing: number;
  public readonly shelfWidth: number;
  public readonly shelfHeight: number;
  public readonly itemScale: number;
  /** Auflageflaeche des Bretts in Container-Koordinaten */
  public readonly platformY: number;
  /** Trefferflaeche in Container-Koordinaten. Deckt Brett UND die darauf
   *  stehenden Goods ab -- das Brett allein ist nur rund 30px hoch, die Items
   *  ragen weit darueber hinaus und waeren sonst nicht anklickbar. */
  public readonly hitTop: number;
  public readonly hitBottom: number;

  constructor(scene: Phaser.Scene, x: number, y: number, shelfIdx: number, data: { front: string | null; queue: string[] }[], itemScale = 1, shelfWidth = 304) {
    super(scene, x, y);
    this.shelfIdx = shelfIdx;
    this.itemScale = itemScale;
    // Drei Slots gleichmaessig ueber das Brett verteilt: Raender links und
    // rechts sind damit immer gleich gross.
    this.spacing = Phaser.Math.Clamp(shelfWidth / 3, 78 * itemScale, 104 * itemScale);
    this.shelfWidth = shelfWidth;

    // Hoehe folgt dem Seitenverhaeltnis der Textur. Vorher war sie fest, das
    // Brett wurde dadurch gestaucht und die Maserung verzerrt.
    const tex = scene.textures.exists('shelf_wood') ? scene.textures.get('shelf_wood').getSourceImage() : null;
    this.shelfHeight = tex ? shelfWidth * (tex.height / tex.width) : 92 * itemScale;

    // Auflagelinie: am Asset vermessen, sonst der alte Design-Wert
    const platformRatio = SHELF_PLATFORM_RATIOS['shelf_wood'];
    this.platformY = platformRatio !== undefined
      ? -this.shelfHeight / 2 + platformRatio * this.shelfHeight
      : SHELF_PLATFORM_TOP_Y * itemScale;

    this.hitTop = this.platformY - 82 * itemScale;
    this.hitBottom = this.shelfHeight / 2 + 6 * itemScale;

    this.drawStructure();
    this.initSlots(data);
    scene.add.existing(this);
  }

  private drawStructure() {
    const w = this.shelfWidth;
    const h = this.shelfHeight;
    const s = this.itemScale;

    // Weicher Schlagschatten unter der Vorderkante. Vorher lag hier ein nach
    // rechts unten versetztes Rechteck in Brettgroesse -- bei einem flachen
    // Brett sah das aus wie ein zweites, verrutschtes Brett.
    const shadow = this.scene.add.graphics();
    const shW = w * 0.97;
    for (let i = 5; i > 0; i--) {
      shadow.fillStyle(0x2B2418, 0.05)
        .fillEllipse(0, h / 2 + i * 1.4 * s, shW * (1 - i * 0.03), 7 * s * (i / 5) + 3 * s);
    }
    this.add(shadow);

    if (this.scene.textures.exists('shelf_wood')) {
      // Gleichmaessig skaliertes Bild statt NineSlice. Die Enden des Bretts
      // tragen die Messingstifte, und NineSlice zeichnet seine Endkappen in
      // Texturgroesse -- bei einem Brett, das auf 45 % skaliert wird, waeren die
      // Stifte doppelt so gross wie das Holz daneben. h folgt ohnehin dem
      // Seitenverhaeltnis, es wird also nichts verzerrt.
      const shelfImg = this.scene.add.image(0, 0, 'shelf_wood').setDisplaySize(w, h);
      shelfImg.setOrigin(0.5);
      this.add(shelfImg);
    } else {
      const g = this.scene.add.graphics();
      g.fillStyle(KYOTO.hinoki, 1.0).fillRoundedRect(-w / 2, -h / 2, w, h, 10 * s);
      [-this.spacing, 0, this.spacing].forEach(x => {
        g.fillStyle(KYOTO.slotIndent, 0.4).fillRoundedRect(x - 38 * s, -h / 2 + 8 * s, 76 * s, h - 16 * s, 8 * s);
      });
      g.fillStyle(KYOTO.kuroSteel, 1.0).fillRoundedRect(-w / 2 - 4 * s, h / 2 - 8 * s, w + 8 * s, 12 * s, 3 * s);
      g.fillStyle(KYOTO.brass, 1.0).fillCircle(-w / 2 + 6 * s, h / 2 - 2 * s, 2.5 * s).fillCircle(w / 2 - 6 * s, h / 2 - 2 * s, 2.5 * s);
      this.add(g);
    }
  }

  private initSlots(data: { front: string | null; queue: string[] }[]) {
    data.forEach((slot, i) => {
      this.queues[i] = [...slot.queue];
      if (slot.front) {
        const restY = getItemRestY(slot.front, this.itemScale, this.platformY);
        const item = new GoodsItem(this.scene, (i - 1) * this.spacing, restY, slot.front, this.itemScale, restY);
        this.slots[i] = item;
        this.add(item);
      }
    });
  }

  public getFirstEmptySlot(): number {
    return this.slots.findIndex(s => s === null);
  }

  public insertItem(i: number, item: GoodsItem, fromWorld?: { x: number; y: number }): boolean {
    if (this.slots[i] !== null) return false;
    this.slots[i] = item;
    this.add(item);

    const toX = (i - 1) * this.spacing;
    const toY = item.restY;

    // Beim Umhaengen in ein anderes Regal aendert sich das Bezugssystem. Ohne
    // Korrektur springt das Item auf die alten Lokalkoordinaten -- es sieht aus,
    // als flöge es von der Seite herein. Daher Weltposition zurueckrechnen.
    if (fromWorld) {
      item.setPosition(fromWorld.x - this.x, fromWorld.y - this.y);
    }

    const fromX = item.x;
    const fromY = item.y;
    const dist = Phaser.Math.Distance.Between(fromX, fromY, toX, toY);

    // Wurfparabel: das Item wird angehoben, fliegt ueber den Scheitel und
    // setzt auf dem Zielslot auf. Scheitelhoehe waechst mit der Distanz.
    const lift = Phaser.Math.Clamp(dist * 0.45, 26 * this.itemScale, 92 * this.itemScale);
    const peakX = (fromX + toX) / 2;
    const peakY = Math.min(fromY, toY) - lift;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(fromX, fromY),
      new Phaser.Math.Vector2(peakX, peakY),
      new Phaser.Math.Vector2(toX, toY)
    );

    // dist ist eine Weltdistanz und waechst mit DPR und Layout-Skalierung mit.
    // Fuer die Dauer zaehlt aber die gefuehlte Strecke, also zurueck in Design-Pixel.
    const designDist = dist / this.itemScale;
    const duration = Phaser.Math.Clamp(160 + designDist * 0.55, 200, 420);
    const travel = { t: 0 };
    const point = new Phaser.Math.Vector2();

    this.scene.tweens.add({
      targets: travel,
      t: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        curve.getPoint(travel.t, point);
        item.setPosition(point.x, point.y);
        // Leichtes Kippen in Flugrichtung, am Ziel wieder aufrecht
        item.setRotation(Phaser.Math.DegToRad(6 * Math.sign(toX - fromX) * Math.sin(travel.t * Math.PI)));
      },
      onComplete: () => {
        item.setPosition(toX, toY);
        item.setRotation(0);
        ZenAudio.playDrop();
        this.checkMatch();
      }
    });

    // Der Groessen-Impuls laeuft parallel: Anheben, dann Aufsetzen.
    this.scene.tweens.add({
      targets: item,
      scale: 1.08,
      duration: duration * 0.4,
      ease: 'Sine.easeOut',
      yoyo: true,
      hold: duration * 0.2
    });
    return true;
  }

  public removeItem(i: number): GoodsItem | null {
    const item = this.slots[i];
    if (item) {
      this.slots[i] = null;
      this.remove(item);
      this.advanceQueue(i);
    }
    return item;
  }

  public advanceQueue(i: number) {
    if (this.slots[i] === null && this.queues[i].length > 0) {
      const nextId = this.queues[i].shift()!;

      const restY = getItemRestY(nextId, this.itemScale, this.platformY);
      const nextItem = new GoodsItem(this.scene, (i - 1) * this.spacing, restY - 16 * this.itemScale, nextId, this.itemScale, restY);
      nextItem.setAlpha(0).setScale(0.7);
      this.slots[i] = nextItem;
      this.add(nextItem);

      this.scene.tweens.add({
        targets: nextItem,
        y: nextItem.restY,
        alpha: 1,
        scale: 1.0,
        duration: 220,
        ease: 'Back.easeOut',
        delay: 50,
        onComplete: () => this.checkMatch()
      });
    }
  }

  private playMatchEffect(itemId: string) {
    const s = this.itemScale;
    const y = getItemRestY(itemId, s, this.platformY);
    const effect = this.scene.add.container(0, 0);
    this.add(effect);

    if (this.scene.textures.exists('fx_match_burst')) {
      const sprite = this.scene.add.image(0, y, 'fx_match_burst')
        .setDisplaySize(75 * s, 75 * s)
        .setAlpha(0);
      const baseScaleX = sprite.scaleX;
      const baseScaleY = sprite.scaleY;
      sprite.setScale(baseScaleX * 0.55, baseScaleY * 0.55);
      effect.add(sprite);
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0.9,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        duration: 130,
        ease: 'Back.easeOut'
      });
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scaleX: baseScaleX * 1.2,
        scaleY: baseScaleY * 1.2,
        duration: 390,
        delay: 90,
        ease: 'Quad.easeOut'
      });
    }

    // Drei feine Siegelringe geben jedem Item einen eigenen, klaren Moment.
    [-this.spacing, 0, this.spacing].forEach((x, index) => {
      const ring = this.scene.add.graphics();
      ring.lineStyle(2.5 * s, index === 1 ? KYOTO.brass : 0xFFF7DE, 0.95);
      ring.strokeCircle(0, 0, 10 * s);
      ring.setPosition(x, y).setScale(0.65);
      effect.add(ring);

      this.scene.tweens.add({
        targets: ring,
        scale: 1.8,
        alpha: 0,
        duration: 360,
        delay: index * 25,
        ease: 'Quad.easeOut'
      });
    });

    // Zentraler Lichtkern und kurze radiale Strahlen.
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xFFF7DE, 0.95).fillCircle(0, 0, 9 * s);
    flash.setPosition(0, y).setScale(0.45);
    effect.add(flash);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.6,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut'
    });

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const ray = this.scene.add.graphics();
      ray.lineStyle((i % 3 === 0 ? 2.5 : 1.5) * s, i % 2 === 0 ? KYOTO.brass : 0xFFF7DE, 0.9);
      ray.lineBetween(0, -8 * s, 0, -19 * s);
      ray.setPosition(0, y).setRotation(angle).setScale(0.65);
      effect.add(ray);

      this.scene.tweens.add({
        targets: ray,
        scale: 1.35,
        alpha: 0,
        duration: 300,
        delay: 20,
        ease: 'Quad.easeOut'
      });
    }

    // Kleine Rauten statt runder Partikel: festlich, aber nicht bubble-artig.
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const distance = (42 + (i % 3) * 10) * s;
      const shard = this.scene.add.graphics();
      shard.fillStyle(i % 2 === 0 ? KYOTO.brass : KYOTO.matcha, 0.95);
      shard.fillTriangle(0, -4 * s, 3 * s, 3 * s, -3 * s, 3 * s);
      shard.setPosition(0, y).setRotation(angle).setScale(0.7);
      effect.add(shard);

      this.scene.tweens.add({
        targets: shard,
        x: Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.25,
        alpha: 0,
        duration: 420,
        delay: 35,
        ease: 'Cubic.easeOut'
      });
    }

    this.scene.time.delayedCall(560, () => effect.destroy());
  }

  public checkMatch() {
    const [s0, s1, s2] = this.slots;
    if (s0 && s1 && s2 && s0.itemId === s1.itemId && s1.itemId === s2.itemId) {
      const matched = [s0, s1, s2];
      this.slots = [null, null, null];

      this.playMatchEffect(s0.itemId);

      matched.forEach((item, idx) => {
        this.scene.tweens.add({
          targets: item,
          scale: 1.18,
          y: item.restY - 6 * this.itemScale,
          duration: 110,
          yoyo: true,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: item,
              scale: 0,
              alpha: 0,
              duration: 150,
              ease: 'Back.easeIn',
              onComplete: () => {
                item.destroy();
                if (idx === 0) [0, 1, 2].forEach(i => this.advanceQueue(i));
              }
            });
          }
        });
      });

      this.scene.events.emit(GameEvents.TRIPLE_MATCHED, {
        shelfIdx: this.shelfIdx,
        itemId: s0.itemId,
        worldX: this.x,
        worldY: this.y + getItemRestY(s0.itemId, this.itemScale, this.platformY)
      });
    }
  }
}

// ==========================================
// 5. SCENES & PROGRESSION CONTROLLERS
// ==========================================
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    // Optionale Assets werden nur angefragt, wenn sie im generierten Manifest
    // stehen. Der Vite-Dev-Server liefert fuer fehlende Dateien das HTML-Fallback
    // mit Status 200 -- der Loader wuerde daran haengenbleiben.
    const loadOptional = (key: string) => {
      if (AVAILABLE_ASSETS.has(key)) this.load.image(key, `assets/items/${key}.${ASSET_EXT}`);
    };

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] konnte ${file.key} nicht laden`);
    });

    // 1. Goods. Auch die laufen ueber das Manifest: fehlt ein Render, faellt das
    // Item auf seine Vektorgrafik zurueck, statt den Loader an einer 404 haengen
    // zu lassen (der Dev-Server antwortet darauf mit HTML und Status 200).
    Object.keys(ITEMS).forEach(id => {
      if (AVAILABLE_ASSETS.has(id)) this.load.image(`item_${id}`, `assets/items/${id}.${ASSET_EXT}`);
    });

    // 2. Environment & UI – Hintergrund-Tiers (höhere Tiers können fehlen, Fallback auf bg_kissa_niche)
    BG_TIERS.forEach(t => loadOptional(t.key));
    BG_LAYERS.forEach(l => loadOptional(l.key));
    loadOptional(NICHE_FRAME_KEY);
    this.load.image('shelf_wood', `assets/items/shelf_wood.${ASSET_EXT}`);
    this.load.image('fx_match_burst', `assets/items/fx_match_burst.${ASSET_EXT}`);
    this.load.image('ui_card_kuro', `assets/items/ui_card_kuro.${ASSET_EXT}`);
    this.load.image('ui_card_hinoki', `assets/items/ui_card_hinoki.${ASSET_EXT}`);
    this.load.image('btn_undo', `assets/items/btn_undo.${ASSET_EXT}`);
    this.load.image('btn_shuffle', `assets/items/btn_shuffle.${ASSET_EXT}`);
    this.load.image('btn_hammer', `assets/items/btn_hammer.${ASSET_EXT}`);
    this.load.image('ui_star', `assets/items/ui_star.${ASSET_EXT}`);
    this.load.image('ui_star_empty', `assets/items/ui_star_empty.${ASSET_EXT}`);
  }

  create() {
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }
}

export class GameScene extends Phaser.Scene {
  private shelves: Shelf[] = [];
  private selected: { shelfIdx: number; slotIdx: number; item: GoodsItem } | null = null;
  private cavityWidth = 0;
  private cavityCenterX = 0;
  private cavityTop = 0;
  private cavityHeight = 0;

  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const uiScale = getLayoutScale(width);
    this.shelves = [];
    this.selected = null;

    // Hintergrund. Zwei Varianten:
    //  a) Gartenszene aus bgl_ Layern plus freistehendem Regalgehaeuse
    //  b) undurchsichtige Wand-Nische bg_kissa_niche (Fallback)
    // Variante a braucht NICHE_FRAME_KEY -- ohne das Gehaeuse gaebe es kein
    // Regal, und die Wand-Nische wuerde die Layer ohnehin verdecken.
    const tier = getBgTier(State.currentLevel);
    const useGarden = this.textures.exists(NICHE_FRAME_KEY);
    const bgKey = useGarden
      ? NICHE_FRAME_KEY
      : (this.textures.exists(tier.key) ? tier.key : 'bg_kissa_niche');
    const cavityRatio = getCavityRatio(bgKey);

    // Default, falls gar keine Textur da ist
    this.cavityWidth = width * cavityRatio;
    this.cavityCenterX = width / 2;

    if (useGarden) {
      this.createBgLayers(width, height);
    }

    if (this.textures.exists(bgKey)) {
      const source = this.textures.get(bgKey).getSourceImage();
      const rect = BG_CAVITY_RECTS[bgKey];
      const frame = BG_FRAME_RECTS[bgKey];

      let imgX = width / 2;
      let imgY = height / 2;
      let k: number;

      if (frame) {
        // Freistehendes Moebel: so skalieren und setzen, dass es vollstaendig
        // zwischen Header und Booster-Reihe steht und unten auf der Wiese
        // aufsitzt. Cover-Scaling wuerde es oben und unten anschneiden -- das
        // liess es wie einen Wandausschnitt wirken statt wie ein Moebel im Garten.
        const bandTop = 78 * uiScale;
        const bandBottom = height - 74 * uiScale;

        k = Math.min(
          (bandBottom - bandTop) / (frame.h * source.height),
          (width * 0.92) / (frame.w * source.width)
        );
        imgX = width / 2 - (frame.x - 0.5) * source.width * k;
        imgY = bandBottom - (frame.y + frame.h - 0.5) * source.height * k;
      } else {
        k = Math.max(width / source.width, height / source.height);
      }

      if (rect) {
        // Exaktes Rechteck, beim Ausstanzen der Rueckwand aus dem Alphakanal gemessen
        this.cavityCenterX = imgX + (rect.x - 0.5) * source.width * k;
        this.cavityWidth = rect.w * source.width * k;
        this.cavityTop = imgY + (rect.y - 0.5) * source.height * k;
        this.cavityHeight = rect.h * source.height * k;
      } else {
        this.cavityCenterX = width / 2;
        this.cavityWidth = source.width * k * cavityRatio;
        this.cavityTop = 0;
        this.cavityHeight = 0;
      }

      // Shoji-Panel: hinter dem Rahmen, vor der Gartenszene. Ohne das milchige
      // Papier stehen die Goods direkt auf Himmel und Huegeln und verlieren
      // ihren Kontrast. Bewusst durchscheinend -- der Garten soll dahinter
      // erkennbar bleiben.
      if (useGarden && this.cavityHeight > 0) {
        this.add.graphics().setDepth(-12)
          .fillStyle(0xFFFDF6, 0.55)
          .fillRect(
            this.cavityCenterX - this.cavityWidth / 2,
            this.cavityTop,
            this.cavityWidth,
            this.cavityHeight
          );
      }

      // Bodenschatten: erdet das Moebel auf der Wiese, sonst schwebt es
      if (frame) {
        const footY = imgY + (frame.y + frame.h - 0.5) * source.height * k;
        const footW = frame.w * source.width * k;
        const shadow = this.add.graphics().setDepth(-11);
        for (let i = 6; i > 0; i--) {
          shadow.fillStyle(0x3A4A32, 0.05).fillEllipse(width / 2, footY, footW * (0.6 + i * 0.06), 26 * uiScale * (i / 6));
        }
      }

      this.add.image(imgX, imgY, bgKey).setScale(k).setDepth(-10);

      // Warmes Nischen-Licht: radialer Schein von oben
      const glow = this.add.graphics().setDepth(-9);
      const glowR = this.cavityWidth * 0.55;
      const cy = this.cavityHeight > 0 ? this.cavityTop + this.cavityHeight * 0.12 : height * 0.22;
      for (let r = glowR; r > 0; r -= glowR / 12) {
        glow.fillStyle(0xFFF8E8, 0.045 * (r / glowR)).fillCircle(this.cavityCenterX, cy, r);
      }
    }

    this.buildLevel(State.currentLevel);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.events.on(GameEvents.TRIPLE_MATCHED, this.onMatched, this);

    this.game.events.on(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
    this.game.events.on(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);

    // Sauberer Event-Cleanup zur Vermeidung von Leaks bei Restarts
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onPointerDown, this);
      this.game.events.off(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
      this.game.events.off(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);
    });
  }

  // Zeichnet die optionalen Parallax-Layer und startet ihre Leerlauf-Animation.
  private createBgLayers(width: number, height: number) {
    BG_LAYERS.forEach(layer => {
      if (!this.textures.exists(layer.key)) return;

      const src = this.textures.get(layer.key).getSourceImage();
      const amount = layer.amount ?? 0;
      const period = layer.period ?? 3000;
      const swaying = layer.motion === 'sway';

      let img: Phaser.GameObjects.Image;

      if (layer.mode === 'cover') {
        const scale = Math.max(width / src.width, height / src.height);
        // Beim Schwingen liegt der Drehpunkt an der Oberkante, sonst mittig
        img = this.add.image(width / 2, swaying ? 0 : height / 2, layer.key)
          .setOrigin(0.5, swaying ? 0 : 0.5)
          .setScale(scale)
          .setDepth(layer.depth);
      } else if (layer.mode === 'band') {
        // Zwei Pixel ueber den unteren Rand hinaus und minimal breiter als die
        // Leinwand: der Rand des Renders laeuft weich aus, ohne diesen
        // Ueberstand blitzt am Bildrand eine Fuge durch.
        img = this.add.image(width / 2, height + 2, layer.key)
          .setOrigin(0.5, 1)
          .setScale((width + 4) / src.width)
          .setDepth(layer.depth);
      } else {
        const targetW = width * (layer.widthRatio ?? 0.2);
        img = this.add.image(width * (layer.xRatio ?? 0.5), height * (layer.yRatio ?? 1), layer.key)
          .setOrigin(0.5, 1)
          .setScale(targetW / src.width)
          .setDepth(layer.depth)
          .setFlipX(layer.flipX === true);
      }

      const baseX = img.x;
      const baseY = img.y;

      switch (layer.motion) {
        case 'sway':
          this.tweens.add({
            targets: img,
            angle: { from: -amount, to: amount },
            duration: period,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
          break;
        case 'drift':
          this.tweens.add({
            targets: img,
            x: { from: baseX - width * amount, to: baseX + width * amount },
            duration: period,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
          break;
        case 'bob':
          this.tweens.add({
            targets: img,
            y: { from: baseY, to: baseY - amount },
            duration: period,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
          break;
      }
    });
  }

  private buildLevel(lvl: number) {
    const level = LEVELS[lvl - 1] ?? LEVELS[0];
    State.reset(level.moves, level.targetMatches);

    const itemScale = getLayoutScale(this.scale.width);
    const verticalScale = this.scale.height / DESIGN_HEIGHT;
    const rows = level.layout.length;
    const shelfWidth = Math.round(this.cavityWidth * SHELF_CAVITY_FILL);

    // Ist die lichte Hoehe der Nische bekannt, werden die Bretter gleichmaessig
    // darin verteilt statt nach festen Design-Werten gesetzt. Der halbe
    // Zeilenabstand oben und unten haelt Abstand zum Rahmen.
    let startY: number;
    let shelfSpacing: number;

    if (this.cavityHeight > 0) {
      shelfSpacing = this.cavityHeight / (rows + 0.5);
      startY = this.cavityTop + shelfSpacing * 0.75;
    } else {
      startY = (rows >= 6 ? 160 : rows === 5 ? 180 : 195) * verticalScale;
      shelfSpacing = (rows >= 6 ? 94 : rows === 5 ? 108 : 125) * verticalScale;
    }

    level.layout.forEach((data, i) => {
      this.shelves.push(new Shelf(this, this.cavityCenterX, startY + i * shelfSpacing, i, data, itemScale, shelfWidth));
    });
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    ZenAudio.playTap();

    // Mathematisch isolierte Hitbox-Prüfung
    for (let i = 0; i < this.shelves.length; i++) {
      const shelf = this.shelves[i];
      const halfW = shelf.shelfWidth / 2;

      if (p.x >= shelf.x - halfW && p.x <= shelf.x + halfW &&
          p.y >= shelf.y + shelf.hitTop && p.y <= shelf.y + shelf.hitBottom) {

        const localX = p.x - shelf.x;
        const slotIdx = localX < -shelf.spacing / 2 ? 0 : localX > shelf.spacing / 2 ? 2 : 1;

        if (State.activeBooster === 'hammer') {
          shelf.removeItem(slotIdx);
          State.activeBooster = null;
          this.game.events.emit(GameEvents.HAMMER_ACTIVE, false);
          return;
        }

        if (!this.selected) {
          const item = shelf.slots[slotIdx];
          if (item) {
            this.selected = { shelfIdx: i, slotIdx, item };
            item.setSelected(true);
          }
        } else {
          const src = this.selected;
          src.item.setSelected(false);

          if (src.shelfIdx === i && src.slotIdx === slotIdx) {
            this.selected = null;
            return;
          }

          const targetSlot = shelf.getFirstEmptySlot();
          if (targetSlot !== -1) {
            const srcShelf = this.shelves[src.shelfIdx];
            const fromWorld = { x: srcShelf.x + src.item.x, y: srcShelf.y + src.item.y };
            const moved = srcShelf.removeItem(src.slotIdx);
            if (moved) {
              shelf.insertItem(targetSlot, moved, fromWorld);
              State.moves--;
              State.history.push({
                fromShelf: src.shelfIdx,
                fromSlot: src.slotIdx,
                toShelf: i,
                toSlot: targetSlot,
                itemId: moved.itemId
              });
              this.game.events.emit(GameEvents.MOVE_EXECUTED, State.moves);
            }
          }
          this.selected = null;
        }
        return;
      }
    }

    if (this.selected) {
      this.selected.item.setSelected(false);
      this.selected = null;
    }
  }

  private onMatched({ worldX, worldY }: { worldX: number; worldY: number }) {
    State.matchesMade++;
    const pointsGained = 100 * State.combo;
    State.score += pointsGained;
    State.combo = Math.min(State.combo + 1, 5);
    State.comboTimer = 4.5;
    ZenAudio.playMatch(State.combo);

    // Schwebender Punkte-Indikator
    const effectScale = getLayoutScale(this.scale.width);
    const floatTxt = this.add.text(worldX, worldY - 16 * effectScale, `MATCH!\n+${pointsGained}`, {
      ...valueStyle(17 * effectScale, '#F4D58A'),
      align: 'center',
      stroke: '#1E2022',
      strokeThickness: 3 * effectScale,
      shadow: {
        offsetX: 0,
        offsetY: 3 * effectScale,
        color: '#1E2022',
        blur: 4 * effectScale,
        stroke: true,
        fill: true
      }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: floatTxt,
      y: worldY - 58 * effectScale,
      alpha: 0,
      scale: 1.08,
      duration: 800,
      ease: 'Quad.easeOut',
      onComplete: () => floatTxt.destroy()
    });

    this.game.events.emit(GameEvents.SCORE_UPDATED, { score: State.score, combo: State.combo });

    const allClear = this.shelves.every(s => s.slots.every(slot => slot === null) && s.queues.every(q => q.length === 0));
    if (allClear || State.matchesMade >= State.targetMatches) {
      ZenAudio.playWin();
      this.time.delayedCall(500, () => {
        this.scene.pause();
        this.scene.launch('WinModalScene');
      });
    }
  }

  private onUndo() {
    const last = State.history.pop();
    if (!last) return;

    const fromShelf = this.shelves[last.toShelf];
    const toShelf = this.shelves[last.fromShelf];
    const sIdx = fromShelf.slots.findIndex(s => s?.itemId === last.itemId);
    const targetSlot = toShelf.getFirstEmptySlot();

    if (sIdx !== -1 && targetSlot !== -1) {
      const src = fromShelf.slots[sIdx]!;
      const fromWorld = { x: fromShelf.x + src.x, y: fromShelf.y + src.y };
      const it = fromShelf.removeItem(sIdx);
      if (it) toShelf.insertItem(targetSlot, it, fromWorld);
    }
  }

  private onShuffle() {
    ZenAudio.playTap();
    const active: string[] = [];

    this.shelves.forEach(s => s.slots.forEach((it, idx) => {
      if (it) {
        active.push(it.itemId);
        it.destroy();
        s.slots[idx] = null;
      }
    }));

    active.sort(() => Math.random() - 0.5);

    this.shelves.forEach(s => {
      for (let i = 0; i < 3; i++) {
        if (active.length > 0 && s.slots[i] === null) {
          const id = active.pop()!;
          const restY = getItemRestY(id, s.itemScale, s.platformY);
          const it = new GoodsItem(this, (i - 1) * s.spacing, restY, id, s.itemScale, restY);
          s.slots[i] = it;
          s.add(it);
        }
      }
    });
  }

  update(_: number, delta: number) {
    if (State.combo > 1) {
      State.comboTimer -= delta / 1000;
      if (State.comboTimer <= 0) {
        State.combo = 1;
        this.game.events.emit(GameEvents.SCORE_UPDATED, { score: State.score, combo: 1 });
      }
    }
  }
}

// Zieht eine UI-Karte als NineSlice auf. Die Ecken/Raender der Textur behalten
// dabei ihre Originalgroesse -- nur die Mitte wird gedehnt. Ohne das wird eine
// schmale Karte auf Headerbreite gezogen und Rahmen wie Messingkante verzerren.
export function addCardNineSlice(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  key: string
): Phaser.GameObjects.NineSlice | null {
  if (!scene.textures.exists(key)) return null;

  const src = scene.textures.get(key).getSourceImage();
  const texW = src.width;
  const texH = src.height;

  // Rahmenbreite der Textur: 22% der kuerzeren Seite. Die Insets werden zusaetzlich
  // an der Zielgroesse gedeckelt -- sonst erzwingt eine fast quadratische Textur
  // eine Mindesthoehe und die Karte waechst ueber ihre Box hinaus.
  const inset = Math.floor(Math.min(texW, texH) * 0.22);
  const sideX = Math.max(1, Math.min(inset, Math.floor(texW / 2) - 1, Math.floor((w - 2) / 2)));
  const sideY = Math.max(1, Math.min(inset, Math.floor(texH / 2) - 1, Math.floor((h - 2) / 2)));

  const ns = scene.add.nineslice(x, y, key, undefined, w, h, sideX, sideX, sideY, sideY);
  ns.setOrigin(0.5);
  return ns;
}

export class UIScene extends Phaser.Scene {
  private scoreTxt!: Phaser.GameObjects.Text;
  private movesTxt!: Phaser.GameObjects.Text;
  private hammerHighlight!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create() {
    const { width, height } = this.scale;
    const uiScale = getLayoutScale(width);

    // Header. Die UI-Karten (ui_card_kuro / ui_card_hinoki) sind bewusst nicht
    // gezeichnet -- der Text steht frei ueber der Gartenszene. Die Assets und
    // addCardNineSlice bleiben erhalten, falls die Platten zurueckkommen.
    const pad = 26 * uiScale;
    const labelY = 30 * uiScale;
    const valueY = 56 * uiScale;

    // Dunkle Schrift plus heller Schein, damit sie sowohl auf Himmel als auch
    // auf Huegeln lesbar bleibt.
    const LABEL = '#5C4B33';
    const VALUE = '#1E2022';
    const halo = {
      shadow: { offsetX: 0, offsetY: 0, color: '#FDFBF7', blur: 8 * uiScale, stroke: true, fill: true }
    };

    // Label und Wert teilen sich dieselbe x-Mitte und stehen beide auf
    // Origin 0.5 -- damit sitzt die Zahl exakt unter der Wortmitte.
    const stack = (cx: number, text: string, initial: string) => {
      this.add.text(cx, labelY, text, { ...labelStyle(13 * uiScale, LABEL), ...halo }).setOrigin(0.5);
      return this.add.text(cx, valueY, initial, { ...valueStyle(24 * uiScale, VALUE), ...halo }).setOrigin(0.5);
    };

    // Aussenspalten so breit wie noetig, damit die Bloecke nicht am Rand kleben
    const colW = 78 * uiScale;
    this.scoreTxt = stack(pad + colW / 2, 'SCORE', '0');
    stack(width / 2, 'TEA BAR', `${State.currentLevel}`);
    this.movesTxt = stack(width - pad - colW / 2, 'MOVES', `${State.moves}`);

    // Booster-Reihe, ebenfalls ohne Tray-Karte
    const boosterSize = 52 * uiScale;
    const boosterSpacing = 112 * uiScale;
    const trayX = width / 2;
    const trayY = height - 46 * uiScale;

    const boosters = [
      { key: 'btn_undo', label: 'UNDO', fn: () => this.game.events.emit(GameEvents.UNDO_TRIGGERED) },
      { key: 'btn_shuffle', label: 'SHUFFLE', fn: () => this.game.events.emit(GameEvents.SHUFFLE_TRIGGERED) },
      { key: 'btn_hammer', label: 'HAMMER', fn: () => {
        State.activeBooster = State.activeBooster === 'hammer' ? null : 'hammer';
        this.updateHammerState();
      }}
    ];

    boosters.forEach((b, idx) => {
      const btn = this.add.container(trayX + (idx - 1) * boosterSpacing, trayY);

      if (b.label === 'HAMMER') {
        this.hammerHighlight = this.add.graphics();
        btn.add(this.hammerHighlight);
      }

      if (this.textures.exists(b.key)) {
        const sprite = this.add.image(0, 0, b.key).setDisplaySize(boosterSize, boosterSize);
        btn.add(sprite);
      } else {
        const bg = this.add.graphics().fillStyle(KYOTO.kuroSteel, 0.9).fillRoundedRect(-32 * uiScale, -22 * uiScale, 64 * uiScale, 44 * uiScale, 10 * uiScale);
        const txt = this.add.text(0, 0, b.label, valueStyle(10 * uiScale, '#FDFBF7')).setOrigin(0.5);
        btn.add([bg, txt]);
      }

      btn.setSize(60 * uiScale, 60 * uiScale).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, scale: 0.88, yoyo: true, duration: 70, onComplete: b.fn });
      });
    });

    const onMove = (m: number) => {
      this.movesTxt.setText(`${m}`);
      if (m <= 5) {
        this.movesTxt.setColor('#6E373B');
        this.tweens.add({ targets: this.movesTxt, scale: 1.2, yoyo: true, duration: 110, ease: 'Sine.easeOut' });
      } else {
        this.movesTxt.setColor(VALUE);
      }
    };

    const onScore = ({ score }: { score: number }) => {
      this.scoreTxt.setText(`${score}`);
      this.tweens.add({ targets: this.scoreTxt, scale: 1.18, yoyo: true, duration: 130, ease: 'Sine.easeOut' });
    };

    this.game.events.on(GameEvents.MOVE_EXECUTED, onMove);
    this.game.events.on(GameEvents.SCORE_UPDATED, onScore);
    this.game.events.on(GameEvents.HAMMER_ACTIVE, () => this.updateHammerState());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.MOVE_EXECUTED, onMove);
      this.game.events.off(GameEvents.SCORE_UPDATED, onScore);
    });
  }

  private updateHammerState() {
    if (!this.hammerHighlight) return;
    this.hammerHighlight.clear();
    if (State.activeBooster === 'hammer') {
      const uiScale = getLayoutScale(this.scale.width);
      this.hammerHighlight.fillStyle(KYOTO.azuki, 0.35).fillCircle(0, 0, 32 * uiScale);
      this.hammerHighlight.lineStyle(2 * uiScale, KYOTO.azuki, 1).strokeCircle(0, 0, 32 * uiScale);
    }
  }
}

export class WinModalScene extends Phaser.Scene {
  constructor() {
    super('WinModalScene');
  }

  create() {
    const { width, height } = this.scale;
    // Die Karte wurde bisher in festen Pixeln gebaut. In Geraetepixeln waere sie
    // damit auf einem 3x-Display ein Drittel so gross wie gedacht.
    const s = getLayoutScale(width);
    this.add.graphics().fillStyle(0x000000, 0.45).fillRect(0, 0, width, height);

    const card = this.add.container(width / 2, height / 2);
    const cardW = 280 * s;
    const cardH = 260 * s;
    const bg = this.add.graphics().fillStyle(KYOTO.cream, 1).fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);
    bg.lineStyle(2 * s, KYOTO.hinoki, 0.7).strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);

    const title = this.add.text(0, -85 * s, `TEA BAR ${State.currentLevel} CLEARED`, valueStyle(18 * s, '#1E2022')).setOrigin(0.5);

    // 3-Sterne Bewertung
    const movesRatio = State.moves / State.initialMoves;
    const starCount = movesRatio >= 0.5 ? 3 : movesRatio >= 0.2 ? 2 : 1;

    [-40, 0, 40].forEach((xOffset, idx) => {
      const hasStar = idx < starCount;
      const key = hasStar ? 'ui_star' : 'ui_star_empty';

      if (this.textures.exists(key)) {
        const star = this.add.image(xOffset * s, -40 * s, key).setDisplaySize(32 * s, 32 * s);
        card.add(star);
      } else {
        const g = this.add.graphics().fillStyle(hasStar ? KYOTO.brass : 0xCCCCCC, 1).fillCircle(xOffset * s, -40 * s, 12 * s);
        card.add(g);
      }
    });

    const scoreLabel = this.add.text(0, -6 * s, 'SCORE', labelStyle(10 * s, '#8C7A5E')).setOrigin(0.5);
    const score = this.add.text(0, 14 * s, `${State.score}`, valueStyle(24 * s, '#4A6B47')).setOrigin(0.5);

    const btn = this.add.container(0, 65 * s);
    const btnBg = this.add.graphics().fillStyle(KYOTO.matcha, 1).fillRoundedRect(-65 * s, -20 * s, 130 * s, 40 * s, 10 * s);
    const btnTxt = this.add.text(0, 0, 'NEXT BAR', valueStyle(14 * s, '#FFFFFF')).setOrigin(0.5);

    btn.add([btnBg, btnTxt]).setSize(130 * s, 40 * s).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      State.currentLevel = State.currentLevel >= LEVELS.length ? 1 : State.currentLevel + 1;
      this.scene.stop('WinModalScene');
      this.scene.get('GameScene').scene.restart();
    });

    card.add([bg, title, scoreLabel, score, btn]).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }
}

// ==========================================
// 6. ENGINE BOOTSTRAP
// ==========================================
// Canvas-Groesse in Geraetepixeln. Die Anzeigegroesse ist das Container-Rechteck
// in CSS-Pixeln, die Backingstore-Groesse ein Vielfaches davon.
function getCanvasSize() {
  const parent = document.getElementById('game-container');
  const cssW = parent?.clientWidth || window.innerWidth;
  const cssH = parent?.clientHeight || window.innerHeight;
  return { width: Math.round(cssW * DPR), height: Math.round(cssH * DPR) };
}

function boot() {
  const size = getCanvasSize();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: size.width,
    height: size.height,
    backgroundColor: '#F3EFEA',
    scale: {
      // NONE statt RESIZE: nur hier ist die Canvas-Aufloesung von der
      // Anzeigegroesse entkoppelt. RESIZE setzt canvas.width hart auf die
      // Elternbreite in CSS-Pixeln und ignoriert zoom komplett.
      mode: Phaser.Scale.NONE,
      zoom: 1 / DPR,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PreloadScene, GameScene, UIScene, WinModalScene]
  });

  // Im Modus NONE folgt die Canvas dem Container nicht von selbst. Drehung und
  // ein- oder ausfahrende Browserleisten aendern das Rechteck, also nachziehen.
  const fitToParent = () => {
    const next = getCanvasSize();
    if (next.width !== game.scale.width || next.height !== game.scale.height) {
      game.scale.resize(next.width, next.height);
    }
  };
  window.addEventListener('resize', fitToParent);
  window.addEventListener('orientationchange', () => window.setTimeout(fitToParent, 150));

  // Debug-Handle fuer die Layout-Pruefung im Browser
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}

// Phaser rastert Text beim Erzeugen in die Canvas. Startet das Spiel bevor die
// Webfont geladen ist, bleibt der erste Frame in der Fallback-Schrift stehen.
if (document.fonts && document.fonts.load) {
  Promise.all([
    document.fonts.load('500 16px "M PLUS Rounded 1c"'),
    document.fonts.load('800 16px "M PLUS Rounded 1c"')
  ]).then(boot).catch(boot);
} else {
  boot();
}
