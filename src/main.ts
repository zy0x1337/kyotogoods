import Phaser from 'phaser';
import { ITEM_BOTTOM_OFFSETS, BG_CAVITY_RATIOS } from './item_offsets.generated';

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

const DESIGN_WIDTH = 420;
const DESIGN_HEIGHT = 760;
const ITEM_SIZE = 72;
const SHELF_PLATFORM_TOP_Y = 38;
const DEFAULT_ITEM_BOTTOM_OFFSET = 36;
const BG_CAVITY_RATIO = 0.6458;

// Anteil der lichten Nischenweite, den ein Regalbrett einnimmt. < 1, damit das
// Brett nicht an den Hinoki-Rahmen stoesst.
const SHELF_CAVITY_FILL = 0.94;

// Hintergrund-Tiers: pro Level-Gruppe eine breiter werdende Nische. Das
// cavityRatio wird von scripts/process_assets.js am fertigen PNG gemessen.
const BG_TIERS: { key: string; levelRange: [number, number] }[] = [
  { key: 'bg_kissa_niche',      levelRange: [1, 3] },
  { key: 'bg_kissa_niche_mid',  levelRange: [4, 5] },
  { key: 'bg_kissa_niche_wide', levelRange: [6, 6] },
];

// Parallax-Layer des Hintergrunds. Jeder Layer ist ein eigenes freigestelltes
// PNG (Prefix bgl_) und wird nur gezeichnet, wenn die Textur geladen werden
// konnte. So kann die Szene stueckweise wachsen, ohne dass Code bricht.
// yRatio/widthRatio beziehen sich auf Canvas-Hoehe bzw. -Breite.
type BgMotion = 'none' | 'sway' | 'drift' | 'bob';

interface BgLayer {
  key: string;
  yRatio: number;
  widthRatio: number;
  xRatio?: number;
  depth: number;
  motion: BgMotion;
  amount?: number;
  period?: number;
}

const BG_LAYERS: BgLayer[] = [
  { key: 'bgl_sky',      yRatio: 0.00, widthRatio: 1.00, depth: -40, motion: 'none' },
  { key: 'bgl_clouds',   yRatio: 0.14, widthRatio: 1.60, depth: -38, motion: 'drift', amount: 0.5, period: 42000 },
  { key: 'bgl_hills',    yRatio: 0.62, widthRatio: 1.00, depth: -34, motion: 'none' },
  { key: 'bgl_meadow',   yRatio: 1.00, widthRatio: 1.00, depth: -18, motion: 'none' },
  { key: 'bgl_lanterns', yRatio: 0.05, widthRatio: 0.94, depth: -16, motion: 'sway', amount: 1.6, period: 3800 },
  { key: 'bgl_cat',      yRatio: 0.955, widthRatio: 0.20, xRatio: 0.20, depth: -14, motion: 'bob', amount: 4, period: 2600 },
  { key: 'bgl_dog',      yRatio: 0.955, widthRatio: 0.24, xRatio: 0.79, depth: -14, motion: 'bob', amount: 5, period: 3100 },
];

function getCavityRatio(key: string): number {
  return BG_CAVITY_RATIOS[key] ?? BG_CAVITY_RATIO;
}

function getBgTier(level: number) {
  return BG_TIERS.find(t => level >= t.levelRange[0] && level <= t.levelRange[1]) ?? BG_TIERS[0];
}

function getLayoutScale(width: number): number {
  return Math.min(width / DESIGN_WIDTH, 1.15);
}

function getItemRestY(itemId: string, itemScale: number): number {
  const bottomOffset = ITEM_BOTTOM_OFFSETS[itemId] ?? DEFAULT_ITEM_BOTTOM_OFFSET;
  return (SHELF_PLATFORM_TOP_Y - bottomOffset) * itemScale;
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
const LEVELS: LevelDefinition[] = [
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
  {
    moves: 13,
    targetMatches: 6,
    layout: [
      [
        { front: 'copper_caddy', queue: [] },
        { front: 'copper_caddy', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'copper_caddy', queue: ['origami_dripper'] },
        { front: 'origami_dripper', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'origami_dripper', queue: ['coldbrew_flask'] },
        { front: 'coldbrew_flask', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'coldbrew_flask', queue: ['brass_sphere'] },
        { front: 'brass_sphere', queue: [] },
        { front: null, queue: ['matcha_roll', 'shou_sugi_block', 'shou_sugi_block'] }
      ],
      [
        { front: 'brass_sphere', queue: ['shou_sugi_block'] },
        { front: 'matcha_roll', queue: [] },
        { front: 'matcha_roll', queue: [] }
      ]
    ]
  },
  {
    moves: 14,
    targetMatches: 8,
    layout: [
      [
        { front: 'matcha_montblanc', queue: [] },
        { front: 'matcha_montblanc', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'matcha_montblanc', queue: ['chashaku_scoop'] },
        { front: 'chashaku_scoop', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'chashaku_scoop', queue: ['incense_burner'] },
        { front: 'incense_burner', queue: ['dango_plate', 'cast_iron_bell'] },
        { front: null, queue: [] }
      ],
      [
        { front: 'incense_burner', queue: ['mizuhiki_knot'] },
        { front: 'mizuhiki_knot', queue: ['gotoku_trivet', 'kuro_mame_dome', 'dango_plate', 'cast_iron_bell'] },
        { front: null, queue: ['gotoku_trivet', 'kuro_mame_dome', 'dango_plate', 'cast_iron_bell'] }
      ],
      [
        { front: 'mizuhiki_knot', queue: [] },
        { front: 'gotoku_trivet', queue: [] },
        { front: 'kuro_mame_dome', queue: [] }
      ]
    ]
  },
  // Level 4 – 5 Regale, 5 Matches, Einsteiger-Puzzle mit Queues
  {
    moves: 12,
    targetMatches: 5,
    layout: [
      [
        { front: 'chawan_cup', queue: [] },
        { front: 'chawan_cup', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'tetsubin_kettle', queue: ['chawan_cup'] },
        { front: 'tetsubin_kettle', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'chasen_whisk', queue: ['tetsubin_kettle'] },
        { front: 'chasen_whisk', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'kissa_toast', queue: ['chasen_whisk'] },
        { front: 'kissa_toast', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'yokan_prism', queue: ['kissa_toast'] },
        { front: 'yokan_prism', queue: [] },
        { front: 'yokan_prism', queue: [] }
      ]
    ]
  },
  // Level 5 – 6 Regale, 9 Matches, Planungstiefe
  {
    moves: 18,
    targetMatches: 9,
    layout: [
      [
        { front: 'matcha_roll', queue: [] },
        { front: 'matcha_roll', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'brass_sphere', queue: ['matcha_roll'] },
        { front: 'brass_sphere', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'coldbrew_flask', queue: ['brass_sphere'] },
        { front: 'coldbrew_flask', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'shou_sugi_block', queue: ['coldbrew_flask'] },
        { front: 'shou_sugi_block', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'copper_caddy', queue: ['shou_sugi_block'] },
        { front: 'copper_caddy', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'origami_dripper', queue: ['copper_caddy'] },
        { front: 'origami_dripper', queue: [] },
        { front: 'origami_dripper', queue: [] }
      ]
    ]
  },
  // Level 6 – 6 Regale, 12 Matches, Endgame mit tiefen Queues
  {
    moves: 22,
    targetMatches: 12,
    layout: [
      [
        { front: 'mizuhiki_knot', queue: ['gotoku_trivet'] },
        { front: 'gotoku_trivet', queue: [] },
        { front: null, queue: [] }
      ],
      [
        { front: 'cast_iron_bell', queue: ['mizuhiki_knot'] },
        { front: 'kuro_mame_dome', queue: ['cast_iron_bell'] },
        { front: null, queue: [] }
      ],
      [
        { front: 'dango_plate', queue: ['kuro_mame_dome'] },
        { front: 'incense_burner', queue: ['dango_plate'] },
        { front: null, queue: [] }
      ],
      [
        { front: 'matcha_montblanc', queue: ['incense_burner'] },
        { front: 'chashaku_scoop', queue: ['matcha_montblanc'] },
        { front: null, queue: [] }
      ],
      [
        { front: 'chawan_cup', queue: ['chashaku_scoop'] },
        { front: 'tetsubin_kettle', queue: ['chawan_cup'] },
        { front: 'chasen_whisk', queue: ['tetsubin_kettle'] }
      ],
      [
        { front: 'gotoku_trivet', queue: [] },
        { front: 'kuro_mame_dome', queue: [] },
        { front: 'yokan_prism', queue: ['chasen_whisk', 'dango_plate', 'incense_burner', 'matcha_montblanc', 'chashaku_scoop', 'yokan_prism'] }
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

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string, itemScale = 1) {
    super(scene, x, y);
    this.itemId = itemId;
    this.itemDef = ITEMS[itemId] || ITEMS['chawan_cup'];
    this.itemScale = itemScale;
    this.restY = getItemRestY(itemId, itemScale);
    this.setSize(76 * itemScale, 76 * itemScale);
    this.renderArt();
    scene.add.existing(this);
  }

  private renderArt() {
    const s = this.itemScale;

    if (this.scene.textures.exists(`item_${this.itemId}`)) {
      const img = this.scene.add.image(0, 0, `item_${this.itemId}`).setDisplaySize(ITEM_SIZE * s, ITEM_SIZE * s);
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
      g.fillCircle(0, -4, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-3, 10, 6, 14);
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

  constructor(scene: Phaser.Scene, x: number, y: number, shelfIdx: number, data: { front: string | null; queue: string[] }[], itemScale = 1, shelfWidth = 304) {
    super(scene, x, y);
    this.shelfIdx = shelfIdx;
    this.itemScale = itemScale;
    // Drei Slots gleichmaessig ueber das Brett verteilt: Raender links und
    // rechts sind damit immer gleich gross.
    this.spacing = Phaser.Math.Clamp(shelfWidth / 3, 78 * itemScale, 104 * itemScale);
    this.shelfWidth = shelfWidth;
    this.shelfHeight = 92 * itemScale;
    this.drawStructure();
    this.initSlots(data);
    scene.add.existing(this);
  }

  private drawStructure() {
    const w = this.shelfWidth;
    const h = this.shelfHeight;
    const s = this.itemScale;

    // Dezenter Schatten hinter dem Regalbrett
    const shadow = this.scene.add.graphics();
    shadow.fillStyle(0x000000, 0.18).fillRoundedRect(-w / 2 + 3 * s, -h / 2 + 5 * s, w, h, 8 * s);
    this.add(shadow);

    if (this.scene.textures.exists('shelf_wood')) {
      const shelfImg = this.scene.add.image(0, 0, 'shelf_wood').setDisplaySize(w, h);
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
        const item = new GoodsItem(this.scene, (i - 1) * this.spacing, getItemRestY(slot.front, this.itemScale), slot.front, this.itemScale);
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

    const duration = Phaser.Math.Clamp(160 + dist * 0.55, 200, 420);
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

      const nextItem = new GoodsItem(this.scene, (i - 1) * this.spacing, getItemRestY(nextId, this.itemScale) - 16 * this.itemScale, nextId, this.itemScale);
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
    const y = getItemRestY(itemId, s);
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
        worldY: this.y + getItemRestY(s0.itemId, this.itemScale)
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
    // Stille Fehlerbehandlung für optionale Hintergrund-Tiers
    this.load.on('loaderror', () => {});

    // 1. Goods
    Object.keys(ITEMS).forEach(id => {
      this.load.image(`item_${id}`, `assets/items/${id}.png`);
    });

    // 2. Environment & UI – Hintergrund-Tiers (höhere Tiers können fehlen, Fallback auf bg_kissa_niche)
    BG_TIERS.forEach(t => this.load.image(t.key, `assets/items/${t.key}.png`));
    BG_LAYERS.forEach(l => this.load.image(l.key, `assets/items/${l.key}.png`));
    this.load.image('shelf_wood', 'assets/items/shelf_wood.png');
    this.load.image('fx_match_burst', 'assets/items/fx_match_burst.png');
    this.load.image('ui_card_kuro', 'assets/items/ui_card_kuro.png');
    this.load.image('ui_card_hinoki', 'assets/items/ui_card_hinoki.png');
    this.load.image('btn_undo', 'assets/items/btn_undo.png');
    this.load.image('btn_shuffle', 'assets/items/btn_shuffle.png');
    this.load.image('btn_hammer', 'assets/items/btn_hammer.png');
    this.load.image('ui_star', 'assets/items/ui_star.png');
    this.load.image('ui_star_empty', 'assets/items/ui_star_empty.png');
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

  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    this.shelves = [];
    this.selected = null;

    // Hintergrund: Level-Tier bestimmen, Fallback auf Basis-Nische
    const tier = getBgTier(State.currentLevel);
    const bgKey = this.textures.exists(tier.key) ? tier.key : 'bg_kissa_niche';
    const cavityRatio = getCavityRatio(bgKey);

    // Default, falls gar keine Textur da ist
    this.cavityWidth = width * cavityRatio;
    this.cavityCenterX = width / 2;

    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(width / 2, height / 2, bgKey);
      const source = this.textures.get(bgKey).getSourceImage();
      const coverScale = Math.max(width / source.width, height / source.height);
      bg.setScale(coverScale).setDepth(-10);

      // Die Nische wird mit dem Hintergrund mitskaliert und -beschnitten. Ihre
      // Breite auf dem Schirm haengt daher am coverScale, nicht an der
      // Screenbreite -- sonst laeuft das Regal ueber den Hinoki-Rahmen.
      this.cavityWidth = source.width * coverScale * cavityRatio;
      this.cavityCenterX = bg.x;

      // Warmes Nischen-Licht: radialer Schein von oben
      const glow = this.add.graphics().setDepth(-9);
      const glowR = this.cavityWidth * 0.55;
      const cx = this.cavityCenterX;
      const cy = height * 0.22;
      for (let r = glowR; r > 0; r -= glowR / 12) {
        const alpha = 0.045 * (r / glowR);
        glow.fillStyle(0xFFF8E8, alpha).fillCircle(cx, cy, r);
      }
    }

    this.createBgLayers(width, height);

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
      const targetW = width * layer.widthRatio;
      const scale = targetW / src.width;
      const x = width * (layer.xRatio ?? 0.5);
      const y = height * layer.yRatio;

      // yRatio 0 haengt oben, 1 steht unten auf, dazwischen wird zentriert
      const originY = layer.yRatio <= 0.02 ? 0 : layer.yRatio >= 0.98 ? 1 : 0.5;

      const img = this.add.image(x, y, layer.key)
        .setOrigin(0.5, originY)
        .setScale(scale)
        .setDepth(layer.depth);

      const amount = layer.amount ?? 0;
      const period = layer.period ?? 3000;

      switch (layer.motion) {
        case 'sway':
          img.setOrigin(0.5, 0);
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
            x: { from: x - width * amount * 0.25, to: x + width * amount * 0.25 },
            duration: period,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
          break;
        case 'bob':
          this.tweens.add({
            targets: img,
            y: { from: y, to: y - amount },
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
    const startY = (rows >= 6 ? 160 : rows === 5 ? 180 : 195) * verticalScale;
    const shelfSpacing = (rows >= 6 ? 94 : rows === 5 ? 108 : 125) * verticalScale;
    const shelfWidth = Math.round(this.cavityWidth * SHELF_CAVITY_FILL);

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
      const halfH = shelf.shelfHeight / 2;

      if (p.x >= shelf.x - halfW && p.x <= shelf.x + halfW &&
          p.y >= shelf.y - halfH && p.y <= shelf.y + halfH) {

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
      fontSize: `${17 * effectScale}px`,
      color: '#F4D58A',
      fontStyle: 'bold',
      align: 'center',
      stroke: '#1E2022',
      strokeThickness: 3 * effectScale,
      shadow: {
        offsetX: 0,
        offsetY: 3 * effectScale,
        color: '#1E2022',
        blur: 4,
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
          const it = new GoodsItem(this, (i - 1) * s.spacing, getItemRestY(id, s.itemScale), id, s.itemScale);
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
function addCardNineSlice(
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

  // Rahmenbreite der Textur: 30% der kuerzeren Seite, aber nie mehr als die
  // Haelfte einer Achse (sonst ueberlappen die Slices).
  const inset = Math.floor(Math.min(texW, texH) * 0.3);
  const sideX = Math.min(inset, Math.floor(texW / 2) - 1);
  const sideY = Math.min(inset, Math.floor(texH / 2) - 1);

  // Zielmasse nie unter die Rahmengroesse druecken, sonst ueberlappen die Slices
  const drawW = Math.max(w, sideX * 2 + 2);
  const drawH = Math.max(h, sideY * 2 + 2);

  const ns = scene.add.nineslice(x, y, key, undefined, drawW, drawH, sideX, sideX, sideY, sideY);
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

    // Header Plaque
    const headerW = width - 32 * uiScale;
    const headerH = 60 * uiScale;
    const headerX = 16 * uiScale;
    const headerY = 24 * uiScale;
    const headerCard = addCardNineSlice(this, headerX + headerW / 2, headerY + headerH / 2, headerW, headerH, 'ui_card_kuro');
    if (!headerCard) {
      const headerBg = this.add.graphics();
      headerBg.fillStyle(KYOTO.kuroSteel, 0.08).fillRoundedRect(headerX, headerY, headerW, headerH, 14 * uiScale);
      headerBg.lineStyle(1.5 * uiScale, KYOTO.hinoki, 0.5).strokeRoundedRect(headerX, headerY, headerW, headerH, 14 * uiScale);
    }

    this.scoreTxt = this.add.text(32 * uiScale, 42 * uiScale, 'SCORE: 0', {
      fontSize: `${18 * uiScale}px`,
      color: '#1E2022',
      fontStyle: 'bold'
    });

    this.add.text(width / 2, 42 * uiScale, `BAR ${State.currentLevel}`, {
      fontSize: `${14 * uiScale}px`,
      color: '#8C7A5E',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    this.movesTxt = this.add.text(width - 32 * uiScale, 42 * uiScale, `MOVES: ${State.moves}`, {
      fontSize: `${18 * uiScale}px`,
      color: '#4A6B47',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // Booster Tray. Breite folgt der Buttonreihe, damit kein Button ueber den
    // Rand der Karte hinausragt.
    const boosterSpacing = 96 * uiScale;
    const boosterSize = 54 * uiScale;
    const trayW = boosterSpacing * 2 + boosterSize + 34 * uiScale;
    const trayH = 78 * uiScale;
    const trayX = width / 2;
    const trayY = height - 56 * uiScale;
    const trayCard = addCardNineSlice(this, trayX, trayY, trayW, trayH, 'ui_card_hinoki');
    if (!trayCard) {
      const trayBg = this.add.graphics();
      trayBg.fillStyle(KYOTO.hinoki, 0.12).fillRoundedRect(trayX - trayW / 2, trayY - trayH / 2, trayW, trayH, 12 * uiScale);
      trayBg.lineStyle(1 * uiScale, KYOTO.hinoki, 0.3).strokeRoundedRect(trayX - trayW / 2, trayY - trayH / 2, trayW, trayH, 12 * uiScale);
    }

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
        const txt = this.add.text(0, 0, b.label, { fontSize: `${11 * uiScale}px`, color: '#FDFBF7', fontStyle: 'bold' }).setOrigin(0.5);
        btn.add([bg, txt]);
      }

      btn.setSize(60 * uiScale, 60 * uiScale).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, scale: 0.88, yoyo: true, duration: 70, onComplete: b.fn });
      });
    });

    const onMove = (m: number) => {
      this.movesTxt.setText(`MOVES: ${m}`);
      if (m <= 5) {
        this.movesTxt.setColor('#6E373B');
        this.tweens.add({ targets: this.movesTxt, scale: 1.15, yoyo: true, duration: 100 });
      } else {
        this.movesTxt.setColor('#4A6B47');
      }
    };

    const onScore = ({ score }: { score: number }) => {
      this.scoreTxt.setText(`SCORE: ${score}`);
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
    this.add.graphics().fillStyle(0x000000, 0.45).fillRect(0, 0, width, height);

    const card = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics().fillStyle(KYOTO.cream, 1).fillRoundedRect(-140, -130, 280, 260, 16);
    bg.lineStyle(2, KYOTO.hinoki, 0.7).strokeRoundedRect(-140, -130, 280, 260, 16);

    const title = this.add.text(0, -85, `TEA BAR ${State.currentLevel} CLEARED`, {
      fontSize: '18px',
      color: '#1E2022',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 3-Sterne Bewertung
    const movesRatio = State.moves / State.initialMoves;
    const starCount = movesRatio >= 0.5 ? 3 : movesRatio >= 0.2 ? 2 : 1;

    [-40, 0, 40].forEach((xOffset, idx) => {
      const hasStar = idx < starCount;
      const key = hasStar ? 'ui_star' : 'ui_star_empty';

      if (this.textures.exists(key)) {
        const star = this.add.image(xOffset, -40, key).setDisplaySize(32, 32);
        card.add(star);
      } else {
        const g = this.add.graphics().fillStyle(hasStar ? KYOTO.brass : 0xCCCCCC, 1).fillCircle(xOffset, -40, 12);
        card.add(g);
      }
    });

    const score = this.add.text(0, 5, `SCORE: ${State.score}`, {
      fontSize: '20px',
      color: '#4A6B47',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const btn = this.add.container(0, 65);
    const btnBg = this.add.graphics().fillStyle(KYOTO.matcha, 1).fillRoundedRect(-65, -20, 130, 40, 10);
    const btnTxt = this.add.text(0, 0, 'NEXT BAR', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    btn.add([btnBg, btnTxt]).setSize(130, 40).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      State.currentLevel = State.currentLevel >= LEVELS.length ? 1 : State.currentLevel + 1;
      this.scene.stop('WinModalScene');
      this.scene.get('GameScene').scene.restart();
    });

    card.add([bg, title, score, btn]).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }
}

// ==========================================
// 6. ENGINE BOOTSTRAP
// ==========================================
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#F3EFEA',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [PreloadScene, GameScene, UIScene, WinModalScene]
});
