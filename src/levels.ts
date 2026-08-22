// ==========================================
// LEVELPLAN 1-30 (Anhang A) + DETERMINISTISCHER GENERATOR
// ==========================================
// Dieses Modul kennt main.ts NICHT -- der Item-Pool wird hereingereicht.
// Damit bleibt die Abhaengigkeit einseitig (main.ts -> levels.ts).

export interface SlotDef {
  front: string | null;
  queue: string[];
  /** Gesperrter Slot: nimmt kein Item auf, bis in derselben Reihe ein Match faellt. */
  locked?: boolean;
}

export interface LevelDefinition {
  moves: number;
  targetMatches: number;
  /** Feel-Good-Level: Fanfare + gestaffelter Regal-Einflug. */
  relief?: boolean;
  layout: SlotDef[][];
}

export interface LevelParams {
  rows: number;
  moves: number;
  targetMatches: number;
  /** Anzahl verschiedener Item-IDs, aus denen gezogen wird. */
  poolSize: number;
  /** Maximale Anzahl verdeckter Items hinter einem Front-Item. */
  maxQueueDepth: number;
  /** Gesperrte, leere Front-Slots (L18/L25). */
  blockedSlots?: number;
  /** Feel-Good-Level nach einer Wall (L8/16/26). */
  relief?: boolean;
}

/** Freie, unblockierte Front-Slots, die das Startboard garantiert behaelt.
 *  Unter 2 ist ein Board sofort verklemmt (Befund 3). */
const MIN_FREE_FRONT = 2;

const SLOTS_PER_ROW = 3;

/** Anhang A: rows | maxQueue | pool | moves | matches | blocker | relief */
export const LEVEL_PARAMS: LevelParams[] = [
  { rows: 2, maxQueueDepth: 0, poolSize: 2, moves: 8,  targetMatches: 2 },   // L01
  { rows: 3, maxQueueDepth: 0, poolSize: 2, moves: 10, targetMatches: 2 },   // L02
  { rows: 3, maxQueueDepth: 0, poolSize: 3, moves: 12, targetMatches: 3 },   // L03
  { rows: 4, maxQueueDepth: 0, poolSize: 3, moves: 14, targetMatches: 3 },   // L04
  { rows: 4, maxQueueDepth: 1, poolSize: 3, moves: 14, targetMatches: 4 },   // L05
  { rows: 4, maxQueueDepth: 1, poolSize: 4, moves: 16, targetMatches: 4 },   // L06
  { rows: 4, maxQueueDepth: 1, poolSize: 4, moves: 14, targetMatches: 4 },   // L07
  { rows: 5, maxQueueDepth: 1, poolSize: 4, moves: 18, targetMatches: 5, relief: true },  // L08
  { rows: 5, maxQueueDepth: 2, poolSize: 4, moves: 18, targetMatches: 6 },   // L09
  { rows: 5, maxQueueDepth: 2, poolSize: 5, moves: 20, targetMatches: 6 },   // L10
  { rows: 4, maxQueueDepth: 1, poolSize: 4, moves: 12, targetMatches: 4 },   // L11
  { rows: 5, maxQueueDepth: 2, poolSize: 5, moves: 18, targetMatches: 6 },   // L12
  { rows: 5, maxQueueDepth: 2, poolSize: 6, moves: 20, targetMatches: 7 },   // L13
  { rows: 5, maxQueueDepth: 2, poolSize: 6, moves: 17, targetMatches: 7 },   // L14
  { rows: 5, maxQueueDepth: 3, poolSize: 6, moves: 16, targetMatches: 8 },   // L15 WALL
  { rows: 6, maxQueueDepth: 1, poolSize: 4, moves: 22, targetMatches: 5, relief: true },  // L16
  { rows: 5, maxQueueDepth: 2, poolSize: 5, moves: 18, targetMatches: 6 },   // L17
  { rows: 5, maxQueueDepth: 2, poolSize: 6, moves: 19, targetMatches: 7, blockedSlots: 1 },  // L18
  { rows: 6, maxQueueDepth: 2, poolSize: 6, moves: 22, targetMatches: 8 },   // L19
  { rows: 6, maxQueueDepth: 2, poolSize: 7, moves: 24, targetMatches: 9 },   // L20
  { rows: 5, maxQueueDepth: 1, poolSize: 4, moves: 14, targetMatches: 4 },   // L21
  { rows: 6, maxQueueDepth: 2, poolSize: 7, moves: 22, targetMatches: 9 },   // L22
  { rows: 6, maxQueueDepth: 3, poolSize: 7, moves: 24, targetMatches: 10 },  // L23
  { rows: 6, maxQueueDepth: 3, poolSize: 7, moves: 20, targetMatches: 10 },  // L24
  { rows: 6, maxQueueDepth: 3, poolSize: 8, moves: 19, targetMatches: 11, blockedSlots: 1 },  // L25 WALL
  { rows: 6, maxQueueDepth: 1, poolSize: 5, moves: 24, targetMatches: 6, relief: true },  // L26
  { rows: 6, maxQueueDepth: 2, poolSize: 7, moves: 22, targetMatches: 9 },   // L27
  { rows: 6, maxQueueDepth: 3, poolSize: 8, moves: 24, targetMatches: 11 },  // L28
  { rows: 6, maxQueueDepth: 3, poolSize: 8, moves: 21, targetMatches: 11 },  // L29
  { rows: 6, maxQueueDepth: 3, poolSize: 9, moves: 20, targetMatches: 12 }   // L30 BOSS
];

export const LEVEL_COUNT = LEVEL_PARAMS.length;

/** Der letzte Level ist der Boss -- die Win-Modal-Formulierung haengt daran. */
export function isBossLevel(level: number): boolean {
  return level === LEVEL_COUNT;
}

/** Deterministischer 32-Bit-PRNG. Gleicher Seed => gleiches Board, immer. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle<T>(rand: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface ResolvedParams extends LevelParams {
  /** Effektive Queue-Tiefe nach der Kapazitaets-/Puffer-Korrektur. */
  queueDepth: number;
  blocked: number;
}

/**
 * Haertet die Anhang-A-Werte gegen eine Verklemmung ab: L01 und L03 haben bei
 * `maxQueueDepth` 0 exakt so viele Front-Slots wie Items. Das Startboard haette
 * null freie Slots und waere unspielbar. Die Queue-Tiefe waechst dann, bis der
 * Puffer passt -- die Reihenzahl bleibt unangetastet, damit das Board-Wachstum
 * weiter der Kurve aus Anhang A folgt.
 */
function resolveParams(p: LevelParams): ResolvedParams {
  const blocked = p.blockedSlots ?? 0;
  const usable = p.rows * SLOTS_PER_ROW - blocked - MIN_FREE_FRONT;
  const items = p.targetMatches * 3;

  let queueDepth = p.maxQueueDepth;
  while (usable * (1 + queueDepth) < items) queueDepth++;

  return { ...p, queueDepth, blocked };
}

interface BuildResult {
  layout: SlotDef[][];
  freeFront: number;
}

function buildLayout(rand: () => number, rp: ResolvedParams, pool: string[]): BuildResult {
  // Ein Slot wird als Stapel gebaut: Index 0 wird das Front-Item, der Rest die
  // Queue. So steht die Kapazitaetsgrenze (1 + queueDepth) an genau einer Stelle.
  const total = rp.rows * SLOTS_PER_ROW;
  const stacks: string[][] = Array.from({ length: total }, () => []);
  const locked: boolean[] = Array.from({ length: total }, () => false);

  const open = shuffle(rand, Array.from({ length: total }, (_, i) => i));

  // Gesperrte Slots zuerst: sie bleiben leer und bekommen nie eine Queue,
  // sonst waeren die dahinter liegenden Items unerreichbar.
  open.splice(0, rp.blocked).forEach(i => { locked[i] = true; });

  // Danach der garantierte Puffer: diese Slots werden nicht bespielt.
  open.splice(0, MIN_FREE_FRONT);

  // Erst jede Item-ID des Pools einmal, dann erst uniform nachziehen. Rein
  // uniformes Ziehen laesst bei wenigen Tripletts regelmaessig IDs aus -- das
  // Level waere dann leichter als der Pool-Wert aus Anhang A verspricht.
  const spread = shuffle(rand, [...pool]);
  const bag: string[] = [];
  for (let i = 0; i < rp.targetMatches; i++) {
    const id = i < spread.length ? spread[i] : pick(rand, pool);
    bag.push(id, id, id);
  }
  shuffle(rand, bag);

  const cap = 1 + rp.queueDepth;
  for (const id of bag) {
    const free = open.filter(i => stacks[i].length < cap);
    if (free.length === 0) break; // durch resolveParams ausgeschlossen
    stacks[pick(rand, free)].push(id);
  }

  const layout: SlotDef[][] = [];
  let freeFront = 0;
  for (let r = 0; r < rp.rows; r++) {
    const row: SlotDef[] = [];
    for (let c = 0; c < SLOTS_PER_ROW; c++) {
      const i = r * SLOTS_PER_ROW + c;
      const stack = stacks[i];
      const slot: SlotDef = { front: stack[0] ?? null, queue: stack.slice(1) };
      if (locked[i]) slot.locked = true;
      if (!slot.front && !locked[i]) freeFront++;
      row.push(slot);
    }
    layout.push(row);
  }
  return { layout, freeFront };
}

/** Drei gleiche Front-Items in einer Reihe waeren ein Gratis-Match, das erst
 *  beim ersten fremden Zug ausloest -- das Board saehe kaputt aus. */
function hasReadyMatch(layout: SlotDef[][]): boolean {
  return layout.some(row =>
    row[0].front !== null && row[0].front === row[1].front && row[1].front === row[2].front
  );
}

const MAX_ATTEMPTS = 64;

/**
 * Baut das Board fuer `index0` (0-basiert) deterministisch aus dem Seed
 * `index0 + 1`. Gleicher Level => gleiches Board, auch ueber Reloads hinweg.
 */
export function generateLevel(index0: number, itemPool: string[]): LevelDefinition {
  const idx = Math.min(Math.max(index0, 0), LEVEL_COUNT - 1);
  const rp = resolveParams(LEVEL_PARAMS[idx]);
  const pool = itemPool.slice(0, Math.min(rp.poolSize, itemPool.length));

  let result = buildLayout(mulberry32(idx + 1), rp, pool);
  for (let attempt = 1; attempt < MAX_ATTEMPTS && hasReadyMatch(result.layout); attempt++) {
    result = buildLayout(mulberry32((idx + 1) * 7919 + attempt), rp, pool);
  }

  if (import.meta.env && import.meta.env.DEV) selfTest(idx, rp, result);

  return {
    moves: rp.moves,
    targetMatches: rp.targetMatches,
    relief: rp.relief,
    layout: result.layout
  };
}

function selfTest(idx: number, rp: ResolvedParams, result: BuildResult) {
  const tag = `[levels] L${String(idx + 1).padStart(2, '0')}`;
  const items = rp.targetMatches * 3;
  const placed = result.layout.flat().reduce((n, s) => n + (s.front ? 1 : 0) + s.queue.length, 0);
  const capacity = rp.rows * SLOTS_PER_ROW * (1 + rp.queueDepth);

  console.assert(capacity >= items, `${tag}: Kapazitaet ${capacity} < ${items} Items`);
  console.assert(placed === items, `${tag}: nur ${placed} von ${items} Items platziert`);
  console.assert(result.freeFront >= MIN_FREE_FRONT, `${tag}: nur ${result.freeFront} freie Front-Slots`);
  console.assert(!hasReadyMatch(result.layout), `${tag}: Startboard enthaelt fertiges Triplett`);
  console.assert(
    result.layout.flat().every(s => !s.locked || (!s.front && s.queue.length === 0)),
    `${tag}: gesperrter Slot traegt Items`
  );
  if (rp.queueDepth !== rp.maxQueueDepth) {
    console.info(`${tag}: Queue-Tiefe ${rp.maxQueueDepth} -> ${rp.queueDepth} (Puffergarantie)`);
  }
}
