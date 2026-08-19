import Phaser from 'phaser';

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
  cream: 0xFDFBF7
};

export interface ItemDef {
  id: string;
  name: string;
  baseColor: number;
  accentColor: number;
  detailColor: number;
  shape: 'bowl' | 'kettle' | 'whisk' | 'cube' | 'prism' | 'sphere' | 'cylinder' | 'cone';
}

export const ITEMS: Record<string, ItemDef> = {
  'chawan_cup':      { id: 'chawan_cup',      name: 'Chawan Cup',     baseColor: 0xEAE5D9, accentColor: KYOTO.matcha,    detailColor: 0xBAA788, shape: 'bowl' },
  'tetsubin_kettle': { id: 'tetsubin_kettle', name: 'Tetsubin Kettle',baseColor: KYOTO.kuroSteel, accentColor: KYOTO.brass,detailColor: 0x3A3D40, shape: 'kettle' },
  'chasen_whisk':    { id: 'chasen_whisk',    name: 'Bamboo Whisk',   baseColor: KYOTO.hinoki, accentColor: 0x8C7A5E,    detailColor: KYOTO.matcha, shape: 'whisk' },
  'kissa_toast':     { id: 'kissa_toast',     name: 'Cube Toast',     baseColor: KYOTO.toastGold, accentColor: 0xF4D06F, detailColor: 0x8F572C, shape: 'cube' },
  'dango_stick':     { id: 'dango_stick',     name: 'Dango Skewer',   baseColor: KYOTO.dangoPink, accentColor: KYOTO.cream, detailColor: KYOTO.matcha, shape: 'sphere' },
  'yokan_prism':     { id: 'yokan_prism',     name: 'Yokan Prism',    baseColor: KYOTO.azuki,  accentColor: 0x481E21,    detailColor: KYOTO.brass,  shape: 'prism' },
  'copper_caddy':    { id: 'copper_caddy',    name: 'Copper Caddy',   baseColor: 0xB86D43,     accentColor: KYOTO.brass, detailColor: 0x7E3F1F, shape: 'cylinder' },
  'origami_dripper': { id: 'origami_dripper', name: 'Origami Dripper',baseColor: KYOTO.matcha, accentColor: KYOTO.hinoki, detailColor: 0x364E34, shape: 'cone' }
};

// ==========================================
// 2. PROCEDURAL WEB AUDIO ENGINE
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

  playTap() {
    this.initOnGesture();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
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

  playDrop() {
    this.initOnGesture();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
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

  playMatch(combo = 1) {
    this.initOnGesture();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    const scale = [293.66, 311.13, 392.00, 440.00, 523.25];
    const root = Math.min(combo - 1, scale.length - 2);
    [scale[root], scale[root + 1]].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
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

  playWin() {
    this.initOnGesture();
    if (!this.ctx || this.ctx.state === 'suspended') return;
    [440, 880, 1320].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
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
// 3. GAME STATE & EVENT DEFINITIONS
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
  score: 0,
  moves: 24,
  matchesMade: 0,
  targetMatches: 4,
  combo: 1,
  comboTimer: 0,
  activeBooster: null as 'hammer' | null,
  history: [] as MoveRecord[],
  reset(moves = 24, target = 4) {
    this.score = 0;
    this.moves = moves;
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

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string) {
    super(scene, x, y);
    this.itemId = itemId;
    this.itemDef = ITEMS[itemId] || ITEMS['chawan_cup'];
    this.setSize(76, 76);
    this.renderArt();
    scene.add.existing(this);
  }

  private renderArt() {
    if (this.scene.textures.exists(`item_${this.itemId}`)) {
      const img = this.scene.add.image(0, 0, `item_${this.itemId}`).setDisplaySize(72, 72);
      this.add(img);
      return;
    }
    const g = this.scene.add.graphics(), d = this.itemDef;
    g.fillStyle(0x000000, 0.12).fillRoundedRect(-30, -26, 60, 60, 12);
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
    } else {
      g.fillRoundedRect(-14, -18, 28, 36, 8);
      g.fillStyle(d.detailColor, 1);
      g.fillCircle(0, 0, 6);
    }

    g.lineStyle(1.5, 0xFFFFFF, 0.35).strokeRoundedRect(-32, -32, 64, 64, 14);
    this.add(g);
  }

  setSelected(selected: boolean) {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      y: selected ? -12 : 0,
      scale: selected ? 1.12 : 1.0,
      duration: 150,
      ease: selected ? 'Back.easeOut' : 'Quad.easeOut'
    });
  }
}

export class Shelf extends Phaser.GameObjects.Container {
  public shelfIdx: number;
  public slots: (GoodsItem | null)[] = [null, null, null];
  public queues: string[][] = [[], [], []];
  private peekIndicators: (Phaser.GameObjects.Graphics | null)[] = [null, null, null];
  public readonly spacing = 92;
  public readonly shelfWidth = 304;
  public readonly shelfHeight = 92;

  constructor(scene: Phaser.Scene, x: number, y: number, shelfIdx: number, data: { front: string | null; queue: string[] }[]) {
    super(scene, x, y);
    this.shelfIdx = shelfIdx;
    this.drawStructure();
    this.initSlots(data);
    scene.add.existing(this);
  }

  private drawStructure() {
    const g = this.scene.add.graphics(), w = this.shelfWidth, h = this.shelfHeight;
    g.fillStyle(KYOTO.hinoki, 1.0).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    [-this.spacing, 0, this.spacing].forEach(x => {
      g.fillStyle(KYOTO.slotIndent, 0.4).fillRoundedRect(x - 38, -h / 2 + 8, 76, h - 16, 8);
    });
    g.fillStyle(KYOTO.kuroSteel, 1.0).fillRoundedRect(-w / 2 - 4, h / 2 - 8, w + 8, 12, 3);
    g.fillStyle(KYOTO.brass, 1.0).fillCircle(-w / 2 + 6, h / 2 - 2, 2.5).fillCircle(w / 2 - 6, h / 2 - 2, 2.5);
    this.add(g);
  }

  private initSlots(data: { front: string | null; queue: string[] }[]) {
    data.forEach((slot, i) => {
      this.queues[i] = [...slot.queue];
      if (slot.front) {
        const item = new GoodsItem(this.scene, (i - 1) * this.spacing, 0, slot.front);
        this.slots[i] = item;
        this.add(item);
      }
      this.refreshPeek(i);
    });
  }

  refreshPeek(i: number) {
    this.peekIndicators[i]?.destroy();
    if (this.queues[i].length > 0) {
      const g = this.scene.add.graphics().fillStyle(KYOTO.kuroSteel, 0.25).fillRoundedRect((i - 1) * this.spacing - 22, -38, 44, 6, 3);
      this.addAt(g, 1);
      this.peekIndicators[i] = g;
    }
  }

  getFirstEmptySlot() {
    return this.slots.findIndex(s => s === null);
  }

  insertItem(i: number, item: GoodsItem) {
    if (this.slots[i] !== null) return false;
    this.slots[i] = item;
    this.add(item);
    this.scene.tweens.add({
      targets: item,
      x: (i - 1) * this.spacing,
      y: 0,
      scale: 1.0,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        ZenAudio.playDrop();
        this.checkMatch();
      }
    });
    return true;
  }

  removeItem(i: number): GoodsItem | null {
    const item = this.slots[i];
    if (item) {
      this.slots[i] = null;
      this.remove(item);
      this.advanceQueue(i);
    }
    return item;
  }

  advanceQueue(i: number) {
    if (this.slots[i] === null && this.queues[i].length > 0) {
      const nextId = this.queues[i].shift()!;
      this.refreshPeek(i);
      const nextItem = new GoodsItem(this.scene, (i - 1) * this.spacing, -14, nextId).setAlpha(0).setScale(0.7);
      this.slots[i] = nextItem;
      this.add(nextItem);
      this.scene.tweens.add({
        targets: nextItem,
        y: 0,
        alpha: 1,
        scale: 1.0,
        duration: 220,
        ease: 'Back.easeOut',
        delay: 50,
        onComplete: () => this.checkMatch()
      });
    }
  }

  checkMatch() {
    const [s0, s1, s2] = this.slots;
    if (s0 && s1 && s2 && s0.itemId === s1.itemId && s1.itemId === s2.itemId) {
      const matched = [s0, s1, s2];
      this.slots = [null, null, null];
      matched.forEach((item, idx) => {
        this.scene.tweens.add({
          targets: item,
          scale: 1.25,
          duration: 90,
          yoyo: true,
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
     this.scene.events.emit(GameEvents.TRIPLE_MATCHED, { shelfIdx: this.shelfIdx, itemId: s0.itemId });
    }
  }
}

// ==========================================
// 5. SCENES & CONTROLLERS
// ==========================================
export class PreloadScene extends Phaser.Scene {
  constructor() { super('PreloadScene'); }
  preload() {
    Object.keys(ITEMS).forEach(id => {
      this.load.image(`item_${id}`, `assets/items/${id}.png`);
    });
  }
  create() {
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }
}

export class GameScene extends Phaser.Scene {
  private shelves: Shelf[] = [];
  private selected: { shelfIdx: number; slotIdx: number; item: GoodsItem } | null = null;

  constructor() { super('GameScene'); }

  create() {
    this.shelves = [];
    this.selected = null;
    State.reset(22, 4);

    const levelLayout = [
      [{ front: 'chawan_cup', queue: ['kissa_toast'] }, { front: 'tetsubin_kettle', queue: [] }, { front: 'chawan_cup', queue: ['chasen_whisk'] }],
      [{ front: 'kissa_toast', queue: ['chawan_cup'] }, { front: 'chasen_whisk', queue: ['tetsubin_kettle'] }, { front: null, queue: [] }],
      [{ front: 'dango_stick', queue: ['yokan_prism'] }, { front: 'dango_stick', queue: [] }, { front: 'yokan_prism', queue: ['dango_stick'] }],
      [{ front: 'tetsubin_kettle', queue: [] }, { front: 'yokan_prism', queue: ['kissa_toast'] }, { front: 'chasen_whisk', queue: [] }]
    ];

    const startY = 160;
    levelLayout.forEach((data, i) => {
      this.shelves.push(new Shelf(this, this.scale.width / 2, startY + i * 118, i, data));
    });

    this.input.on('pointerdown', this.onPointerDown, this);
    this.events.on(GameEvents.TRIPLE_MATCHED, this.onMatched, this);

    this.game.events.on(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
    this.game.events.on(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onPointerDown, this);
      this.game.events.off(GameEvents.UNDO_TRIGGERED, this.onUndo, this);
      this.game.events.off(GameEvents.SHUFFLE_TRIGGERED, this.onShuffle, this);
    });
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    ZenAudio.playTap();

    for (let i = 0; i < this.shelves.length; i++) {
      const shelf = this.shelves[i];
      const halfW = shelf.shelfWidth / 2;
      const halfH = shelf.shelfHeight / 2;

      if (p.x >= shelf.x - halfW && p.x <= shelf.x + halfW &&
          p.y >= shelf.y - halfH && p.y <= shelf.y + halfH) {

        const localX = p.x - shelf.x;
        const slotIdx = localX < -45 ? 0 : localX > 45 ? 2 : 1;

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
            const moved = this.shelves[src.shelfIdx].removeItem(src.slotIdx);
            if (moved) {
              shelf.insertItem(targetSlot, moved);
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

  private onMatched() {
    State.matchesMade++;
    State.score += 100 * State.combo;
    State.combo = Math.min(State.combo + 1, 5);
    State.comboTimer = 4.5;
    ZenAudio.playMatch(State.combo);
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
      const it = fromShelf.removeItem(sIdx);
      if (it) toShelf.insertItem(targetSlot, it);
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
          const it = new GoodsItem(this, (i - 1) * s.spacing, 0, id);
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

export class UIScene extends Phaser.Scene {
  private scoreTxt!: Phaser.GameObjects.Text;
  private movesTxt!: Phaser.GameObjects.Text;
  private hammerBtnBg!: Phaser.GameObjects.Graphics;

  constructor() { super({ key: 'UIScene', active: true }); }

  create() {
    const { width, height } = this.scale;

    this.add.graphics().fillStyle(KYOTO.kuroSteel, 0.08).fillRoundedRect(16, 24, width - 32, 60, 14);

    this.scoreTxt = this.add.text(32, 42, 'SCORE: 0', {
      fontSize: '18px',
      color: '#1E2022',
      fontStyle: 'bold'
    });

    this.movesTxt = this.add.text(width - 32, 42, 'MOVES: 22', {
      fontSize: '18px',
      color: '#4A6B47',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    const boosters = [
      { label: 'UNDO', fn: () => this.game.events.emit(GameEvents.UNDO_TRIGGERED) },
      { label: 'SHUFFLE', fn: () => this.game.events.emit(GameEvents.SHUFFLE_TRIGGERED) },
      { label: 'HAMMER', fn: () => {
        State.activeBooster = State.activeBooster === 'hammer' ? null : 'hammer';
        this.updateHammerHighlight();
      }}
    ];

    boosters.forEach((b, idx) => {
      const btn = this.add.container(width / 2 + (idx - 1) * 105, height - 56);
      const bg = this.add.graphics().fillStyle(KYOTO.kuroSteel, 0.9).fillRoundedRect(-44, -20, 88, 40, 10);
      if (b.label === 'HAMMER') this.hammerBtnBg = bg;

      const txt = this.add.text(0, 0, b.label, {
        fontSize: '13px',
        color: '#FDFBF7',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      btn.add([bg, txt]).setSize(88, 40).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        this.tweens.add({ targets: btn, scale: 0.92, yoyo: true, duration: 70, onComplete: b.fn });
      });
    });

    const onMove = (m: number) => this.movesTxt.setText(`MOVES: ${m}`);
    const onScore = ({ score }: { score: number }) => this.scoreTxt.setText(`SCORE: ${score}`);
    const onHammerState = () => this.updateHammerHighlight();

    this.game.events.on(GameEvents.MOVE_EXECUTED, onMove);
    this.game.events.on(GameEvents.SCORE_UPDATED, onScore);
    this.game.events.on(GameEvents.HAMMER_ACTIVE, onHammerState);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.MOVE_EXECUTED, onMove);
      this.game.events.off(GameEvents.SCORE_UPDATED, onScore);
      this.game.events.off(GameEvents.HAMMER_ACTIVE, onHammerState);
    });
  }

  private updateHammerHighlight() {
    if (!this.hammerBtnBg) return;
    this.hammerBtnBg.clear();
    if (State.activeBooster === 'hammer') {
      this.hammerBtnBg.fillStyle(KYOTO.azuki, 1.0).fillRoundedRect(-44, -20, 88, 40, 10);
    } else {
      this.hammerBtnBg.fillStyle(KYOTO.kuroSteel, 0.9).fillRoundedRect(-44, -20, 88, 40, 10);
    }
  }
}

export class WinModalScene extends Phaser.Scene {
  constructor() { super('WinModalScene'); }

  create() {
    const { width, height } = this.scale;
    this.add.graphics().fillStyle(0x000000, 0.45).fillRect(0, 0, width, height);

    const card = this.add.container(width / 2, height / 2);
    const bg = this.add.graphics().fillStyle(KYOTO.cream, 1).fillRoundedRect(-130, -110, 260, 220, 16);
    const title = this.add.text(0, -60, 'TEA BAR CLEARED', { fontSize: '20px', color: '#1E2022', fontStyle: 'bold' }).setOrigin(0.5);
    const score = this.add.text(0, -10, `SCORE: ${State.score}`, { fontSize: '18px', color: '#4A6B47', fontStyle: 'bold' }).setOrigin(0.5);

    const btn = this.add.container(0, 50);
    const btnBg = this.add.graphics().fillStyle(KYOTO.matcha, 1).fillRoundedRect(-60, -20, 120, 40, 10);
    const btnTxt = this.add.text(0, 0, 'NEXT BAR', { fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold' }).setOrigin(0.5);
    btn.add([btnBg, btnTxt]).setSize(120, 40).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.stop('WinModalScene');
      const gameScene = this.scene.get('GameScene');
      gameScene.scene.restart();
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
  width: 420,
  height: 760,
  backgroundColor: '#F3EFEA',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [PreloadScene, GameScene, UIScene, WinModalScene]
});
