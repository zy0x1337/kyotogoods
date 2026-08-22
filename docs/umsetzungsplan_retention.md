# Umsetzungsplan: Retention & Progression

*Basiert auf `docs/mobile_puzzle_retention_analyse.md`. Code-Referenzen verifiziert gegen `src/main.ts` und `scripts/process_assets.js` (Stand: August 2026).*

---

## 1. Ist-Stand (verifiziert)

| Aspekt | Zustand | Referenz |
|---|---|---|
| Level | 6 hartcodiert, andere Werte als Analyse-Plan | `LEVELS` `src/main.ts:125–323` |
| Fail-State | **Existiert nicht.** Züge laufen auf 0 ohne Konsequenz; Hammer kann Level zudem unwinnable machen (entfernte Items fehlen für `targetMatches`) | Win-Check `src/main.ts:1246–1253`, Hammer-Pfad `src/main.ts:1157–1162` |
| Queue | Vorhanden, komplett verdeckt — Churn-Treiber Nr. 1 laut Analyse (Befund 2) | `advanceQueue` `src/main.ts:807–828`, `queues` `src/main.ts:651` |
| Undo / Shuffle / Hammer | Alle unbegrenzt gratis, keine Ökonomie | `onUndo` `src/main.ts:1256–1271`, Booster-Reihe `src/main.ts:1382–1417` |
| Slots pro Regal | Fix 3 — Analyse-Tabelle nutzt durchgehend 3, **kein Umbau nötig** | `slots` `src/main.ts:650`, `checkMatch` `src/main.ts:938` |
| Audio-Pitch | Combo-Escalation teilweise vorhanden (`playMatch(combo)`, pentatonische Stufung), aber nicht exakt +2 Halbtöne pro Schritt | `src/main.ts:401–427` |
| Meta-Layer / Persistenz | Keins. `State.currentLevel` startet bei Reload immer bei 1 | `src/main.ts:476`, Next-Bar `src/main.ts:1500–1504` |
| Texturen | Output 384×384 px (**kein POT** → WebGL-Mipmaps unmöglich → Aliasing/"Sharpness-Fragmente" beim GPU-Downscaling auf ~174 Gerätepixel) | `TARGET_SIZE = 384` `scripts/process_assets.js:25` |

**Entscheidungen (bestätigt):**
- Rewarded Ads zunächst als **UI-Stub** (`requestRewardedAd(onReward)` zeigt Overlay, gewährt sofort); echte AdMob-Anbindung ersetzt später nur diese eine Funktion.
- Scope **vollständig**: Fail-State, Silhouette, Undo-Ökonomie, Extra-Shelf, 30-Level-Plan, Pitch-Audio, Bento-Meta.
- Hammer wird gemäß Empfehlung 5 der Analyse **durch Extra-Shelf ersetzt** (Annahme — rückwärtskompatibel wiederherstellbar via Git).

---

## 2. Priorisierung Aufwand/Nutzen

| Rang | Maßnahme | Aufwand | Nutzen | Analyse-Bezug | Neue Assets |
|:---:|---|:---:|:---:|---|:---:|
| 1 | Fail-State + „+5 Züge"-Offer | S | Sehr hoch | Befund 4 (Zuglimit konvertiert besser als Deadlock) | Nein |
| 2 | Undo-Ökonomie 3×/Level | S | Hoch | Befund 11, Empfehlung 2 (D1-Churn −8 %) | Nein |
| 3 | Queue-Silhouette | S–M | Sehr hoch | Befund 2 + 14, Empfehlung 1 (Churn Nr. 1) | Nein |
| 4 | Sharpness-Fix (POT + Trilinear) | S–M | Hoch | Nutzerforderung; betrifft alle Levels & spätere kleine Items | Nein (Pipeline-Re-Run) |
| 5 | Audio-Pitch exakt +2 Halbtöne | XS | Mittel | Befund 12, Empfehlung 3 | Nein |
| 6 | Levelplan 1–30 (Generator) + Relief-Fanfare + Persistenz | M–L | Sehr hoch | Abschnitt 5, Befund 6/8/9 | Nein |
| 7 | Extra-Shelf ersetzt Hammer | M | Hoch | Empfehlung 5 (bester Konverter) | **Ja: `btn_extra_shelf`** |
| 8 | Bento-Meta-Gerüst | L | Hoch (D30 >12 %) | Befund 13, Empfehlung 4 | **Ja: `bento_box` + Deko-Set** |

---

## 3. Sessions

Gemäß Arbeitsvereinbarung selbst-contained formuliert — jede Session kalt startbar.

### Session 1 — Fail-State + „+5 Züge"-Offer · *Sonnet 4.6 · medium*

**Ziel:** Züge-Exhaustion führt zu LoseModal mit Rewarded-Ad-Offer statt ins Leere laufen (Befund 4).

**Ist:** Nur Win-Pfad existiert (`onMatched` `src/main.ts:1246–1253`: Pause + `WinModalScene`). `WinModalScene` (`src/main.ts:1455–1509`) ist die strukturelle Vorlage. `GameEvents` `src/main.ts:458–465`.

**Schritte:**
1. Neue Funktion `requestRewardedAd(scene: Phaser.Scene, onReward: () => void)` in `main.ts` — Stub: launcht neue `AdStubScene` (Vollbild-Overlay „AD (Stub)", Countdown ~1,2 s, fängt Input ab, ruft dann `onReward()` und stoppt sich). Späterer AdMob-Umbau betrifft ausschließlich diese Funktion.
2. Neue `LoseModalScene` (parallel zu `WinModalScene`): „OUT OF MOVES", Buttons **„+5 MOVES (Ad)"** → `requestRewardedAd(() => { State.moves += 5; resume; emit MOVE_EXECUTED })`, **„RETRY"** → `GameScene.restart()`.
3. `State.won: boolean` in `reset()` (`src/main.ts:486–496`) ergänzen; in `onMatched` bei Win `true` setzen.
4. Lose-Trigger in `GameScene`: nach jedem Move (`MOVE_EXECUTED`-Emit-Stelle `src/main.ts:1194`) verzögert prüfen (`delayedCall ≈ 650 ms`, damit laufende Match-Tweens zuerst feuern können): `!State.won && State.moves <= 0 && State.matchesMade < State.targetMatches && !allClear` → Pause + `launch('LoseModalScene')`.
5. `AdStubScene` in Scene-Liste des Bootstraps registrieren (`src/main.ts:1540`).

**Akzeptanz:** Züge auf 0 ohne finales Match → Modal erscheint; „+5" setzt fort und Zähler aktualisiert sich (UIScene-Handler `src/main.ts:1419–1427` reagiert auf `MOVE_EXECUTED`); Retry baut Level neu.

---

### Session 2 — Undo-Ökonomie · *Sonnet 4.6 · low*

**Ziel:** 3 freie Undos pro Level, danach Rewarded-Ad-Aufladung (Empfehlung 2).

**Schritte:**
1. `State.undoLeft = 3`, Reset in `State.reset()` (`src/main.ts:486–496`).
2. Guard in `onUndo` (`src/main.ts:1256`): bei `undoLeft <= 0` → `requestRewardedAd(() => { State.undoLeft = 1; })`, kein direktes Undo.
3. UIScene: Badge-Text am Undo-Button (Container `src/main.ts:1396–1417`), Update nach jeder Nutzung/Aufladung.

**Akzeptanz:** 4. Undo-Versuch zeigt Ad-Stub; nach Reward genau 1 Undo verfügbar; Badge zählt korrekt runter.

---

### Session 3 — Queue-Silhouette · *Sonnet 4.6 · medium*

**Ziel:** Nächstes Queue-Item als dezente Silhouette hinter dem Front-Item sichtbar (Empfehlung 1) — eliminiert RNG-Deadlock-Gefühl.

**Ist:** `initSlots` `src/main.ts:713–723`, `advanceQueue` `src/main.ts:807–828`, `removeItem` `src/main.ts:797–805`, `checkMatch` `src/main.ts:937–976`. Item-Texturen unter Key `item_<id>` vorhanden (`PreloadScene` `src/main.ts:997–999`); Procedural-Fallback in `GoodsItem.renderArt` `src/main.ts:529+`.

**Schritte:**
1. `Shelf` um `private ghosts: (Phaser.GameObjects.GameObject | null)[]` erzeugen.
2. Methode `updateGhost(i)`: zerstört altes Ghost; wenn `queues[i][0]` existiert und `slots[i]` belegt ist → Ghost erzeugen: Textur `item_<nextId>` falls vorhanden (sonst Graphics-RoundedRect in `baseColor`), `setTint(0x2A2622)`, Alpha ~0.25, Scale 0.88, Position `(i−1)*spacing, restY − 10*itemScale`, per `addAt(..., 0)` **hinter** die Front-Items.
3. Aufrufen in: Ende von `initSlots` (je Slot), direkt nach dem `shift()` in `advanceQueue`, nach `advanceQueue(i)` in `removeItem`, in `checkMatch` neben den drei `advanceQueue`-Calls (`src/main.ts:962`).
4. Kein „xN"-Badge (offene Frage 1 der Analyse — A/B erst später).

**Akzeptanz:** Jeder belegte Slot mit Restqueue zeigt dunkle Kontur; Nachrücken tauscht Silhouette korrekt; leere Queues zeigen nichts.

---

### Session 4 — Sharpness-Fix: POT-Texturen + Trilinear · *Sonnet 4.6 · medium*

**Ziel:** Keine Aliasing-/Sharpness-Artefakte, wenn Items klein dargestellt werden (späte Levels, großes Grid).

**Ursache:** `TARGET_SIZE = 384` (`scripts/process_assets.js:25`) ist keine Zweierpotenz → WebGL kann keine Mipmaps generieren → bilineares Downsampling von 384 px auf ~58 px × DPR erzeugt Flimmerkanten an dünnen Outlines.

**Verifiziert unkritisch:** Die Bottom-Offset-Normalisierung rechnet relativ zur tatsächlichen Bildhöhe (`ITEM_DISPLAY_SIZE / processedInfo.height`, `process_assets.js:514–516`) — ein Wechsel auf 512 ändert die generierten Offsets **nicht**. `ITEM_DISPLAY_SIZE = 72` (`process_assets.js:30`) bleibt; `ITEM_OFFSET_BASE = 72` (`main.ts:59`) bleibt.

**Schritte:**
1. Pipeline: `TARGET_SIZE 384 → 512`, `EDGE_SPRITE 8 → 11`, `EDGE_LAYER 6 → 8` (proportional ×512/384; Despill-Radius ist eine Pixelbreite am fertigen Bild, CLAUDE.md Abschnitt 4).
2. `npm run process:assets` (alle Assets neu schreiben; `raw_renders/` muss vollständig sein — Fehlende fallen auf `DEFAULT_OFFSET` zurück und behalten Procedural-Fallback).
3. In `main.ts`: Helper `enableTrilinear(texture)` — `texture.setFilter(LINEAR)` plus `glTexture.generateMipmap = true` und Min-Filter `LINEAR_MIPMAP_LINEAR` über `texture.source[0].glTexture` (Phaser 3.90). Aufrufen in `PreloadScene.create()` (`src/main.ts:1015`) für alle `item_*`, `btn_*`, `fx_*`, `ui_*` Texturen.
4. Schutzregel im `GridManager` (`src/main.ts:1040–1048`): `itemScale` nicht unter 0.85 absenken bzw. `shelfSpacing` clampen, damit bei 6 Reihen auf kleinen Screens nichts unter die Lesbarkeitsgrenze fällt (Befund 7: max 6 Regale à 3 Slots).

**Fallback, falls Mipmap-Weg an WebGL1-Geräten zickt:** Runtime-Downscale je Scale-Bucket via Canvas (`textures.addCanvas`, `imageSmoothingQuality: 'high'`) statt GPU-Skalierung — kein Pipeline-Re-Run nötig.

**Akzeptanz:** DevTools DPR 3: `document.querySelector('canvas').width` = CSS-Breite × 3; Items bei kleinstem `itemScale` ohne Flimmern/Kantenfragmente; `item_offsets.generated.ts` inhaltlich unverändert bis auf Rundungsrauschen.

---

### Session 5 — Audio-Pitch exakt pentatonisch · *Sonnet 4.6 · low*

**Ziel:** +2 Halbtöne pro Combo-Schritt (Befund 12).

**Ist:** `playMatch(combo)` `src/main.ts:401–427` indexiert ein Array `[293.66, 311.13, 392.00, 440.00, 523.25]` — Schritte sind ungleich (teils nur +1 HT).

**Änderung:** Frequenz = Basis × `2^(comboStep * 2/12)`, Basis z. B. 392 Hz (G4), `comboStep = min(combo − 1, 7)`. Zwei-Ton-Motiv (Grundton + Quinte/Oktave) wie bisher beibehalten.

**Akzeptanz:** Hörbar gleichmäßige Anhebung; keine Klippen bei Combo 5.

---

### Session 6 — Levelplan 1–30, Generator, Relief-Fanfare, Persistenz · *Opus · high*

**Ziel:** Die 30-Level-Tabelle der Analyse (Abschnitt 5) als Content, deterministisch generiert und garantiert puffergesichert; Board-Wachstum zelebriert (Befund 8); Fortschritt hält Reloads stand.

**Neues Modul `src/levels.ts`** (main.ts importiert es — nicht umgekehrt, kein Zirkel-Import):
```ts
export interface SlotDef { front: string | null; queue: string[]; locked?: boolean }
export interface LevelDefinition { moves: number; targetMatches: number; relief?: boolean; layout: SlotDef[][] }
export interface LevelParams {
  rows: number; moves: number; targetMatches: number;
  poolSize: number; maxQueueDepth: number;
  blockedSlots?: number;   // gesperrte leere Front-Slots (L18/L25)
  relief?: boolean;        // Feel-Good-Level → Fanfare + Fly-in (L8/16/26)
}
export const LEVEL_PARAMS: LevelParams[]  // 30 Einträge gemäß Anhang A
export function generateLevel(index0: number, itemPool: string[]): LevelDefinition
```

**Generator (deterministisch, Seed = Levelnummer):** mulberry32-PRNG. Konstruktion:
1. Multimenge: `targetMatches` Tripletts, IDs uniform aus den ersten `poolSize` Einträgen von `itemPool` ziehen.
2. Platzieren: Items nacheinander auf zufällige Reihe/zufälligen Slot — auf Queue (wenn Tiefe < `maxQueueDepth`) oder freien Front-Slot. Danach pro Slot `front = queue.pop()` falls Queue nicht leer.
3. **Harte Bedingung (Befund 3):** ≥ 2 freie **und** unblockierte Front-Slots im Startboard — sonst neu würfeln (Max-Attempts-Schleife).
4. `blockedSlots`: gesperrte Slots sind leere Front-Plätze ohne Queue (nie Items dahinter — sonst unerreichbare Items), Kennzeichnung visuell (Kette/Siegel, Procedural-Graphics).
5. Dev-only Selbsttest (Console-Assert): Kapazität `rows*3*(1+maxQueue) ≥ targetMatches*3`, Pufferbedingung erfüllt.

**Anpassungen `main.ts`:**
- `LEVELS`-Array entfernen; `buildLevel` (`src/main.ts:1139–1145`) nutzt `generateLevel(State.currentLevel - 1, Object.keys(ITEMS))`. `SlotData`-Typ (`src/main.ts:117`) durch `SlotDef` ersetzen.
- Blocker-Logik: `Shelf.insertItem` verweigert auf `locked`; Auswahl (Pointer-Pfad `src/main.ts:1164–1169`) ignoriert locked; Freischaltung: erfolgreicher Match in derselben Reihe (`checkMatch` `src/main.ts:937`) unlocked alle locked Slots dieser Reihe mit Flash-Tween.
- Relief-Fanfare: `ZenAudio.playFanfare()` (kurzes aufsteigendes Arpeggio, analog `playWin` `src/main.ts:429–452`); in `buildLevel` wenn `level.relief && rows > rowsDesVorlevels`. Zusätzlich Shelves gestaffelt einfliegen lassen (staggered Tween ab `GridManager.buildAll` `src/main.ts:1068–1073`).
- Persistenz: `localStorage['kyoto_level']` — laden in `boot()`/`State`, schreiben in Next-Bar (`src/main.ts:1500–1504`) und nach Retry.
- WinModalScene: Boss-Level 30 → Text „BENTO UNLOCKED!" vorbereiten (Meta folgt Session 8).

**Akzeptanz:** `npm run build` grün; Level 1/8/15/16/25/30 manuell gegen Anhang-A-Werte geprüft; Reload behält Level; Relief-Level spielen sich spürbar schneller; Blocker in 18/25 blockieren und lösen korrekt auf.

---

### Session 7 — Extra-Shelf ersetzt Hammer · *Sonnet 4.6 · medium*

**Ziel:** Stärkster Booster = temporäres leeres Extra-Regal für das restliche Level (Empfehlung 5).

**Schritte:**
1. `State.activeBooster` + `HAMMER_ACTIVE` entfernen (`src/main.ts:484`, `464`); Hammer-Pfad in `onPointerDown` (`src/main.ts:1157–1162`) und `updateHammerState` (`src/main.ts:1444–1452`) löschen.
2. Booster-Reihe (`src/main.ts:1387–1394`): dritter Button = `btn_extra_shelf` (Procedural-Fallback: rundes Cream-Button mit gezeichnetem Regal-Icon).
3. Klick (einmal pro Level, `State.extraShelfUsed`): `GameScene` erstellt neues boardloses `Shelf` (Konstruktor unterstützt `boardless`, `src/main.ts:664–685`) mit leerem Layout, Position zwischen letzter Reihe und Booster-Tray (`y ≈ height − 80*uiScale`; ggf. `gridBottom` im `GridManager` `src/main.ts:1046` leicht anheben), Index = `shelves.length` → Hit-Test (`shelfAt` `src/main.ts:1076–1082`) und Undo-History funktionieren unverändert; `allClear`-Check iteriert ohnehin alle Shelves (`src/main.ts:1246`).
4. Nach Einsatz: Button ausgegraut/disabled.

**⚠ Neues Asset `btn_extra_shelf`:** Reve-Render nötig (siehe Abschnitt 4). Bis dahin läuft der Procedural-Fallback — Session ist nicht asset-blockiert.

**Akzeptanz:** Extra-Shelf erscheint, ist bespielbar (rein/raus, Matches, Undo über Grenzen hinweg), verschwindet nicht bei Win/Lose-Modals; zweiter Klick tut nichts.

---

### Session 8 — Bento-Meta-Gerüst · *Opus · high*

**Ziel:** Sammel-Meta alle 5 Level ein Bento-Freischaltung (Befund 13, Empfehlung 4) — D30-Hebel.

**Schritte:**
1. `src/bento.ts`: Fortschrittsmodell (`localStorage['kyoto_bento']`): 6 Bento-Boxen à Meilenstein-Level 5/10/15/20/25/30, je Box 4 Deko-/Zutaten-Slots.
2. `BentoScene` (einfach): Box anzeigen, freigeschaltete Deko platzieren, gesperrt silhouettiert. Einstieg: Button im Header (UIScene) bzw. Auto-Popup nach Boss-Level-Win.
3. Freischalt-Journal: nach Win von Level 5/10/… Deko-Item gewichtet aus Pool wählen; Anzeige im `WinModalScene` („NEUE DEKO!").
4. Rendering: Texture `bento_box` + Deko-Texturen falls geladen (`AVAILABLE_ASSETS`-Gate wie `loadOptional` `src/main.ts:988–991`), sonst Procedural-Platzhalter (farbige RoundedRects mit Kawaii-Mini-Face).

**⚠ Neue Assets (Reve):** `bento_box`, ~8–12 Deko-/Zutaten-Items (z. B. `deco_shokado`, `deco_onigiri_pair`, …) — siehe Abschnitt 4. Gerüst startet bewusst mit Platzhaltern.

**Akzeptanz:** Nach Level 5 poppt Freischalt-Journal; Bento-Ansicht zeigt Fortschritt persistent über Reloads.

---

## 4. Neue Assets — Bescheid (Reve)

| Asset | Session | Prompt-Richtlinie |
|---|---|---|
| `btn_extra_shelf` | 7 | Analog `btn_undo`/`btn_hammer` (CLAUDE.md Abschnitt 3): runder Cream-Button, Symbol = kleines Holzregal mit 2 Fächern, Magenta #FF00FF, Negative Prompt Pflicht, Portrait 9:16 |
| `bento_box` | 8 | Geschlossene/teilweise offene Lack-Bento-Box, Kawaii Flat, Magenta, Negative Prompt Pflicht |
| ~8–12 Deko-/Zutaten-Items (`deco_*`) | 8 | Kleine Einzelobjekte im Katalog-Stil; IDs vor Render in `ITEM_IDS`? **Nein** — neues Prefix `deco_` in `process_assets.js` (FALL-4-artig, quadratisch zentriert) ergänzen |

Keine neuen Assets für Sessions 1–6. Reihenfolge: Session 4 zuerst die Pipeline-Umstellung, dann alle neuen Renders profitieren automatisch von POT 512.

## 5. Verifikation (jede Session)

```
npm run build        # Typecheck + Bundle
npm run dev          # Checkliste, DevTools auf Telefon mit DPR 3
```
- Canvas-Breite = CSS-Breite × DPR; Items scharf auch bei kleinem `itemScale` (besonders nach Session 4)
- Zugflug bleibt Parabel; Match-FX, Haptik, Sounds intakt
- Nach Session 6: Levelwerte gegen Anhang A stichprobenartig (1, 8, 15, 16, 25, 30)
- Commits je Session: `feat: fail-state + rewarded move offer` etc.

## Anhang A — Levelparameter (Analyse Abschnitt 5, kompakt)

`rows · maxQueue · pool · moves · matches [· blocker · relief]`

```
L01: 2·0·2·8·2            L11: 4·1·4·12·4          L21: 5·1·4·14·4
L02: 3·0·2·10·2           L12: 5·2·5·18·6          L22: 6·2·7·22·9
L03: 3·0·3·12·3           L13: 5·2·6·20·7          L23: 6·3·7·24·10
L04: 4·0·3·14·3           L14: 5·2·6·17·7          L24: 6·3·7·20·10
L05: 4·1·3·14·4           L15: 5·3·6·16·8   WALL   L25: 6·3·8·19·11 WALL +1 blocker
L06: 4·1·4·16·4           L16: 6·1·4·22·5  relief  L26: 6·1·5·24·6  relief
L07: 4·1·4·14·4           L17: 5·2·5·18·6          L27: 6·2·7·22·9
L08: 5·1·4·18·5  relief   L18: 5·2·6·19·7  +1 blocker   L28: 6·3·8·24·11
L09: 5·2·4·18·6           L19: 6·2·6·22·8          L29: 6·3·8·21·11
L10: 5·2·5·20·6           L20: 6·2·7·24·9          L30: 6·3·9·20·12  BOSS
```

Slots/Regal überall 3. Kapazitätsprobe (schlechtester Fall L30): 18 Slots × (1+3) = 72 ≥ 36 Items ✓
