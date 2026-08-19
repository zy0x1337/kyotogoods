# Modern Kyoto Kissa - Goods Sort Game Documentation

## 1. Commands
- `npm install` : Install dependencies
- `npm run dev` : Launch local Vite development server
- `npm run build` : Typecheck and build production bundle
- `npm run cap:android` : Build bundle, sync Capacitor, and launch Android Studio
- `npm run process:assets` : Run Sharp defringing script on `./raw_renders/*.png` -> `./public/assets/items/`

---

## 2. Nano Banana Pro Asset Generation Catalog

### Master Negative Prompt (Append to all runs)
hyper-realistic, high gloss reflections, shiny liquid specular, crumbs, baked floor shadows, blurry edges, gradient background, photorealism, text, watermark, logo, perspective tilt, 3d render artifacts

### Master Base Prompt Formula
[Subject] [Geometric Primitive], Japanese modern kissa aesthetic, unglazed biscuit porcelain and tactile matte wood CMF, orthographic front-facing view, softbox ambient studio lighting, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, art toy product render, 8k resolution --style raw

### Core Item Prompts
1. **chawan_cup:**
   Squat cylindrical Japanese chawan tea bowl in off-white biscuit porcelain, filled with velvety flat matcha-green foam, minimalist straight-profile silhouette, orthographic front view, pure white background, zero floor shadow.
2. **tetsubin_kettle:**
   Squat flat-profile cast iron kettle in charcoal black matte finish with a clean right-angle brushed brass handle and angled spout, orthographic front view, pure white background, zero floor shadow.
3. **chasen_whisk:**
   Stylized geometric bamboo matcha whisk (chasen) carved from pale Hinoki blonde wood with clean rhythmic carved tines, orthographic front view, pure white background, zero floor shadow.
4. **kissa_toast:**
   Sculptural Shokupan bread toast cube with golden-brown baked edges and a single sharp yellow cube of butter centered on top, matte polymer clay finish, orthographic front view, pure white background, zero floor shadow.
5. **dango_stick:**
   Three perfectly spherical matte clay dango beads in pastel pink, chalk white, and matcha green on a pale wooden skewer, orthographic front view, pure white background, zero floor shadow.
6. **yokan_prism:**
   Triangular geometric slice of red bean yokan jelly in deep azuki maroon-purple with razor-sharp beveled edges and a tiny gold foil flake, orthographic front view, pure white background, zero floor shadow.
7. **copper_caddy:**
   Minimalist cylindrical tea caddy in brushed satin copper with a flush brushed brass lid, architectural silhouette, orthographic front view, pure white background, zero floor shadow.
8. **origami_dripper:**
   Conical origami coffee dripper in sage-green matte stoneware with 16 sharp vertical facets resting on a round blonde Hinoki base ring, orthographic front view, pure white background, zero floor shadow.

### Niche Background Prompts (3 Tiers)
Each tier maintains the same Japanese kissa aesthetic: warm hinoki wood frame, matte white plaster interior, soft ambient lighting from above. The inner cavity width increases per tier to visually distinguish level groups.
Format: Portrait 9:16 mobile canvas. Anchor: `raw_renders/bg_kissa_niche.jpeg`.

9. **bg_kissa_niche** *(existing – Levels 1–3, cavity ≈66% of frame):*
   Front-facing rectangular wall niche carved into warm blonde hinoki wood frame, matte white plaster interior cavity, soft ambient overhead light casting gentle warmth, Japanese modern kissa aesthetic, tall portrait orientation 9:16, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

10. **bg_kissa_niche_mid** *(Levels 4–5, cavity ≈78% of frame):*
    Front-facing wide rectangular wall niche carved into warm blonde hinoki wood frame with thinner side pillars, matte white plaster interior cavity, soft ambient overhead light, Japanese modern kissa aesthetic, tall portrait orientation 9:16, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

11. **bg_kissa_niche_wide** *(Level 6, cavity ≈88% of frame):*
    Front-facing very wide panoramic wall niche carved into warm blonde hinoki wood frame with minimal thin side pillars, matte white plaster interior cavity, soft ambient overhead light, Japanese modern kissa aesthetic, tall portrait orientation 9:16, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

### UI Card Prompts (v2 — echte Balkenformate)
Die v1-Renders waren nahezu quadratisch (`ui_card_kuro` kam als 1606×1702 aus dem Modell) und mussten im Spiel auf Headerbreite gezogen werden. Ab v2 wird das Seitenverhältnis mitgeneriert. Die Karte wird per NineSlice gezeichnet, d.h. nur die Mitte darf gedehnt werden — **Ecken und Kanten müssen deshalb vollständig im äußeren Drittel der Kartenhöhe liegen**, und das Mittelfeld muss eine ruhige, wiederholbare Fläche ohne Ornament sein.
Format: Portrait 9:16 Canvas, Karte horizontal zentriert, großzügiges Weiß über und unter der Karte. Anchor: `raw_renders/bg_kissa_niche.jpeg` für den Ton.

12. **ui_card_kuro** *(Header-Plakette: Score / Bar / Moves):*
    Extremely wide horizontal nameplate bar, aspect ratio 6:1, matte charcoal black kuro steel body with a thin brushed brass pinstripe running along the top and bottom edge, small brass corner brackets at the far left and far right ends only, completely plain and unornamented center field, softly rounded corners, Japanese modern kissa aesthetic, portrait 9:16 canvas with the bar centered horizontally and generous white padding above and below, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

13. **ui_card_hinoki** *(Booster-Tray, trägt Undo / Shuffle / Hammer):*
    Wide horizontal tray bar, aspect ratio 4:1, warm blonde hinoki wood with clean chamfered edges and subtle straight grain, a shallow recessed inner channel running the full length, two small brass end caps at the far left and far right ends only, completely plain and unornamented center field, Japanese modern kissa aesthetic, portrait 9:16 canvas with the bar centered horizontally and generous white padding above and below, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

### Booster Button Prompts (v2)
Die v1-Buttons waren flache App-Icons mit weißen Vektorpfeilen und passen nicht zum taktilen Art-Toy-CMF der Goods. v2 spricht dieselbe Sprache wie die Items: ein physisches Objekt, kein Icon-Glyph. Alle drei quadratisch, gleiche Grundfläche.
Format: Portrait 9:16 Canvas, Objekt mittig. Anchor: `raw_renders/tetsubin_kettle.png` für das CMF.

14. **btn_undo:**
    Single squat matte charcoal black kuro steel push button tile with softly rounded corners, a raised brushed brass counter-clockwise curved arrow sculpted in low relief on its face, tactile matte finish with zero gloss, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

15. **btn_shuffle:**
    Single squat matte charcoal black kuro steel push button tile with softly rounded corners, two raised brushed brass arrows crossing each other in an X sculpted in low relief on its face, tactile matte finish with zero gloss, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

16. **btn_hammer** *(optional — für ein konsistentes Set mitrendern):*
    Single squat matte charcoal black kuro steel push button tile with softly rounded corners, a raised pale hinoki wood mallet sculpted in low relief on its face, tactile matte finish with zero gloss, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Parallax-Hintergrund "Engawa-Garten" (bgl_ Layer)
Statt eines einzelnen Bildes wird der Hintergrund aus freigestellten Ebenen gebaut, damit sich Wolken, Laternen und Tiere unabhängig bewegen können. Die Szene: die Regalnische steht auf einer Engawa-Veranda, dahinter öffnet sich ein Garten — blauer Himmel, ferne Hügel, Wiese, oben hängende Chōchin-Laternen unter dem Dachvorsprung, unten spielen Shiba und Katze.

**Regel für alle Layer:** dieselbe gedeckte Kissa-Palette (Hinoki-Blond, Mattweiß, Matcha, Messing, Azuki), Art-Toy-Matt-Render, kein Fotorealismus, kein Text. Alle Layer außer `bgl_sky` werden freigestellt — daher **reines Weiß (#FFFFFF) als Hintergrund** und keine Bodenschatten. Das mittlere Band hinter der Nische bleibt bewusst leer, damit die Regale lesbar bleiben.
Format aller Layer: Portrait 9:16 Canvas. Die Position im Frame bleibt erhalten — die Layer werden im Spiel deckungsgleich übereinandergelegt (`BG_LAYERS` in `src/main.ts:44`).

17. **bgl_sky** *(Vollbild, statisch, unterste Ebene):*
    Soft pale blue morning sky filling the entire frame, gentle vertical gradient from dusty cornflower blue at the top to warm ivory at the horizon, completely empty with no clouds and no objects, flat matte art-toy poster finish, tall portrait orientation 9:16, no text, no watermark, 8k resolution --style raw

18. **bgl_clouds** *(driftet langsam horizontal):*
    A horizontal band of four simplified rounded stylized clouds in soft chalk white and pale grey, flat matte art-toy shapes with clean silhouettes and no fine detail, spread evenly across the upper third of the frame, tall portrait 9:16 canvas with everything below the cloud band completely empty, pure solid white background (#FFFFFF), no sky gradient, no text, 8k resolution --style raw

19. **bgl_hills** *(statisch, hinter der Nische):*
    A low silhouette range of gentle rolling hills in muted sage green and dusty blue-grey, simplified flat matte art-toy shapes layered in two depths, occupying only the lower third of the frame with a perfectly flat horizontal bottom edge, tall portrait 9:16 canvas with everything above the hills completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

20. **bgl_meadow** *(statisch, sitzt unten auf):*
    A wide strip of soft matcha-green meadow grass with a few simplified tufts and three small white clover blossoms, flat matte art-toy finish, clean straight bottom edge and a gently undulating top edge, occupying only the bottom fifth of the frame, tall portrait 9:16 canvas with everything above completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

21. **bgl_lanterns** *(schwingt sanft, hängt oben):*
    A horizontal row of five round paper chochin lanterns hanging from thin dark cords of differing lengths, alternating warm ivory and soft azuki red, bamboo rib texture and small brass caps, flat matte art-toy finish with a warm glow from within, all cords starting exactly at the very top edge of the frame, occupying only the upper quarter, tall portrait 9:16 canvas with everything below completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

22. **bgl_cat** *(Idle-Bob, unten links):*
    A single small chubby calico cat art toy figurine sitting upright with its tail curled around its paws, matte unglazed ceramic finish in cream white with soft azuki and charcoal patches, simplified rounded geometry, Japanese modern kissa aesthetic, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

23. **bgl_dog** *(Idle-Bob, unten rechts):*
    A single small round shiba inu art toy figurine standing playfully with its curled tail up, matte unglazed ceramic finish in warm toast gold and chalk white, simplified rounded geometry, Japanese modern kissa aesthetic, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Match Feedback FX
Format: Portrait 9:16 mobile canvas with a centered square effect and generous white padding. Primary anchor: `raw_renders/bg_kissa_niche.jpeg`. Optional placement reference: `raw_renders/shelf_wood.png`.

14. **fx_match_burst:**
    Elegant Japanese tea-kissa triple-match celebration effect, centered radial bloom of warm ivory light, brushed brass rays, tiny matcha-green and hinoki-gold diamond sparkles, three subtle concentric seal rings, crisp isolated front-facing graphic, no objects, no text, no numbers, no characters, no floor shadow, portrait 9:16 mobile canvas, generous white padding around the centered square effect, pure solid white background (#FFFFFF), tactile matte art-toy graphic, sharp silhouette edges, 8k resolution --style raw
   

---

## 3. Prompt- & Asset-Workflow

Der komplette Weg von einem Prompt aus Abschnitt 2 bis zum fertigen Asset im Spiel.

### Schritt 1 — Rendern
Prompt aus Abschnitt 2 nehmen, **Master Negative Prompt anhängen**, in Nano Banana Pro rendern.
Immer **Portrait 9:16** wählen — auch für quadratische Objekte. Das Modell liefert sonst Landscape und der Alpha-Crop schneidet Kanten ab.
Bei Layern und Karten den passenden Anchor mitgeben (siehe Prompt-Eintrag), sonst driftet der Farbton weg.

### Schritt 2 — Ablegen
Datei unter ihrem **exakten Asset-Namen** nach `raw_renders/` legen (`.png`, `.jpg` oder `.jpeg`).
Der Dateiname steuert die gesamte Verarbeitung — es gibt keine Konfiguration außerhalb des Namens:

| Prefix | Verarbeitung | Ausgabe |
|---|---|---|
| `bg_` | Resize auf 720px Breite, kein Freistellen. Nischenweite wird gemessen. | `BG_CAVITY_RATIOS` in `src/item_offsets.generated.ts` |
| `bgl_` | Defringe, freigestellt, 720px Breite, **Position im Frame bleibt erhalten** | Parallax-Layer |
| `shelf_` | Defringe, exakter Alpha-Crop, auf 608×184 gezogen | Regalbrett |
| `ui_card_` | Defringe, exakter Alpha-Crop, Höhe auf 128 normalisiert, Breite proportional | NineSlice-Karte |
| `btn_` / `ui_` | Defringe, exakter Alpha-Crop, 256×256 zentriert | Buttons & Icons |
| `fx_` | Defringe, exakter Alpha-Crop, 256×256 zentriert | Match-Effekt |
| Item-ID | Defringe, exakter Alpha-Crop, 256×256, Bottom-Offset gemessen | `ITEM_BOTTOM_OFFSETS` |

Items müssen zusätzlich in `ITEM_IDS` (`scripts/process_assets.js:13`) stehen, sonst werden sie übersprungen.

### Schritt 3 — Verarbeiten
```
npm run process:assets
```
Schreibt nach `public/assets/items/` und regeneriert `src/item_offsets.generated.ts`.
Beide Generate-Werte (Bottom-Offsets, Cavity-Ratios) werden **am fertigen PNG** gemessen — nie im Code hardcoden.

### Schritt 4 — Registrieren
Neue Keys in `PreloadScene.preload()` (`src/main.ts`) laden. `bgl_`-Layer laufen automatisch, sobald sie in `BG_LAYERS` stehen — fehlende Texturen werden still übersprungen, das Spiel bricht also nicht, wenn nur ein Teil der Layer existiert.

### Schritt 5 — Prüfen
```
npm run build && npm run dev
```
Checkliste im Browser:
- Regalbrett sitzt mittig **in** der Nische, ohne den Hinoki-Rahmen zu überlappen
- UI-Karten: Ecken/Messingkanten unverzerrt, Buttons liegen innerhalb des Trays
- Items stehen mit der Unterkante auf der Regallippe auf
- Ein Zug fliegt in einer Parabel zum Zielslot, nicht seitlich herein

### Schritt 6 — Prompt zurückschreiben
Den tatsächlich verwendeten Prompt in Abschnitt 2 aktualisieren, inkl. Versionsnotiz, warum die Vorgängerversion ersetzt wurde. Der Katalog ist die einzige Quelle für Re-Renders.

### Offene Punkte
- `ui_card_kuro` ist noch v1 (nahezu quadratisch) — Header wirkt als dünnes schwarzes Band. Prompt 12 rendern.
- `btn_undo` / `btn_shuffle` sind noch v1 (flache Icons). Prompts 14 / 15 rendern.
- `bg_kissa_niche_mid` hat dieselbe gemessene Nischenweite wie `bg_kissa_niche` (0.6458) — Tier 2 ist damit wirkungslos. Mit stärkerer Betonung auf *thinner side pillars* neu rendern.
- `bgl_*` Layer existieren noch nicht; der Code ist vorbereitet und wartet auf die Assets.
