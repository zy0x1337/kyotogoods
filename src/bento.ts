// ==========================================
// BENTO META -- Sammel-Fortschritt (Session 8)
// ==========================================
// Dieses Modul kennt main.ts NICHT (keine Phaser-Imports) -- die
// Abhaengigkeit laeuft nur main.ts -> bento.ts, wie bei levels.ts.
// Farben sind deshalb bewusst als Hexzahlen inline definiert.

export const BOX_COUNT = 6;

/** Slots je Box. Das Geruest vergibt pro Box genau EINE Deko bei Freischaltung;
 *  die uebrigen Slots bleiben Silhouetten fuer spaeteren Content. */
export const SLOTS_PER_BOX = 4;

/** Box i schaltet beim Sieg von Level (i+1)*5 frei. */
export function milestoneForBox(boxIdx: number): number {
  return (boxIdx + 1) * 5;
}

export interface DecoDef {
  id: string;
  name: string;
  baseColor: number;
  accentColor: number;
}

// Kleine Bento-Zutaten und -Accessoires, jede mit eindeutiger Silhouette
// (Silhouetten-Regel, CLAUDE.md Abschnitt 3). Texturen laden optional --
// bis die Reve-Renders vorliegen, zeichnen die Szenen Procedural-Platzhalter.
export const DECOS: Record<string, DecoDef> = {
  deco_tamagoyaki_roll: { id: 'deco_tamagoyaki_roll', name: 'TAMAGOYAKI', baseColor: 0xFFD700, accentColor: 0xFFB300 },
  deco_karaage:         { id: 'deco_karaage', name: 'KARAAGE', baseColor: 0xC68B59, accentColor: 0xA0694B },
  deco_cherry_tomato:   { id: 'deco_cherry_tomato', name: 'CHERRY TOMATO', baseColor: 0xE74C3C, accentColor: 0x2D5A3D },
  deco_broccoli:        { id: 'deco_broccoli', name: 'BROKKOLI', baseColor: 0x4A8C3F, accentColor: 0x35682D },
  deco_octo_wiener:     { id: 'deco_octo_wiener', name: 'OCTO WIENER', baseColor: 0xFF9A76, accentColor: 0xE86A50 },
  deco_rabbit_apple:    { id: 'deco_rabbit_apple', name: 'USAGI RINGO', baseColor: 0xFDFBF7, accentColor: 0xE74C3C },
  deco_sakura_baran:    { id: 'deco_sakura_baran', name: 'SAKURA BARAN', baseColor: 0x8FA89B, accentColor: 0xE8B4B8 },
  deco_pickles:         { id: 'deco_pickles', name: 'TSUKEMONO', baseColor: 0xE8C64B, accentColor: 0xC4912E },
  deco_sauce_fish:      { id: 'deco_sauce_fish', name: 'SHOYU-FISCH', baseColor: 0x8B5A2B, accentColor: 0xDAA520 },
  deco_baking_cup:      { id: 'deco_baking_cup', name: 'FOERMCHEN', baseColor: 0xE8B4B8, accentColor: 0xC49A5A },
  deco_nori_band:       { id: 'deco_nori_band', name: 'NORI-BAND', baseColor: 0x2D4A32, accentColor: 0x1E3322 },
  deco_kewpie_mayo:     { id: 'deco_kewpie_mayo', name: 'MAYO', baseColor: 0xFDFBF7, accentColor: 0xE74C3C }
};

export const DECO_IDS = Object.keys(DECOS);

const STORAGE_KEY = 'kyoto_bento';

export interface BentoSave {
  /** Besiegelte Meilenstein-Level, z. B. [5, 10]. Aufsteigend sortiert. */
  milestonesWon: number[];
  /** boxIdx -> vergebene Deko-ID (Geruest: hoechstens 1 Eintrag je Box). */
  placed: Record<number, string>;
}

function isMilestone(level: number): boolean {
  return level > 0 && level % 5 === 0 && level <= BOX_COUNT * 5;
}

function emptySave(): BentoSave {
  return { milestonesWon: [], placed: {} };
}

export function loadBento(): BentoSave {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptySave();

    const parsed = JSON.parse(raw) as Partial<BentoSave>;
    const save = emptySave();
    if (Array.isArray(parsed.milestonesWon)) {
      save.milestonesWon = parsed.milestonesWon.filter(isMilestone).sort((a, b) => a - b);
    }
    if (parsed.placed && typeof parsed.placed === 'object') {
      for (const [key, id] of Object.entries(parsed.placed)) {
        const boxIdx = parseInt(key, 10);
        if (Number.isFinite(boxIdx) && boxIdx >= 0 && boxIdx < BOX_COUNT && typeof id === 'string' && DECOS[id]) {
          save.placed[boxIdx] = id;
        }
      }
    }
    return save;
  } catch {
    // Kaputter JSON oder blockierter Storage (privater Modus): neu anfangen.
    return emptySave();
  }
}

export function saveBento(state: BentoSave): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* siehe loadBento */
  }
}

export interface BentoAward {
  /** Index der frisch freigeschalteten Box (0-basiert). */
  boxIdx: number;
  /** Die vergebene Deko-ID. */
  decoId: string;
}

/**
 * Nach jedem Level-Sieg aufrufen. Vergibt ausschliesslich an Meilenstein-
 * Leveln eine Deko und schaltet die zugehoerige Box frei; alle anderen
 * Siege liefern null. Idempotent: der Wrap L30 -> L1 und Replays frueherer
 * Level vergiben nicht doppelt.
 *
 * Wahl gewichtet aus dem Pool: unbesetzte IDs Gewicht 3, bereits vergebene
 * Gewicht 1. Bei 12 IDs gegen maximal 6 Awards bleiben Duplikate praktisch
 * ausgeschlossen; spaetere Rarity-Gewichte haengen hier an.
 */
export function registerWin(level: number): BentoAward | null {
  if (!isMilestone(level)) return null;

  const state = loadBento();
  if (state.milestonesWon.includes(level)) return null;

  const owned = new Set(Object.values(state.placed));
  const weights = DECO_IDS.map(id => (owned.has(id) ? 1 : 3));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  let decoId = DECO_IDS[DECO_IDS.length - 1];
  for (let i = 0; i < DECO_IDS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      decoId = DECO_IDS[i];
      break;
    }
  }

  const boxIdx = level / 5 - 1;
  state.milestonesWon.push(level);
  state.placed[boxIdx] = decoId;
  saveBento(state);

  return { boxIdx, decoId };
}
