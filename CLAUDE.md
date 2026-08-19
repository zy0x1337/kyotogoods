# Modern Kyoto Kissa - Goods Sort Game Documentation

## 1. Commands
- `npm install` : Install dependencies
- `npm run dev` : Launch local Vite development server
- `npm run build` : Typecheck and build production bundle
- `npm run cap:android` : Build bundle, sync Capacitor, and launch Android Studio
- `npm run process:assets` : Run Sharp defringing script on `./raw_renders/*.png` -> `./public/assets/items/`

---

## 2. Typografie

Schrift: **M PLUS Rounded 1c** (`@fontsource/m-plus-rounded-1c`, nur Latin 500 + 800 importiert). Stark gerundete japanische Schrift mit deutlich mehr Spiel als eine neutrale Gothic. Wird lokal gebundelt, also offline-tauglich im Capacitor-Build. Vorgänger war Zen Maru Gothic — zu brav.

- `FONT_FAMILY`, `labelStyle(size, color)`, `valueStyle(size, color)` in `src/main.ts` — kein `this.add.text` ohne einen dieser Helper.
- `labelStyle` = Weight 500, Versalien, klein, Messing `#C49A5A`. `valueStyle` = Weight 700, Werte in Creme `#FDFBF7` auf dunklem Grund.
- Header: Label und Wert teilen sich dieselbe x-Mitte bei Origin 0.5, damit die Zahl exakt unter der Wortmitte steht.
- Der Spielstart wartet auf `document.fonts.load(...)`. Phaser rastert Text beim Erzeugen in die Canvas — ohne das Warten bliebe der erste Frame in der Fallback-Schrift stehen.

---

## 3. Nano Banana Pro Asset Generation Catalog

### Hintergrundfarbe: Weiß oder Magenta

Freigestellt wird gegen die Hintergrundfarbe des Renders. Welche zu wählen ist, hängt am Motiv:

- **Dunkle oder kräftig farbige Motive** → `pure solid white background (#FFFFFF)`. Funktioniert seit jeher.
- **Helle, cremefarbene oder weiße Motive** → `pure solid magenta background (#FF00FF)`. **Pflicht**, nicht optional.

Der Grund: der Studio-Hintergrund kommt nie als exaktes Weiß aus dem Modell, sondern mit Vignette. Beim Katzen-Render lief er von 241 bis 251 Grau, während das cremeweiße Fell bei 249 bis 251 liegt — an der Stirn sind Motiv und Hintergrund exakt dieselbe Farbe. Das Keying riss daraufhin eine Kerbe in den Kopf, und bei `btn_undo` fehlte ein ganzes Stück der rechten Kante. Weil dadurch auch die Inhaltsbox schrumpfte, wurden die drei Booster-Buttons noch dazu ungleich groß.

Gegen Magenta ist die Trennung eindeutig: kein Ton der Kissa-Palette kommt ihm nahe (das dunkle Azuki-Rosé liegt weit entfernt). Die Pipeline erkennt den Chroma-Hintergrund automatisch an den Bildecken — es ist **keine Konfiguration nötig**, nur der richtige Prompt. Der Saum wird beim Keying zusätzlich entfärbt, damit kein bunter Rand stehen bleibt.

### Master Negative Prompt (Append to all runs)
hyper-realistic, high gloss reflections, shiny liquid specular, crumbs, baked floor shadows, blurry edges, gradient background, photorealism, text, watermark, logo, perspective tilt, 3d render artifacts, multiple objects, second object, duplicate, collage, grid layout, product lineup

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

### Regalbrett-Prompt (v2)
v1 war ein flaches Brett: ein reiner Helligkeitsverlauf von 231 auf 198 ohne Tiefenkante, die dunkle Lippe nur in den letzten 16 px. Vor dem hellen Shoji-Panel verschwand es fast. v2 zeigt die Materialstärke, damit die Goods sichtbar **auf** dem Brett stehen statt davor zu schweben.

Das Brett wird im Spiel als NineSlice auf die Regalbreite gezogen: **die Mitte muss eine ruhige, wiederholbare Fläche sein**, alle Details gehören an die beiden Enden. Die Auflagelinie wird von der Pipeline am Asset vermessen (`SHELF_PLATFORM_RATIOS`) — die Kantenhöhe darf sich also frei ändern.
Magenta-Hintergrund, weil blondes Hinoki hell ist.

**shelf_wood:**
Single long horizontal shelf board of warm blonde hinoki wood seen from slightly above, aspect ratio 5:1, the flat top surface clearly visible as a lighter plane and the front edge showing a distinct band of material thickness in a deeper toasted walnut tone, a slim brushed brass pin support at each far end, completely plain and unornamented along the middle, straight clean silhouette with softly eased corners, Japanese modern kissa aesthetic, tactile matte finish with zero gloss, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Item-Neuauflagen (v2)
Sechs Goods lesen sich auf dem Regal schlecht. Die Ursachen sind bei allen ähnlich: zu filigran, zu breit, oder eine Silhouette, die bei 72 px nichts mehr aussagt.

Für dieses Spiel zählt vor allem die **Silhouette**: drei gleiche Objekte zu erkennen ist die ganze Mechanik. Also kompakt, ungefähr quadratisch, dicke Formen, klare Umrisslinie — und jedes Item muss sich schon am Umriss von den anderen unterscheiden. Nichts hängt, alles steht auf einer Standfläche.
Magenta-Hintergrund für alle sechs (auch die dunklen — der Abstand zu Magenta ist bei Gusseisen und Messing groß genug).

**chasen_whisk** *(v1 las sich wie ein Käfig oder eine Lampe, nicht wie ein Teebesen):*
Stylized bamboo matcha whisk standing upright on its base, compact and chunky proportions roughly as wide as it is tall, a short cylindrical pale hinoki handle carrying a dense rounded dome of many fine carved tines, the tines reading as one solid rounded mass rather than separate loops, Japanese modern kissa aesthetic, unglazed biscuit and tactile matte wood CMF, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**chashaku_scoop** *(v1 war ein extrem breiter dünner Stab quer über einer Rolle — bei Spielgröße nur noch ein Strich):*
Bamboo tea scoop chashaku resting in a small upright stand, compact composition roughly as wide as it is tall, the scoop angled diagonally rather than horizontally so its curved bowl and thick handle both read clearly, pale blonde bamboo with a chalk white ceramic block base, Japanese modern kissa aesthetic, tactile matte CMF, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**gotoku_trivet** *(v1 wirkte wie eine gezackte Krone):*
Squat round cast iron trivet gotoku with three short stubby rounded posts rising from a thick ring base, compact and heavy proportions, matte charcoal black sand-cast finish with visible grain, blunt rounded tips instead of sharp spikes, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**incense_burner** *(v1 war ein generischer Messingkegel auf einer Scheibe):*
Small round incense burner koro in matte charcoal ceramic with a domed brushed brass lid pierced by a few round vent holes, squat rounded bell-like silhouette sitting on three tiny feet, a single thin wisp of sculpted smoke curling from the top, Japanese modern kissa aesthetic, tactile matte CMF with zero gloss, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**shou_sugi_block** *(v1 war eine flache Kachel und las sich wie ein UI-Element, nicht wie ein Objekt):*
Small solid cube of shou sugi ban charred cedar standing on a shelf, clearly three-dimensional with the top face and one side face visible, deep matte charcoal black with a cracked alligator-skin char texture, a single small brushed brass inlay disc on the front face, softly eased edges, Japanese modern kissa aesthetic, art toy product render, orthographic three-quarter front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**brass_sphere** *(v1 hing an einer Kette — die Goods stehen aber im Regal):*
Faceted brushed brass sphere resting in a shallow charcoal ceramic ring stand, no chain and no suspension, large clean hexagonal facets with a few small pierced dots, compact proportions roughly as wide as it is tall, warm satin brass with zero mirror reflection, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

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
Format: Portrait 9:16 Canvas, Karte horizontal zentriert, großzügiges Weiß über und unter der Karte.

**Kein Anchor bei UI-Karten.** Mit `bg_kissa_niche.jpeg` als Anchor hat das Modell die Nische ein zweites Mal mit ins Bild gerendert — die Pipeline fängt das inzwischen ab (Strategie `widest`), aber der Render bleibt Verschwendung. Farbton stattdessen im Prompt beschreiben.

12. **ui_card_kuro** *(Header-Plakette: Score / Bar / Moves):*
    Extremely wide horizontal nameplate bar, aspect ratio 6:1, matte charcoal black kuro steel body with a thin brushed brass pinstripe running along the top and bottom edge, small brass corner brackets at the far left and far right ends only, completely plain and unornamented center field, softly rounded corners, Japanese modern kissa aesthetic, portrait 9:16 canvas with the bar centered horizontally and generous white padding above and below, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

13. **ui_card_hinoki** *(Booster-Tray, trägt Undo / Shuffle / Hammer):*
    Wide horizontal tray bar, aspect ratio 4:1, warm blonde hinoki wood with clean chamfered edges and subtle straight grain, a shallow recessed inner channel running the full length, two small brass end caps at the far left and far right ends only, completely plain and unornamented center field, Japanese modern kissa aesthetic, portrait 9:16 canvas with the bar centered horizontally and generous white padding above and below, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

### Booster Button Prompts (v3)
v2 waren schwarze Kuro-Steel-Kacheln. Vor dem Gartenhintergrund wirken sie hart und düster — v3 ist heller, runder und freundlicher, bleibt aber in der Palette der Szene (Creme, Matcha, Azuki, Hinoki, Messing).
Format: Portrait 9:16 Canvas, Objekt mittig, **genau ein Objekt im Bild**. Alle drei mit identischem Körper, nur das Relief unterscheidet sich — sonst wirkt die Reihe unruhig.
**Magenta-Hintergrund**, weil der Körper cremefarben ist (siehe oben).

14. **btn_undo:**
    Single chunky rounded-square push button in soft warm cream ceramic with generously rounded corners and a soft pillowy silhouette, a thick raised matcha-green counter-clockwise curved arrow sculpted in smooth low relief on its face, friendly modern art toy look, tactile matte finish with zero gloss, Japanese modern kissa palette, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

15. **btn_shuffle:**
    Single chunky rounded-square push button in soft warm cream ceramic with generously rounded corners and a soft pillowy silhouette, two thick raised azuki-rose arrows crossing each other in an X sculpted in smooth low relief on its face, friendly modern art toy look, tactile matte finish with zero gloss, Japanese modern kissa palette, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

16. **btn_hammer:**
    Single chunky rounded-square push button in soft warm cream ceramic with generously rounded corners and a soft pillowy silhouette, a thick raised blonde hinoki wood mallet sculpted in smooth low relief on its face, friendly modern art toy look, tactile matte finish with zero gloss, Japanese modern kissa palette, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Parallax-Hintergrund "Engawa-Garten" (bgl_ Layer)
Statt eines einzelnen Bildes wird der Hintergrund aus freigestellten Ebenen gebaut, damit sich Wolken, Laternen und Tiere unabhängig bewegen können. Die Szene: die Regalnische steht auf einer Engawa-Veranda, dahinter öffnet sich ein Garten — blauer Himmel, ferne Hügel, Wiese, oben hängende Chōchin-Laternen unter dem Dachvorsprung, unten spielen Shiba und Katze.

**Regel für alle Layer:** dieselbe gedeckte Kissa-Palette (Hinoki-Blond, Mattweiß, Matcha, Messing, Azuki), Art-Toy-Matt-Render, kein Fotorealismus, kein Text. Alle Layer außer `bgl_sky` werden freigestellt — daher **reines Weiß (#FFFFFF) als Hintergrund** und keine Bodenschatten. Das mittlere Band hinter der Nische bleibt bewusst leer, damit die Regale lesbar bleiben.
Format aller Layer: Portrait 9:16 Canvas. `BG_LAYERS` in `src/main.ts` kennt drei Modi:

| Modus | Layer | Verarbeitung |
|---|---|---|
| `cover` | sky, clouds, hills, lanterns | Position im Frame bleibt erhalten, wird wie der Hintergrund cover-skaliert — die Ebenen liegen deckungsgleich übereinander |
| `band` | meadow | auf den Inhalt beschnitten, volle Breite, unten bündig |
| `sprite` | cat, dog | freigestellt, über `xRatio`/`yRatio` platziert |

`band` gibt es, weil der Wiesen-Render unterhalb des Motivs Weißraum ließ (Inhalt endete bei 84 % der Frame-Höhe) — als Vollbild-Ebene hätte das Band in der Luft gehangen. Wenn ein Render sein Motiv nicht bis zur gedachten Kante führt, ist `band` die Reparatur, nicht ein neuer Render.

Die Halo-Entfernung des Defringings läuft für `bgl_`-Vollbild-Ebenen **nicht**: flache Grafik-Layer haben keinen Schlagschatten, dafür absichtlich sehr helle Flächen. Mit aktiver Regel war das Wolken-Layer komplett verschwunden.

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
    *(v2 — Magenta-Hintergrund. Die v1-Fassung auf Weiß ließ sich nicht freistellen: das cremeweiße Fell und der Studio-Hintergrund waren an der Stirn farbgleich.)*
    A single small chubby calico cat art toy figurine sitting upright with its tail curled around its paws, matte unglazed ceramic finish in cream white with soft azuki and charcoal patches, simplified rounded geometry, Japanese modern kissa aesthetic, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

23. **bgl_niche_frame** *(v2 — abgerundete Ecken; v1 war scharfkantig und passte nicht zur runden Formensprache von Buttons und Schrift):*
    Freistehendes Möbel, kein Wandausschnitt. Die weiße Rückwand ist gewollt — die Pipeline stanzt sie aus und misst daran die lichte Nische:
    Front-facing freestanding tall display cabinet made of warm blonde hinoki wood with slim side posts and a flat top and bottom board, generously rounded outer corners and softly rounded inner cavity corners, deep matte white plaster back panel inside the open cavity, small brushed brass corner brackets, no doors and no shelves inside, single isolated object, Japanese modern kissa aesthetic, tall portrait orientation 9:16 with the cabinet filling the central 80% of the frame, orthographic front view, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, art toy product render, 8k resolution --style raw

24. **bgl_dog** *(Idle-Bob, unten rechts):*
    A single small round shiba inu art toy figurine standing playfully with its curled tail up, matte unglazed ceramic finish in warm toast gold and chalk white, simplified rounded geometry, Japanese modern kissa aesthetic, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Match Feedback FX
Format: Portrait 9:16 mobile canvas with a centered square effect and generous white padding. Primary anchor: `raw_renders/bg_kissa_niche.jpeg`. Optional placement reference: `raw_renders/shelf_wood.png`.

14. **fx_match_burst:**
    Elegant Japanese tea-kissa triple-match celebration effect, centered radial bloom of warm ivory light, brushed brass rays, tiny matcha-green and hinoki-gold diamond sparkles, three subtle concentric seal rings, crisp isolated front-facing graphic, no objects, no text, no numbers, no characters, no floor shadow, portrait 9:16 mobile canvas, generous white padding around the centered square effect, pure solid white background (#FFFFFF), tactile matte art-toy graphic, sharp silhouette edges, 8k resolution --style raw
   

---

## 4. Prompt- & Asset-Workflow

Der komplette Weg von einem Prompt aus Abschnitt 3 bis zum fertigen Asset im Spiel.

### Schritt 1 — Rendern
**Dateiformat:** PNG bevorzugen. JPEG funktioniert (der ganze bestehende Katalog ist JPEG) — freigestellt wird ohnehin gegen Weiß, nicht über einen Alphakanal. JPEG-Ringing an harten Kanten hinterlässt aber graue Sprenkel, und bei `bgl_`-Layern fällt das stärker auf als bei Items, weil die Layer auf volle Bildschirmbreite skaliert werden statt auf 256 px. `bgl_sky` ist egal, das Layer ist deckend.

Prompt aus Abschnitt 3 nehmen, **Master Negative Prompt anhängen**, in Nano Banana Pro rendern.
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
Schreibt nach `public/assets/items/` und regeneriert `src/item_offsets.generated.ts` mit drei Exports:

- `ITEM_BOTTOM_OFFSETS` — sichtbare Unterkante je Item
- `BG_CAVITY_RATIOS` — lichte Nischenweite je Hintergrund
- `AVAILABLE_ASSETS` — alles, was tatsächlich in `public/assets/items/` liegt

Alle drei werden **am fertigen PNG** gemessen bzw. gelistet — nie im Code hardcoden.
`AVAILABLE_ASSETS` steuert das Laden optionaler Assets: der Vite-Dev-Server liefert für fehlende Dateien das HTML-Fallback mit Status 200, der Phaser-Loader würde daran hängenbleiben.

**Freistellen in zwei Stufen.** Erst wird die Maske in zusammenhängende Flächen zerlegt, dann erst die Bounding-Box gezogen:

- `union` (Items, Buttons, FX): alle Flächen ab 8 % der größten zusammen. Abgesetzte Details wie der Butterwürfel auf dem Toast oder die Goldflocke auf dem Yokan bleiben erhalten, Defringe-Krimskrams fällt raus.
- `widest` (UI-Karten, Regalbrett): die Fläche mit dem breitesten Seitenverhältnis, als einzige. Wenn das Modell ein zweites Objekt mit ins Bild legt, ist das Störobjekt meist flächiger als die gesuchte Leiste — nach Fläche zu wählen greift daneben.

**Innenlöcher.** Freigestellt wird gegen Weiß — bei einem cremeweißen Objekt trifft das auch dessen hellste Stellen. Bei der Katze riss das Löcher in Kopf und Fell. `fillInteriorHoles` flutet nach dem Keying von den Bildrändern durch die transparenten Pixel; was dabei nicht erreicht wird, liegt im Objektinneren und bekommt seine Deckung zurück. Weiche Außenkanten bleiben unangetastet, weil sie vom Rand aus erreichbar sind.

**Weiche Ränder.** `trimSoftEdges` schrumpft die Box, solange eine Randreihe unter 90 % Deckung liegt. Für Band-Layer nötig: der Wiesen-Render lief rechts und unten weich aus, die Box umfasste diese fast transparenten Reihen noch — im Spiel blieb dadurch unten und unten rechts eine Lücke zum Bildrand.

**Schattenränder.** Der weiche Schlagschatten der Renders liegt auf weißem Papier und kommt deshalb als hellgrauer, voll deckender Streifen an — die Alpha-Logik greift dort nicht, und auf dem Putz-Hintergrund des Spiels liest er sich als Glühen unter dem Objekt. `trimShadowEdges` schrumpft die Box kantenweise, solange eine Randreihe zu ≥ 90 % aus unbunten hellen Pixeln besteht. Das läuft **nur für `ui_card_` und `shelf_`** — flache Rechtecke, bei denen der Streifen auffällt. Global angewandt hat es flache helle Items zerlegt (ein Bambuslöffel schrumpfte von 301 auf 64 px Höhe), weil blasses Holz demselben Muster entspricht.

Anschließend zählt der Crop deckende Pixel pro Zeile/Spalte und ignoriert Reihen unter 0,5 % Deckung. Ohne das hatte ein einzelnes Streupixel (JPEG-Artefakt, Rest einer Signatur) die Box von `ui_card_kuro` auf die doppelte Höhe aufgebläht.

Das Log meldet `N relevante Objekte im Render` — steht da mehr als 1, hat der Render Ballast und die Strategie hat geraten. Dann lieber neu rendern.

### Schritt 4 — Registrieren
Pflicht-Assets in `PreloadScene.preload()` (`src/main.ts`) mit `this.load.image(...)` laden, optionale mit `loadOptional(key)`.
`bgl_`-Layer und höhere BG-Tiers brauchen gar nichts: sie stehen in `BG_LAYERS` bzw. `BG_TIERS` und werden geladen, sobald sie im Manifest auftauchen. Fehlt ein Layer, wird er still übersprungen.

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
Den tatsächlich verwendeten Prompt in Abschnitt 3 aktualisieren, inkl. Versionsnotiz, warum die Vorgängerversion ersetzt wurde. Der Katalog ist die einzige Quelle für Re-Renders.

### Das Regalgehäuse
`bgl_niche_frame` kommt mit geschlossener Putzrückwand aus dem Modell. Die Pipeline stanzt sie aus (`knockOutPanel`): Flutfüllung von der Bildmitte über unbunte, mittelhelle Pixel. Der Holzrahmen ist stark warm (Kanalspreizung > 80) und stoppt die Füllung zuverlässig, der reinweiße Außenbereich wird nie erreicht.

Das Loch ist danach die exakte lichte Nische und wird als `BG_CAVITY_RECTS` exportiert — präziser als die Helligkeits-Heuristik, weil es direkt aus dem Alphakanal kommt. Zusätzlich geht die äußere Kontur als `BG_FRAME_RECTS` mit: das Spiel skaliert das Möbel danach so, dass es vollständig zwischen Header und Booster-Reihe steht und unten auf der Wiese aufsitzt. Cover-Scaling hätte es oben und unten angeschnitten — dann liest es sich wie ein Wandausschnitt statt wie ein Möbel im Garten.

Im Gehäuse liegt ein Shoji-Panel (Deckkraft 0.55) zwischen Garten und Regalbrettern. Ohne das milchige Papier stehen die Goods direkt auf Himmel und Hügeln und verlieren ihren Kontrast; bei 0.9 war der Garten dahinter komplett weg.

### Offene Punkte
- **Sechs Item-Neuauflagen offen** (Abschnitt oben): `chasen_whisk`, `chashaku_scoop`, `gotoku_trivet`, `incense_burner`, `shou_sugi_block`, `brass_sphere`.
- **`bgl_cat` hat einen Magenta-Stich.** Die Chroma-Fläche hat auf das cremefarbene Fell abgestrahlt; der Despill greift nur bei gering gesättigten Pixeln und lässt die Flecken deshalb rosé. Neu rendern — entweder mit größerem Abstand zwischen Figur und Hintergrund oder gegen ein Chroma, das nicht in Richtung Azuki spillt.
- `bgl_niche_frame` v2 mit runden Ecken (Prompt 23) noch offen.
- `bg_kissa_niche_mid` hat dieselbe gemessene Nischenweite wie `bg_kissa_niche` — nur relevant, falls der Fallback ohne `bgl_niche_frame` gebraucht wird.
- `ui_card_kuro` / `ui_card_hinoki` fertig, werden aber **nicht gezeichnet** — der Header steht frei über der Szene. `addCardNineSlice` bleibt im Code.
