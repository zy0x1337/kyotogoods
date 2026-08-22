import '@fontsource/m-plus-rounded-1c/latin-500.css';
import '@fontsource/m-plus-rounded-1c/latin-800.css';
import Phaser from 'phaser';
import { ITEM_BOTTOM_OFFSETS, AVAILABLE_ASSETS, ASSET_EXT } from './item_offsets.generated';
import { generateLevel, isBossLevel, LEVEL_COUNT, LEVEL_PARAMS } from './levels';
import type { LevelDefinition, SlotDef } from './levels';
import { BOX_COUNT, DECOS, DECO_IDS, loadBento, milestoneForBox, registerWin } from './bento';
import type { BentoAward, BentoSave } from './bento';

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
const DEFAULT_ITEM_BOTTOM_OFFSET = 36;

// Hintergrund-Szenen. Bei 30 Levels und drei Szenen wechselt der Schauplatz
// alle fuenf Levels und rotiert danach weiter -- der Wechsel faellt so mit den
// Sprungpunkten der Schwierigkeitskurve zusammen.
const LEVEL_BG_KEYS = ['bgl_kitchen', 'bgl_yatai', 'bgl_konbini'];
const LEVELS_PER_BG = 5;

function getLevelBgKey(level: number): string | undefined {
  const group = Math.floor(Math.max(level - 1, 0) / LEVELS_PER_BG) % LEVEL_BG_KEYS.length;
  const key = LEVEL_BG_KEYS[group];
  return key && AVAILABLE_ASSETS.has(key) ? key : undefined;
}


// width kommt in Geraetepixeln herein, der Deckel gilt aber in CSS-Pixeln --
// sonst waere er auf einem 3x-Display schon bei einem Drittel der Breite erreicht.
function getLayoutScale(width: number): number {
  return Math.min(width / (DESIGN_WIDTH * DPR), 1.15) * DPR;
}

// Ruhelage eines Items im Grid-Slot. platformY ist die Unterkante des Slots.
function getItemRestY(itemId: string, itemScale: number, platformY: number): number {
  const bottomOffset = ITEM_BOTTOM_OFFSETS[itemId] ?? DEFAULT_ITEM_BOTTOM_OFFSET;
  return platformY - bottomOffset * ITEM_OFFSET_SCALE * itemScale;
}

export interface ItemDef {
  id: string;
  name: string;
  baseColor: number;
  accentColor: number;
  detailColor: number;
  shape: 'rounded_triangle' | 'flat_oval' | 'circle' | 'cone' | 'crescent' | 'trapezoid' | 'stack' | 'skewer' | 'bowl' | 'dome' | 'double_disc' | 'boat' | 'pod' | 'tall_cup' | 'rectangle' | 'flower' | 'mound' | 'ball_stem' | 'ball_leaf' | 'pouch';
}

export const ITEMS: Record<string, ItemDef> = {
  'onigiri':         { id: 'onigiri',         name: 'Onigiri',         baseColor: KYOTO.cream,     accentColor: 0x2D2D2D, detailColor: 0xE74C3C, shape: 'rounded_triangle' },
  'nigiri':          { id: 'nigiri',          name: 'Nigiri',          baseColor: KYOTO.cream,     accentColor: 0xFA8072, detailColor: 0xF5F5F5, shape: 'flat_oval' },
  'maki':            { id: 'maki',            name: 'Maki',            baseColor: 0x2D5A3D,       accentColor: KYOTO.cream, detailColor: 0xFA8072, shape: 'circle' },
  'temaki':          { id: 'temaki',          name: 'Temaki',          baseColor: 0x2D5A3D,       accentColor: 0xFA8072, detailColor: KYOTO.cream, shape: 'cone' },
  'gyoza':           { id: 'gyoza',           name: 'Gyoza',           baseColor: 0xE8B84B,       accentColor: 0xD4A03A, detailColor: 0xC4912E, shape: 'crescent' },
  'purin':           { id: 'purin',           name: 'Purin',           baseColor: 0xF5DEB3,       accentColor: 0x8B6914, detailColor: 0xE74C3C, shape: 'trapezoid' },
  'dango':           { id: 'dango',           name: 'Dango',           baseColor: KYOTO.dangoPink, accentColor: KYOTO.cream, detailColor: KYOTO.matcha, shape: 'stack' },
  'yakitori':        { id: 'yakitori',        name: 'Yakitori',        baseColor: 0xC68B59,       accentColor: 0xA0694B, detailColor: 0xD2B48C, shape: 'skewer' },
  'ramen':           { id: 'ramen',           name: 'Ramen',           baseColor: 0xC68B59,       accentColor: KYOTO.cream, detailColor: 0x2D5A3D, shape: 'bowl' },
  'mochi':           { id: 'mochi',           name: 'Mochi',           baseColor: 0xFFB6C1,       accentColor: 0xFFA0B0, detailColor: 0xFFFFFF, shape: 'dome' },
  'dorayaki':        { id: 'dorayaki',        name: 'Dorayaki',        baseColor: 0xC68B59,       accentColor: 0x8B4513, detailColor: 0x6E373B, shape: 'double_disc' },
  'takoyaki':        { id: 'takoyaki',        name: 'Takoyaki',        baseColor: 0xC68B59,       accentColor: 0x8B6914, detailColor: 0x2D5A3D, shape: 'boat' },
  'edamame':         { id: 'edamame',         name: 'Edamame',         baseColor: 0x7CB342,       accentColor: 0x558B2F, detailColor: 0x8BC34A, shape: 'pod' },
  'matcha_latte':    { id: 'matcha_latte',    name: 'Matcha Latte',    baseColor: KYOTO.matcha,    accentColor: KYOTO.cream, detailColor: 0xF5F5F5, shape: 'tall_cup' },
  'tamagoyaki':      { id: 'tamagoyaki',      name: 'Tamagoyaki',      baseColor: 0xFFD700,       accentColor: 0xFFC107, detailColor: 0xFFB300, shape: 'rectangle' },
  'wagashi':         { id: 'wagashi',         name: 'Wagashi',         baseColor: 0xD7BDE2,       accentColor: KYOTO.matcha, detailColor: 0x333333, shape: 'flower' },
  'kakigori':        { id: 'kakigori',        name: 'Kakigori',        baseColor: 0x87CEEB,       accentColor: 0x4A90D9, detailColor: 0xE74C3C, shape: 'mound' },
  'ichigo_daifuku':  { id: 'ichigo_daifuku',  name: 'Ichigo Daifuku',  baseColor: KYOTO.cream,     accentColor: 0xE74C3C, detailColor: 0x2D5A3D, shape: 'ball_stem' },
  'sakura_mochi':    { id: 'sakura_mochi',    name: 'Sakura Mochi',    baseColor: 0xFFB6C1,       accentColor: 0x2D5A3D, detailColor: 0xFFA0B0, shape: 'ball_leaf' },
  'inarizushi':      { id: 'inarizushi',      name: 'Inarizushi',      baseColor: 0xDAA520,       accentColor: KYOTO.cream, detailColor: 0xB8860B, shape: 'pouch' },
};


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

    const comboStep = Math.min(combo - 1, 7);
    const root = 392.0 * Math.pow(2, (comboStep * 2) / 12);

    [root, root * 1.5].forEach((freq, i) => {
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

  /** Relief-Fanfare: kurzes aufsteigendes Arpeggio beim Board-Wachstum.
   *  Kuerzer und trockener als playWin -- es feiert den Levelstart, nicht das Ende. */
  public playFanfare() {
    this.initOnGesture();
    this.vibrate([25, 40, 25, 40, 60]);
    if (!this.ctx || this.ctx.state === 'suspended') return;

    // Pentatonisch aufsteigend, passend zur Tonleiter der Match-Sounds.
    [523.25, 587.33, 698.46, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + i * 0.09;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);

      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.2, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);

      osc.connect(g);
      g.connect(this.ctx.destination);

      osc.start(t0);
      osc.stop(t0 + 0.6);
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
  UNDO_UPDATED: 'UNDO_UPDATED',
  SHUFFLE_TRIGGERED: 'SHUFFLE_TRIGGERED',
  /** Button-Tap auf den Extra-Shelf-Booster (GameScene spawnt das Regal). */
  EXTRA_SHELF_TRIGGERED: 'EXTRA_SHELF_TRIGGERED',
  /** Status-Sync nach Spawn oder Level-Neubau (UIScene graut den Button aus/zurueck). */
  EXTRA_SHELF_STATE: 'EXTRA_SHELF_STATE'
};

export interface MoveRecord {
  fromShelf: number;
  fromSlot: number;
  toShelf: number;
  toSlot: number;
  itemId: string;
}

// Fortschritt ueberlebt Reloads. Ein Web-Build wird staendig neu geladen --
// ohne das faengt der Spieler jedes Mal bei Level 1 an.
const LEVEL_STORAGE_KEY = 'kyoto_level';

function loadSavedLevel(): number {
  try {
    const raw = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    const lvl = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(lvl) ? Phaser.Math.Clamp(lvl, 1, LEVEL_COUNT) : 1;
  } catch {
    // Privater Modus / blockierter Storage: Fortschritt ist dann fluechtig.
    return 1;
  }
}

function saveLevel(level: number) {
  try {
    window.localStorage.setItem(LEVEL_STORAGE_KEY, String(level));
  } catch {
    /* siehe loadSavedLevel */
  }
}

export const State = {
  currentLevel: loadSavedLevel(),
  score: 0,
  moves: 22,
  initialMoves: 22,
  matchesMade: 0,
  targetMatches: 4,
  combo: 1,
  comboTimer: 0,
  /** true, sobald das Level gewonnen ist -- schliesst den Lose-Check aus. */
  won: false,
  /** Freie Undos im aktuellen Level; danach Rewarded-Ad-Aufladung (Empfehlung 2). */
  undoLeft: 3,
  /** Extra-Shelf-Booster: einmal pro Level (Empfehlung 5, ersetzt den Hammer). */
  extraShelfUsed: false,
  history: [] as MoveRecord[],
  reset(moves = 22, target = 4) {
    this.score = 0;
    this.moves = moves;
    this.initialMoves = moves;
    this.matchesMade = 0;
    this.targetMatches = target;
    this.combo = 1;
    this.comboTimer = 0;
    this.won = false;
    this.undoLeft = 3;
    this.extraShelfUsed = false;
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
    this.itemDef = ITEMS[itemId] || ITEMS['onigiri'];
    this.itemScale = itemScale;
    this.restY = restY;
    this.setSize(76 * itemScale, 76 * itemScale);
    this.renderArt();
    scene.add.existing(this);
  }

  private renderArt() {
    const s = this.itemScale;

    if (this.scene.textures.exists(`item_${this.itemId}`)) {
      const size = ITEM_SIZE * s;
      const img = this.scene.add.image(0, 0, `item_${this.itemId}`).setDisplaySize(size, size);
      this.add(img);
      return;
    }

    // Procedural CMF Vector Fallback
    const g = this.scene.add.graphics();
    const d = this.itemDef;

    g.fillStyle(d.baseColor, 1.0).fillRoundedRect(-32, -32, 64, 64, 14);
    g.fillStyle(d.accentColor, 1.0);

    if (d.shape === 'rounded_triangle') {
      g.fillTriangle(-16, 14, 0, -16, 16, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 6, 5);
    } else if (d.shape === 'flat_oval') {
      g.fillEllipse(0, 2, 30, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillEllipse(0, -4, 20, 8);
    } else if (d.shape === 'circle') {
      g.fillCircle(0, 0, 16);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 8);
    } else if (d.shape === 'cone') {
      g.fillTriangle(-14, 14, 0, -16, 14, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-2, -8, 4, 14);
    } else if (d.shape === 'crescent') {
      g.fillEllipse(0, 0, 28, 18);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-12, -2, 24, 4);
    } else if (d.shape === 'trapezoid') {
      g.fillRect(-14, -10, 28, 20);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, -6, 4);
    } else if (d.shape === 'stack') {
      g.fillCircle(0, -10, 8);
      g.fillStyle(d.baseColor, 1);
      g.fillCircle(0, 0, 8);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 10, 8);
    } else if (d.shape === 'skewer') {
      g.fillRect(-20, -3, 40, 6);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-24, -1, 4, 2);
    } else if (d.shape === 'bowl') {
      g.fillEllipse(0, 4, 30, 16);
      g.fillStyle(d.detailColor, 1);
      g.fillEllipse(0, -2, 20, 10);
    } else if (d.shape === 'dome') {
      g.fillCircle(0, 2, 16);
      g.fillRect(-16, 2, 32, 8);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, -4, 4);
    } else if (d.shape === 'double_disc') {
      g.fillCircle(0, -6, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 6, 14);
    } else if (d.shape === 'boat') {
      g.fillRoundedRect(-18, -6, 36, 16, 6);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(-6, 0, 4);
      g.fillCircle(6, 0, 4);
    } else if (d.shape === 'pod') {
      g.fillEllipse(0, 0, 28, 12);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(-6, 0, 4);
      g.fillCircle(6, 0, 4);
    } else if (d.shape === 'tall_cup') {
      g.fillRect(-10, -18, 20, 30);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-12, -20, 24, 4);
    } else if (d.shape === 'rectangle') {
      g.fillRect(-14, -12, 28, 24);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-10, -4, 20, 2);
      g.fillRect(-10, 2, 20, 2);
    } else if (d.shape === 'flower') {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillCircle(Math.cos(angle) * 10, Math.sin(angle) * 10, 7);
      }
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 5);
    } else if (d.shape === 'mound') {
      g.fillEllipse(0, 4, 28, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, -6, 4);
    } else if (d.shape === 'ball_stem') {
      g.fillCircle(0, 2, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-2, -14, 4, 10);
    } else if (d.shape === 'ball_leaf') {
      g.fillCircle(0, 2, 14);
      g.fillStyle(d.detailColor, 1);
      g.fillEllipse(10, -8, 10, 6);
    } else if (d.shape === 'pouch') {
      g.fillEllipse(0, 0, 24, 20);
      g.fillStyle(d.detailColor, 1);
      g.fillRect(-8, -12, 16, 4);
    } else {
      g.fillRoundedRect(-14, -14, 28, 28, 8);
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
  /** Gesperrte Slots nehmen kein Item auf, bis in dieser Reihe ein Match faellt. */
  public locked: boolean[] = [false, false, false];
  private ghosts: (Phaser.GameObjects.Image | Phaser.GameObjects.Graphics | null)[] = [null, null, null];
  private lockMarks: (Phaser.GameObjects.Graphics | null)[] = [null, null, null];
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

  constructor(scene: Phaser.Scene, x: number, y: number, shelfIdx: number, data: SlotDef[], itemScale = 1, shelfWidth = 304, boardless = false) {
    super(scene, x, y);
    this.shelfIdx = shelfIdx;
    this.itemScale = itemScale;
    this.spacing = Phaser.Math.Clamp(shelfWidth / 3, 78 * itemScale, 104 * itemScale);
    this.shelfWidth = shelfWidth;

    if (boardless) {
      this.shelfHeight = 0;
      this.platformY = 0;
    } else {
      this.shelfHeight = 92 * itemScale;
      this.platformY = 38 * itemScale;
    }

    this.hitTop = this.platformY - 82 * itemScale;
    this.hitBottom = boardless ? 20 * itemScale : this.shelfHeight / 2 + 6 * itemScale;

    if (!boardless) this.drawStructure();
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

    const g = this.scene.add.graphics();
    g.fillStyle(KYOTO.hinoki, 1.0).fillRoundedRect(-w / 2, -h / 2, w, h, 10 * s);
    [-this.spacing, 0, this.spacing].forEach(x => {
      g.fillStyle(KYOTO.slotIndent, 0.4).fillRoundedRect(x - 38 * s, -h / 2 + 8 * s, 76 * s, h - 16 * s, 8 * s);
    });
    g.fillStyle(KYOTO.kuroSteel, 1.0).fillRoundedRect(-w / 2 - 4 * s, h / 2 - 8 * s, w + 8 * s, 12 * s, 3 * s);
    g.fillStyle(KYOTO.brass, 1.0).fillCircle(-w / 2 + 6 * s, h / 2 - 2 * s, 2.5 * s).fillCircle(w / 2 - 6 * s, h / 2 - 2 * s, 2.5 * s);
    this.add(g);
  }

  private initSlots(data: SlotDef[]) {
    data.forEach((slot, i) => {
      this.queues[i] = [...slot.queue];
      this.locked[i] = slot.locked === true;
      if (this.locked[i]) this.drawLockMark(i);
      if (slot.front) {
        const restY = getItemRestY(slot.front, this.itemScale, this.platformY);
        const item = new GoodsItem(this.scene, (i - 1) * this.spacing, restY, slot.front, this.itemScale, restY);
        this.slots[i] = item;
        this.add(item);
      }
    });
    [0, 1, 2].forEach(i => this.updateGhost(i));
  }

  /** Naechstes Queue-Item als dunkle Silhouette hinter dem Front-Item --
   *  nimmt dem Spieler das Ratraten, was als naechstes nachrueckt. */
  public updateGhost(i: number) {
    this.ghosts[i]?.destroy();
    this.ghosts[i] = null;

    const nextId = this.queues[i][0];
    const front = this.slots[i];
    if (!nextId || !front) return;

    const s = this.itemScale;
    // An der Oberkante des Front-Items verankert, nicht an der Ruhehoehe des
    // naechsten Items: die Bottom-Offsets streuen von 12 bis 36 design px --
    // kleines Offset hinten plus grosses davor liesse die komplette
    // Silhouette hinter dem Front-Item verschwinden. So ragt der Ghost
    // garantiert ueber die Frontkante hinaus und schaut nur unten knapp
    // dahinter hervor.
    const ghostSize = ITEM_SIZE * s * 0.8;
    const x = (i - 1) * this.spacing;
    const y = front.restY - ITEM_SIZE * s * 0.45 - ghostSize * 0.3;

    let ghost: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
    if (this.scene.textures.exists(`item_${nextId}`)) {
      ghost = this.scene.add.image(x, y, `item_${nextId}`)
        .setDisplaySize(ghostSize, ghostSize)
        .setTint(0x2A2622)
        .setAlpha(0.25);
    } else {
      // Procedural-Fallback: dunkle Konturbox in Grundfarbe des Items
      const g = this.scene.add.graphics();
      g.fillStyle(ITEMS[nextId].baseColor, 1)
        .fillRoundedRect(-32 * s, -32 * s, 64 * s, 64 * s, 14 * s);
      g.setPosition(x, y).setScale(0.8).setAlpha(0.25);
      ghost = g;
    }

    // Hinter die Front-Items, aber VOR der Regal-Struktur (Shadow/Brett
    // liegen bei addAt(0) unter dem Ghost und wuerden ihn verdecken).
    const firstItemIdx = this.list.findIndex(child => child instanceof GoodsItem);
    if (firstItemIdx === -1) this.add(ghost);
    else this.addAt(ghost, firstItemIdx);
    this.ghosts[i] = ghost;
  }

  /** Siegel ueber dem gesperrten Slot: dunkle Platte mit Messing-Kette.
   *  Procedural gezeichnet -- die Kawaii-Flat-Pipeline kennt kein Blocker-Asset. */
  private drawLockMark(i: number) {
    const s = this.itemScale;
    const x = (i - 1) * this.spacing;
    const y = this.platformY - 30 * s;

    const g = this.scene.add.graphics();
    g.fillStyle(KYOTO.kuroSteel, 0.82).fillRoundedRect(-26 * s, -26 * s, 52 * s, 52 * s, 12 * s);
    g.lineStyle(2.5 * s, KYOTO.brass, 0.9).strokeRoundedRect(-26 * s, -26 * s, 52 * s, 52 * s, 12 * s);
    // Buegel und Korpus eines Schlosses
    g.lineStyle(3 * s, KYOTO.brass, 1).beginPath();
    g.arc(0, -4 * s, 8 * s, Math.PI, 0);
    g.strokePath();
    g.fillStyle(KYOTO.brass, 1).fillRoundedRect(-10 * s, -4 * s, 20 * s, 16 * s, 3 * s);
    g.fillStyle(KYOTO.kuroSteel, 1).fillCircle(0, 3 * s, 2.5 * s);
    g.setPosition(x, y);

    this.add(g);
    this.lockMarks[i] = g;
  }

  /** Ein Match in dieser Reihe loest alle ihre Sperren. */
  public unlockRow() {
    this.locked.forEach((isLocked, i) => {
      if (!isLocked) return;
      this.locked[i] = false;

      const mark = this.lockMarks[i];
      this.lockMarks[i] = null;
      if (!mark) return;

      this.scene.tweens.add({
        targets: mark,
        scale: 1.7,
        alpha: 0,
        duration: 320,
        ease: 'Back.easeIn',
        onComplete: () => mark.destroy()
      });
    });
  }

  public getFirstEmptySlot(): number {
    return this.slots.findIndex((s, i) => s === null && !this.locked[i]);
  }

  public insertItem(i: number, item: GoodsItem, fromWorld?: { x: number; y: number }): boolean {
    if (this.slots[i] !== null || this.locked[i]) return false;
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
      this.updateGhost(i);
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
      this.updateGhost(i);
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
                if (idx === 0) {
                  [0, 1, 2].forEach(i => this.advanceQueue(i));
                  [0, 1, 2].forEach(i => this.updateGhost(i));
                }
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
    const loadOptional = (key: string) => {
      if (AVAILABLE_ASSETS.has(key)) this.load.image(key, `assets/items/${key}.${ASSET_EXT}`);
    };

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[assets] konnte ${file.key} nicht laden`);
    });

    // 1. Food-Items
    Object.keys(ITEMS).forEach(id => {
      if (AVAILABLE_ASSETS.has(id)) this.load.image(`item_${id}`, `assets/items/${id}.${ASSET_EXT}`);
    });

    // 2. Hintergrund-Szenen (bgl_kitchen, bgl_yatai, bgl_konbini)
    LEVEL_BG_KEYS.forEach(key => loadOptional(key));

    // 3. UI, Buttons, FX
    this.load.image('fx_match_burst', `assets/items/fx_match_burst.${ASSET_EXT}`);
    this.load.image('ui_card_kuro', `assets/items/ui_card_kuro.${ASSET_EXT}`);
    this.load.image('ui_card_hinoki', `assets/items/ui_card_hinoki.${ASSET_EXT}`);
    this.load.image('btn_undo', `assets/items/btn_undo.${ASSET_EXT}`);
    this.load.image('btn_shuffle', `assets/items/btn_shuffle.${ASSET_EXT}`);
    // btn_extra_shelf ist noch nicht gerendert (Reve) -- optional laden, der
    // UIScene-Procedural-Fallback springt solange ein.
    loadOptional('btn_extra_shelf');
    // Bento-Meta (Session 8): Box und Dekos optional -- bis die Reve-Renders
    // vorliegen, zeichnen WinModal und BentoScene Procedural-Platzhalter.
    loadOptional('bento_box');
    DECO_IDS.forEach(id => loadOptional(id));
    this.load.image('ui_star', `assets/items/ui_star.${ASSET_EXT}`);
    this.load.image('ui_star_empty', `assets/items/ui_star_empty.${ASSET_EXT}`);
  }

  create() {
    // Mip-Bleed-Gegenmassnahme, bevor irgendetwas gerendert hat (siehe
    // scrubTransparentRGB) -- danach erst die Szenen starten.
    this.textures.getTextureKeys().forEach(key => this.scrubTransparentRGB(key));

    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }

  /** Lossy WebP dekodiert unter voll transparenten Pixeln beliebiges Rest-RGB
   *  mit zurueck -- die Farbebenen werden unabhaengig vom Alpha komprimiert,
   *  ein Nullen vor dem Encoden ueberlebt den Codec nicht. Beim GPU-Mipmap-
   *  Aufbau (LINEAR_MIPMAP_LINEAR seit dem POT-Umstieg) mittelt der Treiber
   *  diese Reste beim Heruntersamplen in die Silhouettenkante und malt genau
   *  die schmalen grauen Striche um die Items, die im Render nie existierten.
   *  Deshalb zieht diese Funktion jede Textur nach dem Laden einmal ueber eine
   *  Canvas und nullt das RGB unter a=0 -- bevor der erste GL-Upload passiert. */
  private scrubTransparentRGB(key: string) {
    const tex = this.textures.get(key);
    const img = tex.getSourceImage();
    if (!(img instanceof HTMLImageElement) || !img.complete || !img.naturalWidth) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const frame = ctx.getImageData(0, 0, w, h);
    const d = frame.data;
    let touched = false;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0 && (d[i] !== 0 || d[i + 1] !== 0 || d[i + 2] !== 0)) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        touched = true;
      }
    }
    if (!touched) return;

    ctx.putImageData(frame, 0, 0);
    this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }
}

// ==========================================
// 4a. GRID MANAGER
// ==========================================
/** Kapselt die Grid-Geometrie (Reihenpositionen, Skalierung, Hintergrund-Key)
 *  und den Bau der Shelves. GameScene und der Hit-Test in onPointerDown
 *  kennen nur noch diese API, keine eigene Layout-Arithmetik mehr. */
export class GridManager {
  private readonly scene: Phaser.Scene;
  private readonly level: LevelDefinition;
  public readonly itemScale: number;
  public readonly shelfWidth: number;
  private readonly gridTop: number;
  private readonly shelfSpacing: number;
  private readonly startY: number;
  private readonly extraShelfY: number;

  constructor(scene: Phaser.Scene, level: LevelDefinition) {
    this.scene = scene;
    this.level = level;

    const { width, height } = scene.scale;
    // Lesbarkeitsgrenze: unter 0.85 versanden die Items (Silhouetten-Regel,
    // CLAUDE.md Abschnitt 3) -- bei 6 Reihen auf kleinen Screens relevant.
    this.itemScale = Math.max(getLayoutScale(width), 0.85);
    this.shelfWidth = Math.round(width * 0.78);

    const rows = level.layout.length;
    this.gridTop = 100 * this.itemScale;
    // 136 statt 100: unter dem Grid bleibt ein Streifen fuer den Extra-Shelf-
    // Booster reserviert, ohne dass die letzte Reihe sichtbar zusammenrueckt.
    const gridBottom = height - 136 * this.itemScale;
    this.shelfSpacing = (gridBottom - this.gridTop) / rows;
    this.startY = this.gridTop + this.shelfSpacing * 0.5;
    this.extraShelfY = gridBottom + 36 * this.itemScale;
  }

  getRowY(row: number): number {
    return this.startY + row * this.shelfSpacing;
  }

  getRowWidth(): number {
    return this.shelfWidth;
  }

  getItemScale(): number {
    return this.itemScale;
  }

  /** Y-Position des Extra-Shelf-Boosters: zwischen letzter Reihe und Booster-Tray. */
  getExtraShelfY(): number {
    return this.extraShelfY;
  }

  getBgKey(): string | undefined {
    return getLevelBgKey(State.currentLevel);
  }

  /** Baut alle Shelves des Levels an ihren Grid-Positionen. */
  buildAll(): Shelf[] {
    const { width } = this.scene.scale;
    return this.level.layout.map((data, i) =>
      new Shelf(this.scene, width / 2, this.getRowY(i), i, data, this.itemScale, this.shelfWidth, true)
    );
  }

  /** Findet das Shelf unter einem Pointer-Weltkoordinatenpaar, falls vorhanden. */
  shelfAt(shelves: Shelf[], x: number, y: number): Shelf | undefined {
    return shelves.find(shelf => {
      const halfW = shelf.shelfWidth / 2;
      return x >= shelf.x - halfW && x <= shelf.x + halfW &&
        y >= shelf.y + shelf.hitTop && y <= shelf.y + shelf.hitBottom;
    });
  }

  /** Ermittelt den Slot-Index (0-2) innerhalb eines Shelves aus Welt-X. */
  slotAt(shelf: Shelf, x: number): number {
    const localX = x - shelf.x;
    return localX < -shelf.spacing / 2 ? 0 : localX > shelf.spacing / 2 ? 2 : 1;
  }
}

export class GameScene extends Phaser.Scene {
  private grid!: GridManager;
  private shelves: Shelf[] = [];
  private selected: { shelfIdx: number; slotIdx: number; item: GoodsItem } | null = null;
  private loseCheckTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    const uiScale = getLayoutScale(width);
    this.shelves = [];
    this.selected = null;

    // Hintergrund-Szene je Level-Gruppe (cover-skaliert)
    const bgKey = getLevelBgKey(State.currentLevel);
    if (bgKey && this.textures.exists(bgKey)) {
      const src = this.textures.get(bgKey).getSourceImage();
      const k = Math.max(width / src.width, height / src.height);
      this.add.image(width / 2, height / 2, bgKey).setScale(k).setDepth(-10);
    } else {
      // Fallback: sanfter Farbverlauf
      const bg = this.add.graphics().setDepth(-10);
      bg.fillGradientStyle(0xF3EFEA, 0xF3EFEA, 0xE8E0D4, 0xE8E0D4, 1);
      bg.fillRect(0, 0, width, height);
    }

    // Halbtransparentes Overlay im Grid-Bereich fuer Item-Lesbarkeit
    const overlay = this.add.graphics().setDepth(-5);
    overlay.fillStyle(0xFDFBF7, 0.28);
    overlay.fillRect(0, 80 * uiScale, width, height - 160 * uiScale);

    this.buildLevel(State.currentLevel);

    // Retry/Nachfolger-Level: Button-Zustand des Boosters neu synchronisieren.
    this.game.events.emit(GameEvents.EXTRA_SHELF_STATE);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.events.on(GameEvents.TRIPLE_MATCHED, this.onMatched, this);

    this.game.events.on(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
    this.game.events.on(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);
    this.game.events.on(GameEvents.EXTRA_SHELF_TRIGGERED, this.spawnExtraShelf, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onPointerDown, this);
      this.game.events.off(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
      this.game.events.off(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);
      this.game.events.off(GameEvents.EXTRA_SHELF_TRIGGERED, this.spawnExtraShelf, this);
    });
  }

  private buildLevel(lvl: number) {
    const level = generateLevel(lvl - 1, Object.keys(ITEMS));
    State.reset(level.moves, level.targetMatches);

    this.grid = new GridManager(this, level);
    this.shelves = this.grid.buildAll();

    // Board-Wachstum feiern (Befund 8): nach einer Wall bekommt der Spieler
    // mehr Platz -- das darf man sehen und hoeren, sonst verpufft die Entlastung.
    const prevRows = LEVEL_PARAMS[lvl - 2]?.rows ?? 0;
    if (level.relief && level.layout.length > prevRows) this.playReliefIntro();
  }

  /** Extra-Shelf-Booster (Empfehlung 5, ersetzt den Hammer): ein leeres
   *  Zusatzregal fuer den Rest des Levels. Einmal pro Level, danach graut
   *  der Button aus. Das Regal haengt regulär in this.shelves -- Hit-Test,
   *  Undo-History und der allClear-Check laufen unverändert mit. */
  private spawnExtraShelf() {
    if (State.extraShelfUsed) return;
    State.extraShelfUsed = true;

    const { width } = this.scale;
    const emptyLayout: SlotDef[] = [
      { front: null, queue: [] },
      { front: null, queue: [] },
      { front: null, queue: [] }
    ];
    const shelf = new Shelf(
      this, width / 2, this.grid.getExtraShelfY(), this.shelves.length,
      emptyLayout, this.grid.getItemScale(), this.grid.getRowWidth(), true
    );

    // Kurzer Auftritt, damit der neue Spielfeld-Streifen nicht unbemerkt bleibt.
    shelf.setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: shelf, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });

    this.shelves.push(shelf);
    this.game.events.emit(GameEvents.EXTRA_SHELF_STATE);
  }

  private playReliefIntro() {
    ZenAudio.playFanfare();

    const drop = 40 * this.grid.getItemScale();
    this.shelves.forEach((shelf, i) => {
      const restY = shelf.y;
      shelf.setY(restY - drop).setAlpha(0);
      this.tweens.add({
        targets: shelf,
        y: restY,
        alpha: 1,
        duration: 300,
        delay: i * 90,
        ease: 'Back.easeOut'
      });
    });
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    ZenAudio.playTap();

    // Mathematisch isolierte Hitbox-Prüfung
    const shelf = this.grid.shelfAt(this.shelves, p.x, p.y);
    if (shelf) {
      const i = this.shelves.indexOf(shelf);
      const slotIdx = this.grid.slotAt(shelf, p.x);

      {
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
              this.scheduleLoseCheck();
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

  private onMatched({ shelfIdx, worldX, worldY }: { shelfIdx: number; worldX: number; worldY: number }) {
    State.matchesMade++;
    this.unlockNear(shelfIdx);
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
    // Ein Level ist erst gewonnen, wenn wirklich ALLES vom Brett ist -- nicht,
    // sobald ein Match-Zaehler die Zielmarke erreicht hat. Beim intakten
    // Generator (genau targetMatches-Tripletts platziert) sind beide
    // Bedingungen identisch; der Zaehler driftet aber bei kuenftigen Features
    // (Booster, Blocker-Sonderfaelle), das Brett selbst luegt nie.
    if (allClear) {
      State.won = true;
      ZenAudio.playWin();
      // Bento-Journal: nur Meilenstein-Siege (L5/10/.../30) vergeben eine Deko
      // und schalten die Box frei. Das Ergebnis wandert per Launch-Data ins
      // WinModal (dasselbe Muster wie requestRewardedAd).
      const award = registerWin(State.currentLevel);
      this.time.delayedCall(500, () => {
        this.scene.pause();
        this.scene.launch('WinModalScene', { award });
      });
      return;
    }

    // Ein Match bei 0 Restzuegen kann in der Queue noch ein Kettenmatch
    // ausloesen. Jedes Match schiebt den Lose-Check daher erneut nach hinten:
    // eine Match-Kette braucht pro Glied max. ~530 ms, das Fenster ist 650 ms.
    if (State.moves <= 0) this.scheduleLoseCheck();
  }

  /** Ein Match loest die Sperren der eigenen und der direkt benachbarten Reihe.
   *  Die Reihe des Blockers allein kann sich nicht befreien: ein Match braucht
   *  drei besetzte Front-Slots, ein gesperrter Slot ist aber immer leer. Die
   *  Nachbarreihen sind daher der einzige Weg, der immer offen steht. */
  private unlockNear(shelfIdx: number) {
    [shelfIdx - 1, shelfIdx, shelfIdx + 1].forEach(i => this.shelves[i]?.unlockRow());
  }

  /** Verzoerter Fail-State-Check: laufende Match-Tweens (Wurfparabel,
   *  Queue-Nachruecken) feuern erst nach bis zu ~700 ms -- ein sofortiger
   *  Check wuerde den letzten Zug zu Unrecht als verlorenen werten. */
  private scheduleLoseCheck() {
    if (State.won) return;
    this.loseCheckTimer?.remove(false);
    this.loseCheckTimer = this.time.delayedCall(650, () => {
      const allClear = this.shelves.every(s => s.slots.every(slot => slot === null) && s.queues.every(q => q.length === 0));
      if (!State.won && State.moves <= 0 && !allClear) {
        this.scene.pause();
        this.scene.launch('LoseModalScene');
      }
    });
  }

  private onUndo() {
    // Undo-Oekonomie: 3 freie Undos pro Level, danach Aufladung per Rewarded Ad.
    // Kein direktes Undo mehr -- der Reward gewaehrt genau 1 weitere Nutzung.
    if (State.undoLeft <= 0) {
      requestRewardedAd(this, () => {
        State.undoLeft = 1;
        this.game.events.emit(GameEvents.UNDO_UPDATED);
      });
      return;
    }

    const last = State.history.pop();
    if (!last) return;

    State.undoLeft--;
    this.game.events.emit(GameEvents.UNDO_UPDATED);

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
        if (active.length > 0 && s.slots[i] === null && !s.locked[i]) {
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

/** Deko-Anzeige fuer Bento-Journal und BentoScene: Textur falls geladen,
 *  sonst Procedural-Platzhalter -- RoundedRect in Grundfarbe mit Kawaii-
 *  Mini-Face (zwei Punktaugen, Laechelbogen). Der Container liegt bei (0,0),
 *  Positionierung und Parent uebernimmt der Aufrufer. */
function makeDecoView(scene: Phaser.Scene, decoId: string, size: number): Phaser.GameObjects.Container {
  const view = scene.add.container(0, 0);

  if (scene.textures.exists(decoId)) {
    view.add(scene.add.image(0, 0, decoId).setDisplaySize(size, size));
    return view;
  }

  const u = size / 48;
  const def = DECOS[decoId];
  const g = scene.add.graphics();
  g.fillStyle(def ? def.baseColor : KYOTO.hinoki, 1)
    .fillRoundedRect(-24 * u, -24 * u, 48 * u, 48 * u, 12 * u);
  if (def) {
    g.lineStyle(2 * u, def.accentColor, 1).strokeRoundedRect(-24 * u, -24 * u, 48 * u, 48 * u, 12 * u);
  }
  // Kawaii-Mini-Face: zwei Punktaugen und ein Laechelbogen.
  g.fillStyle(KYOTO.kuroSteel, 1);
  g.fillCircle(-8 * u, -4 * u, 2.6 * u);
  g.fillCircle(8 * u, -4 * u, 2.6 * u);
  g.lineStyle(2 * u, KYOTO.kuroSteel, 1).beginPath();
  g.arc(0, 2 * u, 7 * u, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
  g.strokePath();
  view.add(g);
  return view;
}

export class UIScene extends Phaser.Scene {
  private scoreTxt!: Phaser.GameObjects.Text;
  private movesTxt!: Phaser.GameObjects.Text;
  private extraShelfBtn: Phaser.GameObjects.Container | null = null;
  private undoBadge: Phaser.GameObjects.Text | null = null;

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
    const teaValue = stack(width / 2, 'TEA BAR', `${State.currentLevel}`);
    this.movesTxt = stack(width - pad - colW / 2, 'MOVES', `${State.moves}`);

    // Bento-Einstieg (Session 8): der TEA-BAR-Stack ist tappable. Eine
    // unsichtbare Zone ueber dem Stack statt Interactive-Texts -- Texte mit
    // Schatten-Halo haben unvorhersehbare Hitbox-Groessen.
    const bentoZone = this.add.zone(
      width / 2,
      (labelY + valueY) / 2,
      colW * 1.35,
      (valueY - labelY) + 34 * uiScale
    ).setInteractive({ useHandCursor: true });
    bentoZone.on('pointerdown', () => {
      this.tweens.add({ targets: [teaValue], scale: 1.15, yoyo: true, duration: 90 });
      this.scene.pause('GameScene');
      this.scene.launch('BentoScene');
    });

    // Kleines Bento-Glyph rechts neben dem Label als Entdeckbarkeits-Hinweis.
    const glyph = this.add.graphics();
    const gs = uiScale;
    glyph.fillStyle(KYOTO.kuroSteel, 0.85).fillRoundedRect(-9 * gs, -7 * gs, 18 * gs, 14 * gs, 3 * gs);
    glyph.lineStyle(1.5 * gs, KYOTO.brass, 1).strokeRoundedRect(-9 * gs, -7 * gs, 18 * gs, 14 * gs, 3 * gs);
    glyph.lineStyle(1.5 * gs, KYOTO.brass, 1).lineBetween(0, -7 * gs, 0, 7 * gs);
    glyph.setPosition(width / 2 + colW * 0.72, labelY);
    this.tweens.add({
      targets: glyph,
      alpha: 0.5,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Booster-Reihe, ebenfalls ohne Tray-Karte
    const boosterSize = 52 * uiScale;
    const boosterSpacing = 112 * uiScale;
    const trayX = width / 2;
    const trayY = height - 46 * uiScale;

    const boosters = [
      { key: 'btn_undo', label: 'UNDO', fn: () => this.game.events.emit(GameEvents.UNDO_TRIGGERED) },
      { key: 'btn_shuffle', label: 'SHUFFLE', fn: () => this.game.events.emit(GameEvents.SHUFFLE_TRIGGERED) },
      { key: 'btn_extra_shelf', label: 'SHELF', fn: () => this.game.events.emit(GameEvents.EXTRA_SHELF_TRIGGERED) }
    ];

    boosters.forEach((b, idx) => {
      const btn = this.add.container(trayX + (idx - 1) * boosterSpacing, trayY);
      if (b.key === 'btn_extra_shelf') this.extraShelfBtn = btn;

      if (this.textures.exists(b.key)) {
        const sprite = this.add.image(0, 0, b.key).setDisplaySize(boosterSize, boosterSize);
        btn.add(sprite);
      } else if (b.key === 'btn_extra_shelf') {
        // Procedural-Fallback bis der Reve-Render von btn_extra_shelf vorliegt:
        // runder Cream-Button mit gezeichnetem Regal-Icon (zwei Faecher).
        const s = uiScale;
        const g = this.add.graphics();
        g.fillStyle(KYOTO.cream, 1).fillCircle(0, 0, 27 * s);
        g.lineStyle(2 * s, KYOTO.hinoki, 0.85).strokeCircle(0, 0, 27 * s);
        g.lineStyle(2.5 * s, KYOTO.hinoki, 1);
        g.lineBetween(-13 * s, -14 * s, -13 * s, 8 * s);
        g.lineBetween(13 * s, -14 * s, 13 * s, 8 * s);
        g.lineBetween(-13 * s, -4 * s, 13 * s, -4 * s);
        g.lineBetween(-13 * s, 8 * s, 13 * s, 8 * s);
        g.fillStyle(KYOTO.toastGold, 1);
        g.fillCircle(-6 * s, -9 * s, 3.5 * s);
        g.fillCircle(4 * s, -9 * s, 3.5 * s);
        g.fillCircle(0, 2 * s, 3.5 * s);
        btn.add(g);
      } else {
        const bg = this.add.graphics().fillStyle(KYOTO.kuroSteel, 0.9).fillRoundedRect(-32 * uiScale, -22 * uiScale, 64 * uiScale, 44 * uiScale, 10 * uiScale);
        const txt = this.add.text(0, 0, b.label, valueStyle(10 * uiScale, '#FDFBF7')).setOrigin(0.5);
        btn.add([bg, txt]);
      }

      // Undo-Restkonto als Badge oben rechts. Zeigt auch die 0 nach der
      // dritten Nutzung -- der naechste Tap fuert in den Ad-Flow.
      if (b.label === 'UNDO') {
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(KYOTO.azuki, 1).fillCircle(17 * uiScale, -17 * uiScale, 11 * uiScale);
        badgeBg.lineStyle(1.5 * uiScale, KYOTO.cream, 0.9).strokeCircle(17 * uiScale, -17 * uiScale, 11 * uiScale);
        btn.add(badgeBg);
        this.undoBadge = this.add.text(17 * uiScale, -17 * uiScale, `${State.undoLeft}`, valueStyle(12 * uiScale, '#FFFFFF')).setOrigin(0.5);
        btn.add(this.undoBadge);
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

    const updateUndoBadge = () => {
      this.undoBadge?.setText(`${State.undoLeft}`);
    };

    // Extra-Shelf-Button spiegelt den Level-Zustand: nach Einsatz grau und
    // taub, nach Retry bzw. Nachfolger-Level wieder aktiv.
    const applyExtraShelfState = () => {
      const btn = this.extraShelfBtn;
      if (!btn) return;
      if (State.extraShelfUsed) {
        btn.setAlpha(0.35).disableInteractive();
      } else {
        btn.setAlpha(1).setInteractive({ useHandCursor: true });
      }
    };

    this.game.events.on(GameEvents.MOVE_EXECUTED, onMove);
    this.game.events.on(GameEvents.SCORE_UPDATED, onScore);
    this.game.events.on(GameEvents.UNDO_UPDATED, updateUndoBadge);
    this.game.events.on(GameEvents.EXTRA_SHELF_STATE, applyExtraShelfState);
    applyExtraShelfState();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.MOVE_EXECUTED, onMove);
      this.game.events.off(GameEvents.SCORE_UPDATED, onScore);
      this.game.events.off(GameEvents.UNDO_UPDATED, updateUndoBadge);
      this.game.events.off(GameEvents.EXTRA_SHELF_STATE, applyExtraShelfState);
    });
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

    // Bento-Journal (Session 8): Meilenstein-Siege reichen ihre Award-Deko per
    // Launch-Data herein; alle anderen Siege zeigen die Karte ohne Reveal-Zeile.
    const data = this.scene.settings.data as { award?: BentoAward } | undefined;
    const award = data?.award ?? null;

    const card = this.add.container(width / 2, height / 2);
    const cardW = 280 * s;
    // Mit Deko-Reveal waechst die Karte nach unten -- Titel/Sterne/Score
    // ruecken nach oben, der Button weiter nach unten.
    const cardH = award ? 330 * s : 260 * s;
    const bg = this.add.graphics().fillStyle(KYOTO.cream, 1).fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);
    bg.lineStyle(2 * s, KYOTO.hinoki, 0.7).strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);

    const boss = isBossLevel(State.currentLevel);
    const titleText = boss ? 'BENTO UNLOCKED!' : `TEA BAR ${State.currentLevel} CLEARED`;
    const yTitle = (award ? -120 : -85) * s;
    const title = this.add.text(0, yTitle, titleText, valueStyle(18 * s, boss ? '#4A6B47' : '#1E2022')).setOrigin(0.5);

    // 3-Sterne Bewertung
    const movesRatio = State.moves / State.initialMoves;
    const starCount = movesRatio >= 0.5 ? 3 : movesRatio >= 0.2 ? 2 : 1;
    const yStars = (award ? -75 : -40) * s;

    [-40, 0, 40].forEach((xOffset, idx) => {
      const hasStar = idx < starCount;
      const key = hasStar ? 'ui_star' : 'ui_star_empty';

      if (this.textures.exists(key)) {
        const star = this.add.image(xOffset * s, yStars, key).setDisplaySize(32 * s, 32 * s);
        card.add(star);
      } else {
        const g = this.add.graphics().fillStyle(hasStar ? KYOTO.brass : 0xCCCCCC, 1).fillCircle(xOffset * s, yStars, 12 * s);
        card.add(g);
      }
    });

    const yScoreLabel = (award ? -36 : -6) * s;
    const yScore = (award ? -16 : 14) * s;
    const scoreLabel = this.add.text(0, yScoreLabel, 'SCORE', labelStyle(10 * s, '#8C7A5E')).setOrigin(0.5);
    const score = this.add.text(0, yScore, `${State.score}`, valueStyle(24 * s, '#4A6B47')).setOrigin(0.5);

    let decoView: Phaser.GameObjects.Container | null = null;
    let decoTxt: Phaser.GameObjects.Text | null = null;
    if (award) {
      decoView = makeDecoView(this, award.decoId, 46 * s).setPosition(0, 34 * s);
      decoTxt = this.add.text(0, 68 * s, 'NEUE DEKO!', valueStyle(13 * s, '#4A6B47')).setOrigin(0.5);
    }

    const yBtn = (award ? 118 : 65) * s;
    const btn = this.add.container(0, yBtn);
    const btnBg = this.add.graphics().fillStyle(KYOTO.matcha, 1).fillRoundedRect(-65 * s, -20 * s, 130 * s, 40 * s, 10 * s);
    const btnTxt = this.add.text(0, 0, boss ? 'PLAY AGAIN' : 'NEXT BAR', valueStyle(14 * s, '#FFFFFF')).setOrigin(0.5);

    btn.add([btnBg, btnTxt]).setSize(130 * s, 40 * s).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      const wasBoss = isBossLevel(State.currentLevel);
      State.currentLevel = State.currentLevel >= LEVEL_COUNT ? 1 : State.currentLevel + 1;
      saveLevel(State.currentLevel);
      this.scene.stop('WinModalScene');
      this.scene.get('GameScene').scene.restart();
      // Boss-Abschluss poppt die Sammlung automatisch auf -- das frische
      // Level 1 liegt pausiert darunter und laeuft beim Schliessen weiter.
      if (wasBoss) this.scene.launch('BentoScene');
    });

    const children: Phaser.GameObjects.GameObject[] = [bg, title, scoreLabel, score];
    if (decoView && decoTxt) children.push(decoView, decoTxt);
    children.push(btn);
    card.add(children).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }
}

// ==========================================
// 5b. REWARDED AD STUB & LOSE MODAL
// ==========================================
/** Rewarded Ads laufen zunaechst als Stub. Ein spaeterer AdMob-Umbau
 *  betrifft ausschliesslich diese eine Funktion -- alle Aufrufer bleiben unberuehrt. */
export function requestRewardedAd(scene: Phaser.Scene, onReward: () => void) {
  scene.scene.launch('AdStubScene', { onReward });
}

export class AdStubScene extends Phaser.Scene {
  constructor() {
    super('AdStubScene');
  }

  create() {
    const { width, height } = this.scale;
    const s = getLayoutScale(width);
    const data = this.scene.settings.data as { onReward?: () => void } | undefined;
    const onReward = data?.onReward ?? (() => {});

    this.add.graphics().fillStyle(KYOTO.kuroSteel, 0.94).fillRect(0, 0, width, height);

    // Interaktive Vollbild-Zone schluckt jeden Tap auf dem Overlay.
    // Szenen-Listener darunter sind ohnehin stillgestellt: LoseModal pausiert
    // GameScene, bevor der Stub startet.
    this.add.zone(width / 2, height / 2, width, height)
      .setInteractive()
      .on('pointerdown', () => { /* bewusst geschluckt */ });

    const DURATION = 1200;
    const card = this.add.container(width / 2, height / 2);

    const box = this.add.graphics();
    box.fillStyle(0x2A2D30, 1).fillRoundedRect(-110 * s, -70 * s, 220 * s, 140 * s, 16 * s);
    box.lineStyle(2 * s, KYOTO.brass, 0.9).strokeRoundedRect(-110 * s, -70 * s, 220 * s, 140 * s, 16 * s);

    const title = this.add.text(0, -38 * s, 'AD (STUB)', valueStyle(20 * s, '#FDFBF7')).setOrigin(0.5);
    const sub = this.add.text(0, -8 * s, 'REWARD IN', labelStyle(11 * s, '#C49A5A')).setOrigin(0.5);
    const countdown = this.add.text(0, 22 * s, `${(DURATION / 1000).toFixed(1)}s`, valueStyle(24 * s, '#FDFBF7')).setOrigin(0.5);

    card.add([box, title, sub, countdown]).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 200, ease: 'Back.easeOut' });

    const startedAt = this.time.now;
    this.time.addEvent({
      delay: 50,
      repeat: Math.ceil(DURATION / 50),
      callback: () => {
        const left = Math.max(0, DURATION - (this.time.now - startedAt));
        countdown.setText(`${(left / 1000).toFixed(1)}s`);
      }
    });

    this.time.delayedCall(DURATION + 200, () => {
      this.scene.stop();
      onReward();
    });
  }
}

export class LoseModalScene extends Phaser.Scene {
  constructor() {
    super('LoseModalScene');
  }

  create() {
    const { width, height } = this.scale;
    const s = getLayoutScale(width);
    this.add.graphics().fillStyle(0x000000, 0.45).fillRect(0, 0, width, height);

    const card = this.add.container(width / 2, height / 2);
    const cardW = 280 * s;
    const cardH = 260 * s;
    const bg = this.add.graphics().fillStyle(KYOTO.cream, 1).fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);
    bg.lineStyle(2 * s, KYOTO.hinoki, 0.7).strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16 * s);

    const title = this.add.text(0, -85 * s, 'OUT OF MOVES', valueStyle(18 * s, '#6E373B')).setOrigin(0.5);
    const progress = this.add.text(0, -52 * s, `${State.matchesMade}/${State.targetMatches} MATCHES`, labelStyle(11 * s, '#8C7A5E')).setOrigin(0.5);

    const adBtn = this.makeButton(0, 8 * s, '+5 MOVES (AD)', KYOTO.toastGold, () => {
      requestRewardedAd(this, () => {
        State.moves += 5;
        this.scene.stop();
        this.scene.resume('GameScene');
        this.game.events.emit(GameEvents.MOVE_EXECUTED, State.moves);
      });
    });

    const retryBtn = this.makeButton(0, 68 * s, 'RETRY', KYOTO.matcha, () => {
      saveLevel(State.currentLevel);
      this.scene.stop();
      this.scene.get('GameScene').scene.restart();
    });

    card.add([bg, title, progress, adBtn, retryBtn]).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 250, ease: 'Back.easeOut' });
  }

  private makeButton(x: number, y: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const s = getLayoutScale(this.scale.width);
    const btn = this.add.container(x, y);
    const bg = this.add.graphics().fillStyle(color, 1).fillRoundedRect(-95 * s, -20 * s, 190 * s, 40 * s, 10 * s);
    const txt = this.add.text(0, 0, label, valueStyle(14 * s, '#FFFFFF')).setOrigin(0.5);
    btn.add([bg, txt]).setSize(190 * s, 40 * s).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', onClick);
    return btn;
  }
}

// ==========================================
// 5c. BENTO COLLECTION (SESSION 8)
// ==========================================
/** Sammel-Ansicht ueber 6 Bento-Boxen (Meilenstein-Level 5/10/.../30).
 *  Overlay wie die Modals: pausiert GameScene beim Oeffnen, Freigabe passiert
 *  gebuendelt im SHUTDOWN-Handler -- egal ob Close-X oder Aussentap.
 *  Texturen bento_box/deco_* laden optional; bis die Reve-Renders vorliegen,
 *  zeichnen Lackbox, Faecher und Kawaii-Mini-Faces procedural. */
export class BentoScene extends Phaser.Scene {
  private pageIndex = 0;
  private pages: Phaser.GameObjects.Container[] = [];
  private dots: Phaser.GameObjects.Arc[] = [];
  private pageStep = 0;
  private sliding = false;

  constructor() {
    super('BentoScene');
  }

  create() {
    const { width, height } = this.scale;
    const s = getLayoutScale(width);
    this.pageIndex = 0;
    this.pages = [];
    this.dots = [];
    this.sliding = false;

    this.scene.pause('GameScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.resume('GameScene'));

    const state = loadBento();

    // Dim + interaktive Vollbild-Zone: jeder Tap, der nicht auf Panel-Elemente
    // trifft, schliesst die Ansicht (dieselbe Technik wie AdStubScene).
    this.add.graphics().fillStyle(0x000000, 0.55).fillRect(0, 0, width, height);
    this.add.zone(width / 2, height / 2, width, height)
      .setInteractive()
      .on('pointerdown', () => this.close());

    // Panel
    const panelW = Math.min(width - 28 * s, 380 * s);
    const panelH = height * 0.68;
    const panelX = width / 2;
    const panelY = height / 2;
    const bg = this.add.graphics();
    bg.fillStyle(KYOTO.cream, 1).fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 18 * s);
    bg.lineStyle(2 * s, KYOTO.hinoki, 0.8).strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 18 * s);

    this.add.text(panelX, panelY - panelH / 2 + 24 * s, 'TEA ROOM', labelStyle(11 * s, '#8C7A5E')).setOrigin(0.5);
    this.add.text(panelX, panelY - panelH / 2 + 50 * s, 'BENTO', valueStyle(22 * s, '#1E2022')).setOrigin(0.5);

    // Karussell hinter einer Geometrie-Maske: Seiten verschwinden sauber am
    // Panelrand, statt ins Titelband hineinzuragen.
    const viewTop = panelY - panelH / 2 + 72 * s;
    const viewBottom = panelY + panelH / 2 - 56 * s;
    const viewH = viewBottom - viewTop;
    this.pageStep = panelW;
    const maskG = this.make.graphics();
    maskG.fillStyle(0xFFFFFF, 1).fillRect(panelX - panelW / 2, viewTop, panelW, viewH);
    const mask = maskG.createGeometryMask();

    const contentY = (viewTop + viewBottom) / 2 - 14 * s;
    for (let i = 0; i < BOX_COUNT; i++) {
      const page = this.add.container(panelX + i * this.pageStep, contentY);
      page.setMask(mask);
      this.buildBoxPage(page, i, state, Math.min(panelW * 0.72, viewH * 0.72), s);
      this.pages.push(page);
    }

    // Startseite: zuletzt freigeschaltete Box, sonst die erste.
    const startPage = Math.max(0, state.milestonesWon.length - 1);
    if (startPage > 0) this.pages.forEach(p => { p.x -= startPage * this.pageStep; });
    this.pageIndex = startPage;

    this.buildArrows(panelX, contentY, panelW, s);
    this.buildDots(panelX, panelY + panelH / 2 - 28 * s, s);
    this.updateDots();
    this.buildCloseButton(panelX + panelW / 2, panelY - panelH / 2, s);
  }

  /** Eine Karussell-Seite: geoeffnete Box mit Faechern bzw. Silhouette plus Caption. */
  private buildBoxPage(c: Phaser.GameObjects.Container, boxIdx: number, state: BentoSave, boxSize: number, s: number) {
    const milestone = milestoneForBox(boxIdx);
    const unlocked = state.milestonesWon.includes(milestone);

    const w = boxSize;
    const h = boxSize * 0.74;
    const u = boxSize / 240;

    if (unlocked && this.textures.exists('bento_box')) {
      c.add(this.add.image(0, 0, 'bento_box').setDisplaySize(w, h));
    } else if (unlocked) {
      // Procedural-Lackbox: dunkler Korpus, Messing-Rahmen, Innenboden.
      const g = this.add.graphics();
      g.fillStyle(KYOTO.kuroSteel, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14 * u);
      g.lineStyle(3 * u, KYOTO.brass, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 14 * u);
      g.fillStyle(0x2A2D30, 1).fillRoundedRect(-w / 2 + 8 * u, -h / 2 + 8 * u, w - 16 * u, h - 16 * u, 10 * u);
      c.add(g);
    } else {
      // Gesperrte Box: Silhouette ohne Details plus Messing-Schloss.
      const g = this.add.graphics();
      g.fillStyle(KYOTO.kuroSteel, 0.42).fillRoundedRect(-w / 2, -h / 2, w, h, 14 * u);
      g.lineStyle(4 * u, KYOTO.brass, 0.55).beginPath();
      g.arc(0, -6 * u, 12 * u, Math.PI, 0);
      g.strokePath();
      g.fillStyle(KYOTO.brass, 0.7).fillRoundedRect(-16 * u, -6 * u, 32 * u, 26 * u, 5 * u);
      g.fillStyle(KYOTO.kuroSteel, 0.6).fillCircle(0, 7 * u, 4 * u);
      c.add(g);
      c.add(this.add.text(0, h / 2 + 26 * s, `REACH LEVEL ${milestone}`, labelStyle(12 * s, '#8C7A5E')).setOrigin(0.5));
      return;
    }

    // Vier Faecher als dunkle Insets; Slot 0 oben links traegt die Award-Deko.
    const inset = this.add.graphics();
    const slotW = w * 0.36;
    const slotH = h * 0.34;
    const slots: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    slots.forEach(([sx, sy]) => {
      inset.fillStyle(0x000000, 0.30)
        .fillRoundedRect(sx * w * 0.21 - slotW / 2, sy * h * 0.17 - slotH / 2, slotW, slotH, 8 * u);
    });
    c.add(inset);

    const decoId = state.placed[boxIdx];
    if (decoId) {
      const deco = makeDecoView(this, decoId, w * 0.26).setPosition(-w * 0.21, -h * 0.17);
      deco.setScale(0);
      c.add(deco);
      this.tweens.add({ targets: deco, scale: 1, duration: 320, delay: 150, ease: 'Back.easeOut' });
    }

    c.add(this.add.text(0, h / 2 + 26 * s, `BOX ${boxIdx + 1} · UNLOCKED`, valueStyle(12 * s, '#4A6B47')).setOrigin(0.5));
  }

  private buildArrows(cx: number, cy: number, panelW: number, s: number) {
    ([-1, 1] as const).forEach(dir => {
      const ax = cx + dir * (panelW / 2 - 26 * s);
      const chev = this.add.graphics();
      chev.lineStyle(4 * s, KYOTO.hinoki, 0.95).beginPath();
      chev.moveTo(-dir * 6 * s, -15 * s);
      chev.lineTo(dir * 6 * s, 0);
      chev.lineTo(-dir * 6 * s, 15 * s);
      chev.strokePath();
      chev.setPosition(ax, cy);

      const hit = this.add.zone(ax, cy, 56 * s, 90 * s).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (!this.sliding) this.slide(dir);
      });
    });
  }

  private buildDots(cx: number, cy: number, s: number) {
    const spacing = 18 * s;
    for (let i = 0; i < BOX_COUNT; i++) {
      const x = cx + (i - (BOX_COUNT - 1) / 2) * spacing;
      this.dots.push(this.add.circle(x, cy, 5 * s, KYOTO.hinoki, 0.45));

      const hit = this.add.zone(x, cy, spacing, 30 * s).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        if (!this.sliding && this.pageIndex !== i) this.jumpTo(i);
      });
    }
  }

  /** Eine Seite weiter (dir=1) bzw. zurueck (dir=-1), wrappt an den Enden. */
  private slide(dir: -1 | 1) {
    this.jumpTo((this.pageIndex + dir + BOX_COUNT) % BOX_COUNT);
  }

  private jumpTo(target: number) {
    const delta = target - this.pageIndex;
    this.sliding = true;
    this.pageIndex = target;
    this.updateDots();

    this.pages.forEach((page, idx) => {
      this.tweens.add({
        targets: page,
        x: page.x - delta * this.pageStep,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: idx === 0 ? () => { this.sliding = false; } : undefined
      });
    });
  }

  private updateDots() {
    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === this.pageIndex ? KYOTO.brass : KYOTO.hinoki, i === this.pageIndex ? 1 : 0.45);
      dot.setScale(i === this.pageIndex ? 1.25 : 1);
    });
  }

  private buildCloseButton(px: number, py: number, s: number) {
    const cx = px - 24 * s;
    const cy = py + 24 * s;

    const g = this.add.graphics();
    g.fillStyle(KYOTO.kuroSteel, 0.9).fillCircle(0, 0, 13 * s);
    g.lineStyle(2.5 * s, KYOTO.cream, 1);
    g.lineBetween(-5 * s, -5 * s, 5 * s, 5 * s);
    g.lineBetween(5 * s, -5 * s, -5 * s, 5 * s);
    g.setPosition(cx, cy);

    const hit = this.add.zone(cx, cy, 42 * s, 42 * s).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => this.close());
  }

  /** Aussentap und Close-X laufen hier zusammen; das Resume macht der
   *  SHUTDOWN-Handler aus create(). */
  private close() {
    this.scene.stop();
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
    render: {
      // Trilineares Mipmapping fuer alle POT-Texturen. Die Items kommen als
      // 512er-Zweierpotenz aus der Pipeline; Phaser 3.90 generiert deren
      // Mipmaps beim Upload automatisch und schaltet hier den Min-Filter um.
      // Non-POT-Texturen (bgl_-Szenen, UI-Karten) fallen automatisch auf
      // bilinear ohne Mipmaps zurueck.
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR'
    },
    scale: {
      // NONE statt RESIZE: nur hier ist die Canvas-Aufloesung von der
      // Anzeigegroesse entkoppelt. RESIZE setzt canvas.width hart auf die
      // Elternbreite in CSS-Pixeln und ignoriert zoom komplett.
      mode: Phaser.Scale.NONE,
      zoom: 1 / DPR,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PreloadScene, GameScene, UIScene, WinModalScene, LoseModalScene, AdStubScene, BentoScene]
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
