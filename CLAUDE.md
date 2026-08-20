# Modern Kyoto Kissa - Goods Sort Game Documentation

## 1. Commands
- `npm install` : Install dependencies
- `npm run dev` : Launch local Vite development server
- `npm run build` : Typecheck and build production bundle
- `npm run cap:android` : Build bundle, sync Capacitor, and launch Android Studio
- `npm run process:assets` : Run Sharp defringing script on `./raw_renders/*.png` -> `./public/assets/items/`

---

## 1a. Renderauflösung (DPR)

Phaser rendert im Scale-Modus `RESIZE` in **CSS-Pixeln**: die Canvas bekommt exakt so viele Pixel, wie sie CSS-Pixel breit ist, und das Gerät bläst sie danach auf seine physischen Pixel auf. Auf einem Telefon mit `devicePixelRatio` 3 wird so jedes gerenderte Pixel zu einem 3×3-Block — das war die flächige Unschärfe im ersten Web-Deploy.

Deshalb läuft das Spiel im Modus **`NONE`** mit `zoom: 1 / DPR`: die Canvas bekommt die volle Geräteauflösung (412×800 CSS → 1236×2400 Backingstore), `zoom` zieht sie per CSS wieder auf die richtige Anzeigegröße. Der Modus koppelt als einziger Auflösung und Anzeigegröße voneinander los — `zoom` wird in `RESIZE` komplett ignoriert.

Konsequenzen, die beim Weiterbauen zählen:

- **Weltkoordinaten sind Gerätepixel.** Alles Sichtbare hängt an `getLayoutScale()`, das den Faktor mitführt. Ein absoluter Pixelwert ohne diesen Faktor ist auf einem 3×-Display ein Drittel zu klein — das `WinModalScene` war genau dieser Fall.
- Dinge, die aus Weltdistanzen abgeleitet werden und *keine* Pixel sind (Tween-Dauern), müssen mit `/ itemScale` zurück in Design-Pixel gerechnet werden.
- `MAX_DPR` in `src/main.ts` ist der Perf-Hebel: die Szene stapelt mehrere bildfüllende Ebenen, die Füllrate wächst quadratisch mit dem Faktor. Ruckelt es auf schwachen Geräten, ist 2 der nächste Schritt.
- Im Modus `NONE` folgt die Canvas dem Container nicht von selbst. Drehung und ein-/ausfahrende Browserleisten werden über einen `resize`-Listener nachgezogen.
- Die Texturen müssen mitziehen: bei 720 px Layerbreite gegen 1236 px Canvas skaliert die Pipeline-Ausgabe hoch, und die Unschärfe ist wieder da. Siehe Abschnitt 4, Schritt 2.

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

Das Brett wird im Spiel **gleichmäßig skaliert** gezeichnet, nicht per NineSlice. NineSlice zeichnet seine Endkappen in Texturgröße; bei einem Brett, das auf rund 45 % herunterskaliert wird, wären die Messingstifte an den Enden doppelt so groß wie das Holz daneben. Die Höhe folgt dem Seitenverhältnis der Textur, es wird also nichts verzerrt — die Mitte muss deshalb **nicht** wiederholbar sein.

Die Stifte an den Enden sind die Befestigung: das Brett wird so breit gezogen, dass sie den Rahmen berühren. `SHELF_CAVITY_FILL` in `src/main.ts` ist dafür am Asset gemessen — das ausgestanzte Loch endet an der inneren Schattenkante des Putzpanels, das sichtbare Holz beginnt 6 von 402 px weiter außen, also Faktor 1.015.

Die Auflagelinie wird von der Pipeline am Asset vermessen (`SHELF_PLATFORM_RATIOS`) — die Kantenhöhe darf sich also frei ändern.
Magenta-Hintergrund, weil blondes Hinoki hell ist.

**shelf_wood:**
Single long horizontal shelf board of warm blonde hinoki wood seen from slightly above, aspect ratio 5:1, the flat top surface clearly visible as a lighter plane and the front edge showing a distinct band of material thickness in a deeper toasted walnut tone, a slim brushed brass pin support at each far end, completely plain and unornamented along the middle, straight clean silhouette with softly eased corners, Japanese modern kissa aesthetic, tactile matte finish with zero gloss, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Item-Neuauflagen (v2)
Sieben Goods lesen sich auf dem Regal schlecht. Die Ursachen sind bei allen ähnlich: zu filigran, zu breit, oder eine Silhouette, die bei 72 px nichts mehr aussagt.

Ein Goods wird mit `ITEM_SIZE` (58 px Design) gezeichnet. Die Bottom-Offsets der Pipeline rechnen in `ITEM_OFFSET_BASE` (72 px) — wird die Anzeigegröße geändert, muss der Offset denselben Faktor bekommen, sonst schweben die Goods über dem Brett.

Für dieses Spiel zählt vor allem die **Silhouette**: drei gleiche Objekte zu erkennen ist die ganze Mechanik. Also kompakt, ungefähr quadratisch, dicke Formen, klare Umrisslinie — und jedes Item muss sich schon am Umriss von den anderen unterscheiden. Nichts hängt, alles steht auf einer Standfläche.
Magenta-Hintergrund für alle sieben (auch die dunklen — der Abstand zu Magenta ist bei Gusseisen und Messing groß genug).

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

**cast_iron_bell** *(v1 hing frei in der Luft — wie `brass_sphere`; die Goods stehen aber im Regal):*
Small cast iron furin wind bell resting upright on a low charcoal ceramic ring stand, no cord and no suspension, squat rounded dome silhouette roughly as wide as it is tall, matte charcoal black sand-cast finish with visible grain and a thin brushed brass rim band, a short pale paper tanzaku strip tucked against the base rather than dangling, Japanese modern kissa aesthetic, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Stilwechsel "Yoru no Kissa" — Messungen aus den Testrenders

Der bisherige Katalog liest sich als Kinderoptik: Mittagslicht, Pastellpalette, zwei Maskottchentiere, kissenweiche Formen. Dazu ist die Gartenszene off-theme, ein Kissa ist ein Innenraum. Der neue Rahmen ist ein Laden nach Feierabend: dunkler Grund, gerichtetes Licht, gedeckte Palette.

Getestet wurde an drei Renders statt am ganzen Katalog. Was dabei herauskam, gilt unabhaengig vom gewaehlten Stil:

**Bei 56 px zaehlen genau drei Dinge:** Umriss, eine dominante Farbe, ein Akzent. Mikrotextur ist messbar weg -- Gusskorn und Rostflecken der Tetsubin sind bei Spielgroesse nicht mehr vorhanden. Wer sie rendert, rendert fuer den Papierkorb.

**Helligkeit muss vorgegeben werden, nicht erhofft.** Der fotorealistische Chawan kam trotz "cremeweisses Biskuitporzellan" bei mittlerer Helligkeit 107 heraus -- ein Mittelgrau, exakt so hell wie das Gusseisen daneben. Derselbe Gegenstand als flache Grafik kam bei 213 heraus, weil die Form eine Farbe *zugewiesen* bekam. Wertabstand hell zu dunkel: 77 Punkte beim Foto, 153 bei der Grafik.

**Der Hintergrund darf im Lichtband nicht so hell sein wie die Objekte.** Gemessen: Bloom bei 109 bis 141, Objekte bei 103 bis 107. Kontrastverhaeltnis rund 1.3:1, die Goods loesen sich darin auf. Zielwert fuer das Lichtband: 40 bis 60.

**Fotorealistisch und flach gedruckt beissen sich nicht.** Bei Texturgroesse schon, bei 56 px nicht mehr -- die Mikrotextur, die den Bruch erzeugt, ist dann weg. Was kollidiert, ist der *Inhalt* eines Hintergrunds (Perspektive, Architektur, Raster), nicht seine Flachheit.

**Groessen normalisieren sich nicht ueber die Bounding Box.** Die Pipeline zieht jedes Item auf 384 px Kantenlaenge, die Tetsubin deckt davon aber nur 47 % ab (der Buegelbogen ist Luft), der Chawan 75 %. Gleiche Box heisst dadurch ungleiche sichtbare Masse. Der Faktor gehoert aus der gemessenen Deckung abgeleitet: `sqrt(0.47 / 0.75) = 0.79` -- und genau bei 0.78 sieht das Paar per Auge richtig aus. Offen: als Export aus der Pipeline statt als Handarbeit in `ITEM_SIZE_FACTORS`.

### Item-Stil v4 — echtes Kiri-e

v3 sollte geschnittenes Papier werden und wurde flache Vektorgrafik mit Sticker-Kontur: keine Faser, keine Schnittkante, kein Lagenversatz. Der Grund war die Formulierung. "kiri-e cut paper depiction" liest das Modell als *Illustrationsstil* und greift zu Flat Design.

**Der Hebel: nicht nach einem Stil fragen, sondern nach einer Fotografie eines physischen Objekts.** "Overhead photograph of a real hand-cut washi paper collage" laesst das Modell tatsaechlich Papier rendern -- Kozo-Fasern, harte Kantenschatten zwischen den Lagen, Tonschwankungen im Bogen. Dazu ein aggressives Negativ gegen alles Vektorhafte.

Pruefkriterium am Render: **Kantenschatten zwischen den Lagen und sichtbare Faser.** Fehlt beides, ist es wieder Vektor. Auf die Schnittkante zoomen -- ist sie mathematisch glatt, hat das Modell gemogelt.

**chawan_cup (v4):**
Overhead photograph of a real hand-cut washi paper collage of a squat chawan tea bowl, a physical artwork made of five separate sheets of Japanese kozo paper cut with a blade and stacked, every cut edge showing the tiny nicks and slight wobble of a real hand-held knife and never a perfectly smooth machine curve, visible long kozo fibres and a faint tooth in every sheet, gentle mottling and uneven dye across each sheet so no colour is perfectly uniform, each layer casting a crisp hairline shadow onto the layer beneath it so the stack reads as physically thick, absolutely no painted shading and no gradient within a sheet, the body cut from very pale bone white paper as bright as fresh paper, a pronounced flared lip and a clearly separated tall foot so the outline is never a plain cylinder, one flat deep matcha green ellipse of paper for the tea surface, one small sometsuke indigo blue four-petal motif on the body, bold unmistakable silhouette that stays readable at thumbnail size, Japanese modern kissa subject, single isolated object, lit by soft even frontal light with no shadow falling onto the background, shot straight down and perfectly square to the camera, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), sharp silhouette edge definition, 8k resolution --style raw

**tetsubin_kettle (v4):**
Overhead photograph of a real hand-cut washi paper collage of a squat cast iron tetsubin kettle, a physical artwork made of six separate sheets of Japanese kozo paper cut with a blade and stacked, every cut edge showing the tiny nicks and slight wobble of a real hand-held knife and never a perfectly smooth machine curve, visible long kozo fibres and a faint tooth in every sheet, gentle mottling and uneven dye across each sheet so no colour is perfectly uniform, each layer casting a crisp hairline shadow onto the layer beneath it so the stack reads as physically thick, absolutely no painted shading and no gradient within a sheet, the body cut from deep charcoal black paper, a narrow band of pale warm grey paper laid along the very top edge of the body reading as a rim of light so the black shape separates from a dark ground, a short angled spout cut as its own sheet, one small raised lid knob, a tall wide arch handle cut from warm brass gold paper with genuinely open space inside the arch, the handle deliberately large so it dominates the silhouette, bold unmistakable silhouette that stays readable at thumbnail size, Japanese modern kissa subject, single isolated object, lit by soft even frontal light with no shadow falling onto the background, shot straight down and perfectly square to the camera, centered on a portrait 9:16 canvas with generous even padding, pure solid white background (#FFFFFF), sharp silhouette edge definition, 8k resolution --style raw

**Negativ fuer alle v4-Items** (ersetzt das Master-Negativ, der Anti-Vektor-Teil ist hier der wichtige):
vector, flat design, sticker, die cut outline, uniform stroke, keyline, clip art, icon, app icon, logo, perfectly smooth bezier curve, digital illustration, cel shading, airbrush, gradient, glossy, specular, 3d render, photorealistic ceramic, drop shadow on the background, chibi, kawaii, pastel colours, cartoon, childrens toy, text, watermark, multiple objects, second object, duplicate, collage of several items, grid layout, product lineup

**Farb- und Formmatrix.** Bevor die restlichen 18 Items neu gerendert werden: keine zwei Goods duerfen dieselbe Kombination aus dominanter Farbe und Grundform haben. Heute sind `chawan_cup`, `kuro_mame_dome` und `dango_plate` alle "runde Schale", und `copper_caddy`, `matcha_roll`, `coldbrew_flask` und `chashaku_scoop` alle "Zylinder". Pruefung je Item, drei Schritte: auf 8 px weichzeichnen, auf zwei Farben reduzieren, als reine schwarze Silhouette -- jedes Mal muss es unterscheidbar bleiben.

Sometsuke-Blau (Blau auf weissem Porzellan) ist ausdruecklich Teil der Palette. Es war in der alten Palette nicht vorgesehen, ist aber eine der kanonischsten japanischen Keramiktraditionen und liefert den Akzent, den ein zweites weisses Item braucht.

### Item-Katalog v4 — Stilklausel und Matrix

Ersetzt die Abschnitte "Core Item Prompts" und "Item-Neuauflagen (v2)". Gemessen an `chawan_cup` und `tetsubin_kettle`, die beide nach dieser Vorlage entstanden sind: Helligkeit 186 bzw. 75, Deckung 76 % bzw. 40 %.

**Aufbau eines Prompts:** `Overhead photograph of a real hand-cut washi paper collage of ` + Motivzeile aus der Matrix + Stilklausel. Die Stilklausel gibt es in zwei Fassungen, die sich nur in der Hintergrundfarbe unterscheiden — welche gilt, steht in der Matrix.

**Stilklausel (Magenta, fuer helle Motive):**
, a physical artwork made of separate sheets of Japanese kozo paper cut with a blade and stacked, every cut edge showing the tiny nicks and slight wobble of a real hand-held knife and never a perfectly smooth machine curve, visible long kozo fibres and a faint tooth in every sheet, gentle mottling and uneven dye across each sheet so no colour is perfectly uniform, each layer casting a crisp hairline shadow onto the layer beneath it so the stack reads as physically thick, absolutely no painted shading and no gradient within a sheet, bold unmistakable silhouette that stays readable at thumbnail size, the object standing on its own base with nothing hanging and nothing floating, Japanese modern kissa subject, single isolated object, lit by soft even frontal light with no shadow falling onto the background, shot straight down and perfectly square to the camera, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), sharp silhouette edge definition, 8k resolution --style raw

**Stilklausel (Weiss, fuer dunkle und kraeftig farbige Motive):** identisch, nur `pure solid white background (#FFFFFF)` statt Magenta.

**Negativ fuer alle v4-Items:**
vector, flat design, sticker, die cut outline, uniform stroke, keyline, clip art, icon, app icon, logo, perfectly smooth bezier curve, digital illustration, cel shading, airbrush, gradient, glossy, specular, 3d render, photorealistic ceramic, drop shadow on the background, chibi, kawaii, pastel colours, cartoon, childrens toy, text, watermark, multiple objects, second object, duplicate, collage of several items, grid layout, product lineup

**Farb- und Formmatrix.** Keine zwei Goods teilen sich dieselbe Kombination aus Grundform und dominanter Farbe. Vier Items sind bewusst schwarz — sie bilden die dunkle Stufe, gegen die die hellen lesbar werden.

| Item | Grundform | Dominante Farbe | Akzent | Grund |
|---|---|---|---|---|
| chawan_cup | breite flache Schale | Knochenweiss | Sometsuke-Blau, Matcha | Magenta |
| tetsubin_kettle | Kanne mit Buegelbogen | Anthrazit | Messing | Weiss |
| chasen_whisk | Tinendom auf Zylinder | blasses Bambus | Anthrazit-Schnur | Magenta |
| kissa_toast | stehende Scheibe | Toastgold | Buttergelb | Magenta |
| dango_stick | drei Kugeln senkrecht | Dango-Rosa | Creme, Matcha | Magenta |
| yokan_prism | Dreieckskeil | Azuki-Bordeaux | Blattgold | Weiss |
| copper_caddy | hoher Zylinder | Kupfer | Messing | Weiss |
| origami_dripper | facettierter Kegel | Salbeigruen | blondes Holz | Weiss |
| matcha_roll | liegende Rolle, Spirale vorn | Matchagruen | Creme-Spirale | Weiss |
| shou_sugi_block | Wuerfel in Dreiviertelsicht | Sumi-Schwarz | Zinnober | Weiss |
| coldbrew_flask | Flasche mit Hals | Kaffeebraun | Eisgrau, Kork | Magenta |
| brass_sphere | Kugel im Ringstaender | Messing | Anthrazit | Weiss |
| matcha_montblanc | Streifendom auf Sockel | Kinako-Ocker | Kastanie | Magenta |
| chashaku_scoop | Diagonale auf Block | Kreideweiss | Bambus | Magenta |
| incense_burner | Kuppeldeckel auf drei Fuessen | Elfenbein | Messing | Magenta |
| mizuhiki_knot | flache verschlungene Rosette | Azuki-Bordeaux | Creme | Magenta |
| gotoku_trivet | Ring mit drei Stollen | Anthrazit | keiner | Weiss |
| kuro_mame_dome | Kuppel in flacher Schale | Aubergine-Schwarz | Kreideweiss | Magenta |
| dango_plate | breite flache Ellipse | Salbeigrau | Goldlinie | Magenta |
| cast_iron_bell | Glocke auf Ringstaender | Anthrazit | Messing, Papier | Weiss |

Pruefung je Item, drei Schritte: auf 8 px weichzeichnen, auf zwei Farben reduzieren, als reine schwarze Silhouette. Jedes Mal muss es unterscheidbar bleiben.

**Motivzeilen:**
- **chasen_whisk:** a bamboo matcha whisk standing upright, compact and roughly as wide as it is tall, a short pale bamboo handle carrying one dense rounded dome of many fine tines cut as a single solid mass rather than separate loops, a thin charcoal binding cord around the base of the dome
- **kissa_toast:** a thick slice of shokupan toast standing upright on its crust, a warm toast gold crust cut as a border around a pale cream crumb, one small bright butter yellow cube resting on the top edge
- **dango_stick:** three round dango balls stacked vertically on a short pale skewer, the balls in dango pink and chalk white and matcha green from top to bottom, the skewer ending in a small block base so the object stands upright
- **yokan_prism:** a thick triangular wedge of azuki yokan jelly, deep maroon purple paper with razor sharp bevelled edges, one tiny brass gold foil flake near the top corner
- **copper_caddy:** a tall cylindrical tea caddy in warm copper paper with a flush brass gold lid and a single horizontal seam line, architectural and completely plain
- **origami_dripper:** a conical coffee dripper in sage green paper with a few sharp vertical facets, resting on a round pale blonde wooden ring base
- **matcha_roll:** a matcha roll cake lying on its side with the spiral end facing the viewer, a deep matcha green sponge cut as one broad band spiralling around a cream white centre
- **shou_sugi_block:** a solid cube of charred shou sugi ban cedar seen slightly from the front left so the top face and one side face both read, deep sumi black paper with a cracked char pattern cut into it, one small vermilion inlay disc on the front face
- **coldbrew_flask:** a cold brew flask with a narrow neck and a broad shoulder, the glass cut from very pale ice grey paper and the coffee inside cut from deep roasted coffee brown paper filling the lower two thirds, one small pale cork stopper
- **brass_sphere:** a faceted brass sphere resting in a shallow charcoal ceramic ring stand, warm brass gold paper with a few large flat facets, no chain and no suspension
- **matcha_montblanc:** a small mont blanc cake, a rounded dome built from many narrow strips of kinako ochre paper laid side by side like piped cream, sitting on a short cream base, one small dark chestnut on top
- **chashaku_scoop:** a bamboo tea scoop resting diagonally across a small chalk white ceramic block, the scoop in pale blonde bamboo paper with its curved bowl clearly visible, the block plain and rectangular
- **incense_burner:** a small round incense burner koro in warm ivory ceramic paper with a domed brass gold lid pierced by a few round vent holes, standing on three tiny feet, one thin wisp of pale smoke curling from the top
- **mizuhiki_knot:** a mizuhiki knot of stiff cord tied into a flat interlaced rosette, deep azuki maroon and cream white cords woven over and under each other, the knot resting on a small pale base
- **gotoku_trivet:** a squat round cast iron trivet with three short stubby rounded posts rising from a thick ring base, matte charcoal black paper, blunt rounded tips instead of spikes
- **kuro_mame_dome:** a low rounded mound of glazed kuromame black beans in deep aubergine black paper, sitting in a small shallow chalk white dish
- **dango_plate:** a wide shallow stoneware plate seen from slightly above so it reads as one broad flat ellipse, sage grey green paper with a single toasted gold rim line, completely empty
- **cast_iron_bell:** a small cast iron furin wind bell standing upright on a low charcoal ring stand, a squat rounded dome with a flared rim, matte charcoal black paper with a thin brass gold rim band, a short pale paper tanzaku strip tucked against the base rather than dangling

### Hintergrund fuer Reve

Reve nimmt keine Midjourney-Flags und hat kein eigenes Negativfeld -- Ausschluesse gehoeren als Satz in den Prompt, das Seitenverhaeltnis wird in der Oberflaeche gesetzt (9:16). Deshalb Prosa statt Stichwortkette:

A flat, hand-printed wall of a quiet Japanese tea house at night, shown perfectly straight on with no perspective, no room corner, no floor and no ceiling. The image is a stencil print on washi paper: completely flat areas of ink with no shading and no rendering, visible paper fibre across the whole surface, and only two inks, a deep indigo black and a muted warm ochre, printed slightly out of register so the colour plates sit a hair apart. Faint horizontal wood grain lines are barely visible inside the dark ink. A single broad and very soft ochre glow sits low in the upper half like a distant ember. The entire image stays dark, and even its brightest area is no more than a third as bright as white. The wall is empty: no lamps, no windows, no shoji screens, no doorways, no curtains, no furniture, no shelves, no people, no animals and no writing. The composition runs edge to edge with no border, no margin and no printed frame around it.

Zielwerte am fertigen Bild: Lichtband 40 bis 60 Helligkeit, dunkle Zonen unter 30. Ueber 100 loesen sich die Goods darin auf (gemessen am ersten Versuch: Bloom 141 gegen Objekte 107).

### Vollbild-Layout (v3) — noch nicht gerendert

Der Rahmen wird heute *zwischen* Header und Booster-Reihe eingepasst und ist mit Seitenverhaeltnis 0.44 schmaler als ein Telefon (0.46 bis 0.51). Randlos ginge deshalb nur mit Verzerren oder mit Anschnitt oben und unten. Die drei Renders unten loesen das am Asset statt im Code: das Moebel bringt selbst Handy-Format mit.

Pflichten aus der Pipeline, die nicht verhandelbar sind:
- Der Magenta-Rand links und rechts muss bleiben. `detectKeyColor` liest den Hintergrund an den Bildecken; ohne Rand wuerde das Keying das Holz selbst treffen. Im Spiel liegt er ausserhalb des Bildschirms.
- Die Rueckwand bleibt geschlossener weisser Putz. `knockOutPanel` flutet sie von der Bildmitte aus und misst daran `BG_CAVITY_RECTS` -- ohne Rueckwand gibt es keine Nischenvermessung.
- Das Brett wird gleichmaessig auf Nischenbreite skaliert. Bei fast voller Bildschirmbreite waere es mit dem alten Seitenverhaeltnis rund 40 px hoch, daher 12:1.

**bgl_niche_frame (v3):**
Front-facing freestanding tall display cabinet made of warm blonde hinoki wood, the cabinet fills the entire height of the canvas with its flat top board touching the very top edge and its flat bottom board touching the very bottom edge, slim vertical side posts, an even magenta margin on the left and right side only, the open inner cavity as large as the structure allows and occupying at least 88% of the cabinet height and 84% of its width, generously rounded outer corners and softly rounded inner cavity corners, deep matte white plaster back panel filling the entire cavity as one closed surface, small brushed brass corner brackets, no doors and no shelves and no crossbars inside the cavity, single isolated object, Japanese modern kissa aesthetic, tall portrait orientation 9:16, orthographic front view, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, art toy product render, 8k resolution --style raw

**shelf_wood (v3):**
Single long horizontal shelf board of warm blonde hinoki wood seen from slightly above, extremely wide and slim proportions with an aspect ratio of 12:1, the flat top surface clearly visible as a lighter plane and the front edge showing a distinct narrow band of material thickness in a deeper toasted walnut tone, a slim brushed brass pin support at each far end flush with the board ends, completely plain and unornamented along the middle, straight clean silhouette with softly eased corners, Japanese modern kissa aesthetic, tactile matte finish with zero gloss, art toy product render, orthographic front view, centered on a portrait 9:16 canvas with generous even padding above and below the board, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**bg_kissa_garden (neu):**
Vollbild-Hintergrund hinter dem randlosen Rahmen. Prefix `bg_`, wird also nicht freigestellt -- deshalb kein Hintergrundfarben-Hinweis im Prompt. Der Dunst im mittleren Band ist mitgerendert, damit das halbtransparente Shoji-Rechteck aus dem Code entfallen kann. Im Negativ fehlt bewusst `gradient background`: der Himmelsverlauf ist hier das Motiv.
Japanese modern kissa garden backdrop filling the entire frame edge to edge, soft pale blue morning sky with a gentle vertical wash from dusty cornflower blue at the top to warm ivory at the horizon, three or four simplified rounded chalk white clouds in the upper third, a low silhouette range of gentle rolling hills in muted sage green and dusty blue-grey layered in two depths across the lower third, a strip of soft matcha-green meadow with a few simplified tufts along the bottom fifth, the entire middle band left calm and nearly empty and softly hazed as if seen through shoji paper so that objects placed in front of it stay readable, flat matte art-toy poster finish with zero gloss, no lanterns, no animals, no buildings, no people, no border and no margin, tall portrait orientation 9:16, orthographic front view, 8k resolution --style raw

Offen im Code, sobald die Renders da sind: der Rahmen muss von Einpassen auf Cover-Scaling ueber `BG_FRAME_RECTS` umgestellt werden, und das Shoji-Rechteck in `GameScene.create` entfaellt.

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
| `bg_` | Resize auf `FRAME_WIDTH` (1440px) Breite, kein Freistellen. Nischenweite wird gemessen. | `BG_CAVITY_RATIOS` in `src/item_offsets.generated.ts` |
| `bgl_` | Defringe, freigestellt, 1440px Breite, **Position im Frame bleibt erhalten** | Parallax-Layer |
| `bgl_` (Sprite) | Defringe, exakter Alpha-Crop, Höhe 1024 | Katze, Shiba |
| `shelf_` | Defringe, exakter Alpha-Crop, auf 1216px Breite gezogen | Regalbrett |
| `ui_card_` | Defringe, exakter Alpha-Crop, Höhe auf 256 normalisiert, Breite proportional | NineSlice-Karte |
| `btn_` / `ui_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Buttons & Icons |
| `fx_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Match-Effekt |
| Item-ID | Defringe, exakter Alpha-Crop, 384×384, Bottom-Offset gemessen | `ITEM_BOTTOM_OFFSETS` |

Die Zielgrößen stehen als Konstanten oben in `scripts/process_assets.js` und sind an der Canvasbreite bei `devicePixelRatio` 3 bemessen (rund 1240 px, siehe Abschnitt 1a). Vorher lag alles bei der Hälfte, und jede bildfüllende Ebene wurde im Spiel um Faktor 1.7 hochskaliert.

Wird eine Zielgröße geändert, muss der Despill-Radius (`EDGE_SPRITE` / `EDGE_LAYER`) denselben Faktor bekommen: er ist eine Pixelbreite am fertigen Bild und deckt sonst nur noch den halben Saum ab.

Items müssen zusätzlich in `ITEM_IDS` (`scripts/process_assets.js:13`) stehen, sonst werden sie übersprungen.

### Schritt 3 — Verarbeiten
```
npm run process:assets
```
Schreibt nach `public/assets/items/` und regeneriert `src/item_offsets.generated.ts` mit drei Exports:

- `ITEM_BOTTOM_OFFSETS` — sichtbare Unterkante je Item
- `BG_CAVITY_RATIOS` — lichte Nischenweite je Hintergrund
- `AVAILABLE_ASSETS` — alles, was tatsächlich in `public/assets/items/` liegt

**Ausgabeformat ist WebP** (`OUT_EXT`), nicht PNG. Mit der verdoppelten Kantenlänge wäre der Katalog als PNG über 10 MB groß — ein Verlaufshimmel komprimiert in PNG praktisch gar nicht (`bgl_sky` allein: 1.7 MB als PNG, 21 KB als WebP). `alphaQuality: 100` hält den Alphakanal verlustfrei, die freigestellte Silhouette und die geglätteten Kanten bleiben also exakt so, wie die Pipeline sie berechnet hat; verlustbehaftet ist nur die Farbe innerhalb der Fläche. Der Loader hängt die Endung über den generierten Export `ASSET_EXT` an, im Code steht sie nirgends fest. Der Gesamtkatalog liegt damit bei rund 2.4 MB statt 5.7 MB — bei doppelter Auflösung.

Reste eines früheren Ausgabeformats werden beim Lauf aus `public/assets/items/` gelöscht, sonst lägen dieselben Assets doppelt im Build.

Alle drei werden **am fertigen PNG** gemessen bzw. gelistet — nie im Code hardcoden.
`AVAILABLE_ASSETS` steuert das Laden optionaler Assets: der Vite-Dev-Server liefert für fehlende Dateien das HTML-Fallback mit Status 200, der Phaser-Loader würde daran hängenbleiben.

**Freistellen in zwei Stufen.** Erst wird die Maske in zusammenhängende Flächen zerlegt, dann erst die Bounding-Box gezogen:

- `union` (Items, Buttons, FX): alle Flächen ab 8 % der größten zusammen. Abgesetzte Details wie der Butterwürfel auf dem Toast oder die Goldflocke auf dem Yokan bleiben erhalten, Defringe-Krimskrams fällt raus.
- `widest` (UI-Karten, Regalbrett): die Fläche mit dem breitesten Seitenverhältnis, als einzige. Wenn das Modell ein zweites Objekt mit ins Bild legt, ist das Störobjekt meist flächiger als die gesuchte Leiste — nach Fläche zu wählen greift daneben.

**Innenlöcher.** Freigestellt wird gegen Weiß — bei einem cremeweißen Objekt trifft das auch dessen hellste Stellen. Bei der Katze riss das Löcher in Kopf und Fell. `fillInteriorHoles` flutet nach dem Keying von den Bildrändern durch die transparenten Pixel; was dabei nicht erreicht wird, liegt im Objektinneren und bekommt seine Deckung zurück. Weiche Außenkanten bleiben unangetastet, weil sie vom Rand aus erreichbar sind.

**Weiche Ränder.** `trimSoftEdges` schrumpft die Box, solange eine Randreihe unter 90 % Deckung liegt. Für Band-Layer nötig: der Wiesen-Render lief rechts und unten weich aus, die Box umfasste diese fast transparenten Reihen noch — im Spiel blieb dadurch unten und unten rechts eine Lücke zum Bildrand.

**Schattenränder.** Der weiche Schlagschatten der Renders liegt auf weißem Papier und kommt deshalb als hellgrauer, voll deckender Streifen an — die Alpha-Logik greift dort nicht, und auf dem Putz-Hintergrund des Spiels liest er sich als Glühen unter dem Objekt. `trimShadowEdges` schrumpft die Box kantenweise, solange eine Randreihe zu ≥ 90 % aus unbunten hellen Pixeln besteht. Das läuft **nur für `ui_card_` und `shelf_`** — flache Rechtecke, bei denen der Streifen auffällt. Global angewandt hat es flache helle Items zerlegt (ein Bambuslöffel schrumpfte von 301 auf 64 px Höhe), weil blasses Holz demselben Muster entspricht.

**Chroma-Spill und Kantenglättung.** `cleanEdges` läuft als letzter Schritt auf dem fertig skalierten Bild (`writeClean`), bewusst nicht bei voller Renderauflösung — das Band entlang der Silhouette wäre dort 15× breiter als nötig.

Zwei Dinge werden dort erledigt:

- **Despill.** Die Chroma-Fläche strahlt im Render auf das Motiv ab. Das Keying trennt sauber, aber der Saum bleibt rosa — am Chasen-Sockel, unter dem Chashaku-Löffel, am Rand des Kōro. Der Kanal, in dem der Hintergrund am dunkelsten ist (bei Magenta das Grün), ist der Referenzwert; was in den beiden anderen darüber liegt, wird abgezogen. Am Rand voll, in der Fläche zu 75 % — der Spill reicht bis ins Innere, steht dort aber mit der Eigenfarbe des Motivs in Konkurrenz. Für gewollt warme Töne ist das ungefährlich: Messing und das azuki-rote Relief der Buttons haben `b < g` und werden vom Kriterium gar nicht erfasst (gemessener Anteil bei `btn_shuffle`: 0 %).
- **Alphaglättung.** 3×3-Mittel, aber nur wo im Umfeld sowohl deckende als auch transparente Pixel liegen. Flächen bleiben unberührt. Damit sind harte Alphastufen (Treppen) über alle Assets hinweg auf 0 gefallen, gemessen als „deckendes Pixel mit direkt transparentem Nachbarn": `shou_sugi_block` 268 → 0, `gotoku_trivet` 62 → 0.

Was der Despill **nicht** kann: eine Farbe reparieren, die schon falsch aus dem Modell kommt. Wenn ein ganzes Objekt im falschen Ton rendert, hilft nur ein neuer Render.

Anschließend zählt der Crop deckende Pixel pro Zeile/Spalte und ignoriert Reihen unter 0,5 % Deckung. Ohne das hatte ein einzelnes Streupixel (JPEG-Artefakt, Rest einer Signatur) die Box von `ui_card_kuro` auf die doppelte Höhe aufgebläht.

Das Log meldet `N relevante Objekte im Render` — steht da mehr als 1, hat der Render Ballast und die Strategie hat geraten. Dann lieber neu rendern.

### Schritt 4 — Registrieren
Pflicht-Assets in `PreloadScene.preload()` (`src/main.ts`) mit `this.load.image(...)` laden, optionale mit `loadOptional(key)`.
`bgl_`-Layer und höhere BG-Tiers brauchen gar nichts: sie stehen in `BG_LAYERS` bzw. `BG_TIERS` und werden geladen, sobald sie im Manifest auftauchen. Fehlt ein Layer, wird er still übersprungen.

### Schritt 5 — Prüfen
```
npm run build && npm run dev
```
Checkliste im Browser (DevTools auf ein Telefon mit DPR 3 stellen — bei DPR 1 fällt eine Auflösungsregression nicht auf):
- `document.querySelector('canvas').width` ist die CSS-Breite **mal DPR**, nicht die CSS-Breite
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
- **`brass_sphere` rendert rosé statt Messing, `chasen_whisk` lachsfarben statt blondes Hinoki.** Das ist kein Spill, sondern die Eigenfarbe im Render — der Despill greift nicht (`min(r,b) - g` ist dort negativ bzw. null). Beide gegen **Weiß** neu rendern: es sind mittelhelle, kräftig getönte Motive, für die die Magenta-Regel gar nicht gilt, und Magenta färbt gerade warme Oberflächen ein.
- **`bgl_cat` ist nach dem Despill brauchbar**, behält aber einen leichten Rosé-Ton in den Flecken. Nur nachziehen, wenn es im Spiel stört.
- `bgl_niche_frame` v2 mit runden Ecken (Prompt 23) noch offen.
- `bg_kissa_niche_mid` hat dieselbe gemessene Nischenweite wie `bg_kissa_niche` — nur relevant, falls der Fallback ohne `bgl_niche_frame` gebraucht wird.
- `ui_card_kuro` / `ui_card_hinoki` fertig, werden aber **nicht gezeichnet** — der Header steht frei über der Szene. `addCardNineSlice` bleibt im Code.
