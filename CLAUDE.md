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

## 3. Reve Asset Generation Catalog — Kiri-e Stil

### Stilwechsel: Art Toy → Kiri-e (切り絵)

Ab dieser Version werden alle Assets im **japanischen Kiri-e-Papierschnitt-Stil** gerendert. Statt 3D-mattierter Art-Toy-Renders entstehen flache, geschichtete Washi-Papier-Kompositionen mit sichtbarer Fasertextur, weichen Schlagschatten zwischen den Papierlagen und handgeschnittenen Kanten. Der Stil ist grafischer, wärmer und unverwechselbar japanisch.

**Rendering-Tool:** Reve (nicht Nano Banana). Reve liefert deutlich flachere, authentischere Kiri-e-Ergebnisse ohne 3D-Drift, Sparkle-Artefakte oder perspektivische Verzerrung. Die Prompts sind für Reve optimiert — kürzer, weil Stil- und Kompositions-Regeln über die Reve-**Guidelines**-Funktion projektweit gesetzt werden.

**References:** Tetsubin + Daruma als Style-References im Reve-Projekt hinterlegt (Modus: **Style**). Gibt dem Modell den visuellen Anker für konsistente Ergebnisse.

### Hintergrundfarbe: Magenta für alle Kiri-e-Items

Alle Kiri-e-Items werden gegen **Magenta (#FF00FF)** gerendert. Der Papierton (Washi, Kraft) ist immer hell genug, dass Weiss nicht funktioniert — die Hintergrundfarben-Regel aus dem alten Katalog vereinfacht sich: **immer Magenta**. Die Pipeline erkennt den Chroma-Hintergrund automatisch an den Bildecken.

### Reve Project Guidelines (im Reve-Projekt unter "Guidelines" eingetragen)

```
Japanese kiri-e washi paper cutout style. Every object is built from layered handmade washi and kraft paper with visible fiber texture. Each paper layer casts a soft natural drop shadow onto the layer below. Slightly irregular hand-cut edges on all shapes. Strict front-facing flat view, no 3D perspective, no isometric angle. Compact proportions roughly as wide as tall. Single isolated object centered with generous even padding. Pure solid magenta background (#FF00FF). Zero floor shadow. Sharp clean silhouette edges against the magenta. No text, no watermark, no sparkle artifacts.
```

### Negative Prompt — Kiri-e (Append to all Reve runs)
3D perspective, isometric view, visible side face, depth, thickness, tilted angle, cast shadow on ground, photorealistic, hyper-realistic, high gloss reflections, shiny liquid specular, 3d render, gradient background, text, watermark, logo, multiple objects, duplicate, collage, smooth plastic, glossy surface, digital painting, cel shading

### Silhouetten-Regel

Für dieses Spiel zählt vor allem die **Silhouette**: drei gleiche Objekte zu erkennen ist die ganze Mechanik. Jedes der 20 Items muss sich **allein am Umriss** von allen anderen unterscheiden. Kompakt, ungefähr quadratisch, klare Umrisslinie. Nichts hängt, alles steht auf einer Standfläche. Ein Item wird bei `ITEM_SIZE` 58 px Design angezeigt — bei dieser Größe muss die Silhouette noch lesbar sein.

### Item-Prompts — Kiri-e / Reve (20 Items)

Die Items decken breite japanische Kultur ab, nicht nur Kissa/Teehaus. Jedes hat eine einzigartige Silhouette und eine eigene Primärfarbe. Die Prompts sind für Reve verkürzt — Stil, Komposition, Hintergrund und Textur kommen aus den Guidelines.

1. **chawan_cup** *(breite Schale — ivory/cream + matcha-grün):*
   Squat cylindrical Japanese chawan tea bowl, the bowl body cut from ivory cream washi paper, a flat ellipse of matcha-green washi filling the interior as a separate top layer, a small indigo four-petal flower motif cut from dark blue washi layered onto the front, a narrow foot ring in slightly darker cream washi beneath the body

2. **tetsubin_kettle** *(Kanne mit Bogenhenkel — charcoal + gold):*
   Squat Japanese tetsubin kettle, the round body cut from dark charcoal washi paper with subtle creased texture, a curved arch handle rising above cut from gold kraft paper as a separate top layer, a small spout on the left, a flat lid disc in slightly lighter charcoal washi, rows of small gold kraft paper circles dotted across the body as decorative arare texture

3. **kissa_toast** *(Quadrat mit Butter-Tab — golden/honey + gelb):*
   Single slice of thick Japanese shokupan milk bread toast seen from directly in front as a flat shape, the outer crust edge in warm golden-brown kraft paper forming a soft rounded square, the inner bread face in pale cream washi, a small square pat of butter in yellow washi centered on the bread face, completely flat with zero visible thickness and no side faces

4. **dango_stick** *(vertikaler 3-Kugel-Stapel — pink/weiss/grün):*
   Three round dango balls stacked vertically on a pale wooden kraft paper skewer, the top ball in soft pink washi, the middle in chalk white washi, the bottom in matcha-green washi, each ball a separate paper layer with visible cut edges

5. **yokan_prism** *(flaches Dreieck — azuki-maroon):*
   Triangular slice of yokan red bean jelly seen as a perfectly flat two-dimensional silhouette, a sharp geometric wedge shape in deep azuki maroon washi paper with a tiny gold foil diamond accent near the pointed tip, completely flat with zero visible thickness and no side faces, the triangle pointing to the upper right with one straight horizontal bottom edge

6. **matcha_roll** *(flacher Kreis mit Spirale — forest green + cream):*
   Cross-section of a matcha roll cake as a perfectly flat circle, a bold cream and deep forest-green spiral pattern of concentric rings on the circular face, the outermost ring in dark matcha-green washi paper forming the cake exterior, completely flat disc shape with zero visible thickness and no side angle

7. **incense_burner** *(runder Topf mit Kuppeldeckel — charcoal + gold):*
   Small round incense burner koro, a squat charcoal washi body sitting on three tiny feet, a domed lid in gold foil paper pierced by round holes as a separate top layer, a single thin paper wisp of smoke rising from the lid

8. **daruma** *(gedrungener Tropfen mit Gesicht — vermillion-rot):*
   Japanese daruma good-luck doll, squat rounded egg shape with a flat bottom, the body cut from bold vermilion red washi, a stern stylized face with thick black washi eyebrows and a gold foil circle on the forehead, white washi face area with simple paper-cut facial features

9. **maneki_neko** *(Winkekatze mit erhobener Pfote — weiss + gold):*
   Japanese beckoning cat maneki neko sitting upright, white washi paper body with calico patches in warm orange and charcoal, one paw raised holding a gold foil coin with a square hole, a red washi collar with a small gold bell, simplified rounded geometry

10. **kokeshi** *(Kegel mit rundem Kopf — naturholz + bunt):*
    Japanese kokeshi wooden doll, a large round head in pale cream washi with a sweet face and two red cheek dots, a simple cylindrical body in warm kraft paper with horizontal stripes in red and indigo washi

11. **sensu_fan** *(aufgespreizter Halbkreis-Fächer — indigo + gold):*
    Japanese folding fan sensu spread open in a half-circle shape, indigo washi surface with a pale blue wave pattern, gold kraft paper ribs radiating from the pivot point, a small red washi tassel at the bottom

12. **onigiri** *(abgerundetes Dreieck mit Nori-Band — weiss + schwarz):*
    Japanese rice ball onigiri in a rounded triangle shape, white washi paper body, a wide band of dark nori seaweed in charcoal black washi wrapped around the bottom half, a single small red umeboshi dot visible at the center above the nori

13. **koinobori** *(horizontale Karpfenfahne — indigo + gold/cream):*
    Japanese koinobori carp streamer as a flat horizontal fish shape, the body cut from bold indigo blue washi paper with layered cream and gold washi scale crescents, a wide open circular mouth on the left in red washi, flowing tail fins on the right, a single thin string attached at the mouth, completely flat with zero depth

14. **torii_gate** *(Miniatur-Torii-Tor — vermillion + charcoal):*
    Miniature Japanese torii shrine gate as a flat two-dimensional graphic silhouette, two vertical pillars and two horizontal crossbeams in bold vermilion red washi paper, a flat charcoal washi rectangular base beneath, completely flat paper cutout with zero depth and no visible side faces on any element, simplified chunky proportions roughly as wide as tall

15. **furoshiki** *(eingewickeltes Bündel mit Knoten — indigo + cream):*
    Japanese furoshiki wrapped bundle with two rabbit-ear knot ends poking up, a rounded cloth body in indigo blue washi paper with a cream seigaiha wave pattern, sitting on a small flat base

16. **sake_tokkuri** *(Sake-Flasche mit engem Hals — celadon-grün):*
    Japanese sake flask tokkuri with a narrow neck and wide round body in celadon green washi paper with crackle texture lines in darker green, a small sake cup ochoko in cream washi resting beside it

17. **chochin** *(ovale Papierlaterne — ivory/red + bamboo):*
    Japanese paper lantern chochin in an oval shape, alternating warm ivory and soft red washi paper panels separated by thin bamboo ribs in kraft paper, a dark brown washi cap at top and bottom, a small red washi tassel hanging from the bottom

18. **temari** *(Fadenball mit geometrischem Muster — bunt):*
    Japanese decorative temari thread ball, a perfect sphere with geometric interlocking diamond and star patterns in matcha green, indigo blue, and gold washi paper on a cream base

19. **wagashi** *(Nerikiri-Süssigkeit in Blütenform — pastell):*
    Japanese nerikiri wagashi sweet sculpted into a five-petal flower shape, soft pastel lavender washi paper petals with a small matcha-green center, sitting on a small round charcoal washi plate

20. **omamori** *(Glücksamulett — Brokat gold/rot):*
    Japanese omamori good-luck charm, a small rectangular pouch in deep red washi with a gold foil decorative border, a thin gold cord loop at the top, a short tassel in gold and red washi hanging from the bottom

### Combined Cabinet Prompts — Kiri-e (bgl_cabinet)

Rahmen und Regalbretter werden als **ein einziges Bild** gerendert statt separat positioniert. Das eliminiert das Alignment-Problem, bei dem die Bretter exakt den Rahmen berühren mussten, und gibt dem Render volle Kontrolle über Proportionen und Verzierungen.

Das Kabinett ist ein freistehendes Washi-Papier-Möbel im Kiri-e-Stil: geschichtetes Kraftpapier mit sichtbarer Fasertextur, Asanoha-Muster (麻の葉) in Goldfolie als Verzierung auf Ober- und Unterbrett, dünne Goldfolie-Akzente an den Seitenpfosten. Alle Bretter sind **von leicht oben** gezeigt — die hellere Cream-Oberfläche als breite sichtbare Fläche, darunter die schmale dunklere Toasted-Brown-Vorderkante. Alle Zellen strikt rechteckig, gleiche Höhe, gerade horizontale Kanten.

Drei Varianten für die Level-Gruppen:

| Variante | Bretter | Zellen | Levels |
|---|---|---|---|
| `bgl_cabinet_4row` | 3 interne Bretter | 4 Zellen | 1–3 (4 Reihen) |
| `bgl_cabinet_5row` | 4 interne Bretter | 5 Zellen | 2–4 (5 Reihen) |
| `bgl_cabinet_6row` | 5 interne Bretter | 6 Zellen | 5–6 (6 Reihen) |

**Pipeline-Verarbeitung:**
- Prefix `bgl_cabinet_` → freigestellt gegen Magenta, Position im Frame bleibt erhalten.
- `knockOutPanel` läuft **nicht** für `bgl_cabinet_*` — die helle Washi-Rückwand bleibt als solide Fläche. Items sitzen auf den Bretter-Oberflächen, die Rückwand liefert den neutralen Kontrast — ein Shoji-Panel im Code ist nicht mehr nötig.
- Die Shelf-Y-Positionen werden am fertigen Bild per Luminanz-Scan vermessen (helle Oberfläche → dunkle Vorderkante = Übergang) und als `CABINET_SHELF_RATIOS` exportiert.
- `BG_FRAME_RECTS` und `BG_CAVITY_RECTS` werden weiterhin am Alphakanal gemessen.
- Magenta-Rand links und rechts bleibt (für `detectKeyColor`).

**bgl_cabinet_6row** *(5 Bretter, 6 Zellen — Levels 5–6, finales genehmigtes Prompt):*
Tall freestanding display shelf cabinet in Japanese kiri-e washi paper cutout style, front-facing view, the cabinet fills the entire canvas height from top edge to bottom edge with an even magenta margin on left and right only, built from layered warm honey-toned kraft paper with visible handmade washi fiber texture throughout, slim vertical side posts and wider horizontal top and bottom boards, the top board decorated with a paper-cut asanoha hemp leaf geometric pattern in gold foil, the bottom board with a smaller matching asanoha accent, the side posts with a thin vertical gold foil line, five evenly spaced horizontal shelf boards of plain kraft paper inside the cavity creating six equal rectangular cells of identical height with no exceptions, every single shelf board shown from a consistent slightly elevated viewpoint so that each board clearly displays its full lighter cream top surface as a wide visible plane with a narrow darker toasted-brown front edge below, small gold foil corner brackets at the four outer frame corners, pale ivory washi back panel in every cell, generously rounded outer frame corners, all six cell openings strictly rectangular with straight horizontal edges and identical proportions, the inner cavity at least 88 percent of cabinet height and 84 percent of width, single isolated object, soft drop shadows between paper layers, tall portrait 9:16, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**bgl_cabinet_5row** *(4 Bretter, 5 Zellen — Levels 2–4):*
Wie `bgl_cabinet_6row`, aber: „four evenly spaced horizontal shelf boards… creating five equal rectangular cells" statt fünf/sechs. „all five cell openings" statt six. Alles andere identisch.

**bgl_cabinet_4row** *(3 Bretter, 4 Zellen — Levels 1–3):*
Wie `bgl_cabinet_6row`, aber: „three evenly spaced horizontal shelf boards… creating four equal rectangular cells" statt fünf/sechs. „all four cell openings" statt six. Alles andere identisch.

### Parallax-Hintergrund "Engawa-Garten" — Kiri-e (bgl_ Layer)

Statt eines einzelnen Bildes wird der Hintergrund aus freigestellten Ebenen gebaut, damit sich Wolken, Laternen und Tiere unabhängig bewegen können. Die Szene: das Regalgehäuse steht auf einer Engawa-Veranda, dahinter öffnet sich ein Garten — blauer Himmel, ferne Hügel, Wiese, oben hängende Chōchin-Laternen unter dem Dachvorsprung, unten spielen Shiba und Katze.

**Regel für alle Layer:** Kiri-e-Washi-Stil, geschichtetes Papier mit sichtbarer Fasertextur, weiche Schlagschatten zwischen Lagen. Kein Fotorealismus, kein Text, keine 3D-Renders. Alle Layer außer `bgl_sky` werden freigestellt — daher **reines Weiß (#FFFFFF) als Hintergrund** und keine Bodenschatten. Das mittlere Band hinter der Nische bleibt bewusst leer, damit die Regale lesbar bleiben.
Format aller Layer: Portrait 9:16 Canvas. `BG_LAYERS` in `src/main.ts` kennt drei Modi:

| Modus | Layer | Verarbeitung |
|---|---|---|
| `cover` | sky, clouds, hills, lanterns | Position im Frame bleibt erhalten, wird wie der Hintergrund cover-skaliert — die Ebenen liegen deckungsgleich übereinander |
| `band` | meadow | auf den Inhalt beschnitten, volle Breite, unten bündig |
| `sprite` | cat, dog | freigestellt, über `xRatio`/`yRatio` platziert |

Die Halo-Entfernung des Defringings läuft für `bgl_`-Vollbild-Ebenen **nicht**: flache Kiri-e-Layer haben keinen Schlagschatten zum Hintergrund, dafür absichtlich sehr helle Flächen. Mit aktiver Regel war das Wolken-Layer komplett verschwunden.

**bgl_sky** *(Vollbild, statisch, unterste Ebene):*
Soft pale blue morning sky in flat washi paper style filling the entire frame, gentle vertical wash from dusty cornflower blue at the top to warm ivory at the horizon, visible paper fiber texture throughout, completely empty with no clouds and no objects, flat matte kiri-e finish, tall portrait orientation 9:16, no text, no watermark, 8k resolution --style raw

**bgl_clouds** *(driftet langsam horizontal):*
A horizontal band of four simplified rounded clouds cut from soft chalk white and pale grey washi paper, flat layered kiri-e cutout shapes with slightly irregular hand-cut edges and soft drop shadows, spread evenly across the upper third of the frame, tall portrait 9:16 canvas with everything below the cloud band completely empty, pure solid white background (#FFFFFF), no sky gradient, no text, 8k resolution --style raw

**bgl_hills** *(statisch, hinter der Nische):*
A low silhouette range of gentle rolling hills cut from layered muted sage green and dusty blue-grey washi paper, simplified flat kiri-e cutout shapes in two depths with soft drop shadows between layers, occupying only the lower third of the frame with a perfectly flat horizontal bottom edge, tall portrait 9:16 canvas with everything above the hills completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

**bgl_meadow** *(statisch, sitzt unten auf):*
A wide strip of soft matcha-green meadow grass cut from layered washi paper with a few simplified paper tufts and three small white clover blossoms, flat kiri-e cutout finish with visible fiber texture, clean straight bottom edge and a gently undulating top edge, occupying only the bottom fifth of the frame, tall portrait 9:16 canvas with everything above completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

**bgl_lanterns** *(schwingt sanft, hängt oben):*
A horizontal row of five round paper chochin lanterns hanging from thin dark cords of differing lengths, alternating warm ivory and soft azuki red washi paper, bamboo rib texture in kraft paper and small gold foil caps, flat kiri-e cutout style with soft drop shadows between layers, all cords starting exactly at the very top edge of the frame, occupying only the upper quarter, tall portrait 9:16 canvas with everything below completely empty, pure solid white background (#FFFFFF), zero floor shadow, no text, 8k resolution --style raw

**bgl_cat** *(Idle-Bob, unten links, Magenta-Hintergrund):*
A single small chubby calico cat figurine sitting upright with its tail curled around its paws, built from layered washi paper in cream white with soft azuki and charcoal patches, simplified rounded geometry with slightly irregular hand-cut edges, in Japanese kiri-e paper cutout style with visible fiber texture and soft drop shadows between paper layers, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**bgl_dog** *(Idle-Bob, unten rechts):*
A single small round shiba inu figurine standing playfully with its curled tail up, built from layered washi paper in warm toast gold and chalk white, simplified rounded geometry with slightly irregular hand-cut edges, in Japanese kiri-e paper cutout style with visible fiber texture and soft drop shadows between paper layers, orthographic side-facing three-quarter view, centered on a portrait 9:16 canvas with generous white padding, pure solid white background (#FFFFFF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### UI Card Prompts — Kiri-e

Die Karte wird per NineSlice gezeichnet, d.h. nur die Mitte darf gedehnt werden — **Ecken und Kanten müssen deshalb vollständig im äußeren Drittel der Kartenhöhe liegen**, und das Mittelfeld muss eine ruhige, wiederholbare Fläche ohne Ornament sein.
Format: Portrait 9:16 Canvas, Karte horizontal zentriert, großzügiges Padding. Magenta-Hintergrund für alle (Washi-Papier ist hell).

**ui_card_kuro** *(Header-Plakette: Score / Bar / Moves):*
Extremely wide horizontal nameplate bar in Japanese kiri-e washi paper cutout style, aspect ratio 6:1, body cut from dark charcoal washi paper with visible fiber texture, a thin gold foil pinstripe along the top and bottom edge, small gold foil corner brackets at the far left and far right ends only, completely plain and unornamented center field, softly rounded corners, soft drop shadows between paper layers, portrait 9:16 canvas with the bar centered horizontally and generous padding above and below, orthographic front view, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**ui_card_hinoki** *(Booster-Tray, trägt Undo / Shuffle / Hammer):*
Wide horizontal tray bar in Japanese kiri-e washi paper cutout style, aspect ratio 4:1, warm honey-toned kraft paper body with visible handmade washi fiber texture, a shallow recessed inner channel cut from slightly darker kraft paper running the full length, two small gold foil end caps at the far left and far right ends only, completely plain and unornamented center field, softly rounded corners, soft drop shadows between paper layers, portrait 9:16 canvas with the bar centered horizontally and generous padding above and below, orthographic front view, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Booster Button Prompts — Kiri-e

Format: Portrait 9:16 Canvas, Objekt mittig, **genau ein Objekt im Bild**. Alle drei mit identischem Körper aus warmem Creme-Washi, nur das Relief unterscheidet sich — sonst wirkt die Reihe unruhig. Magenta-Hintergrund (Washi-Papier ist cremefarben).

**btn_undo:**
Single chunky rounded-square push button cut from soft warm cream washi paper with generously rounded corners and a soft pillowy silhouette, a thick matcha-green counter-clockwise curved arrow cut from layered washi in smooth relief on its face, in Japanese kiri-e paper cutout style with visible fiber texture and soft drop shadows between paper layers, front-facing view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**btn_shuffle:**
Single chunky rounded-square push button cut from soft warm cream washi paper with generously rounded corners and a soft pillowy silhouette, two thick azuki-rose arrows crossing each other in an X cut from layered washi in smooth relief on its face, in Japanese kiri-e paper cutout style with visible fiber texture and soft drop shadows between paper layers, front-facing view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

**btn_hammer:**
Single chunky rounded-square push button cut from soft warm cream washi paper with generously rounded corners and a soft pillowy silhouette, a thick honey-toned kraft paper mallet cut from layered washi in smooth relief on its face, in Japanese kiri-e paper cutout style with visible fiber texture and soft drop shadows between paper layers, front-facing view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero floor shadow, sharp silhouette edge definition, 8k resolution --style raw

### Match Feedback FX — Kiri-e

Format: Portrait 9:16 mobile canvas with a centered square effect and generous padding. Magenta-Hintergrund.

**fx_match_burst:**
Japanese kiri-e paper cutout celebration effect, centered radial bloom of warm ivory washi light, gold foil rays radiating outward, tiny matcha-green and honey-gold diamond sparkles cut from layered washi paper, three subtle concentric circles in gold foil, visible paper fiber texture and soft drop shadows between paper layers, crisp isolated front-facing graphic, no objects, no text, no numbers, no characters, no floor shadow, portrait 9:16 mobile canvas, generous padding around the centered square effect, pure solid magenta background (#FF00FF), sharp silhouette edges, 8k resolution --style raw

---

## 4. Prompt- & Asset-Workflow

Der komplette Weg von einem Prompt aus Abschnitt 3 bis zum fertigen Asset im Spiel.

### Schritt 1 — Rendern
**Dateiformat:** PNG bevorzugen. JPEG funktioniert (der ganze bestehende Katalog ist JPEG) — freigestellt wird ohnehin gegen Magenta, nicht über einen Alphakanal. JPEG-Ringing an harten Kanten hinterlässt aber graue Sprenkel, und bei `bgl_`-Layern fällt das stärker auf als bei Items, weil die Layer auf volle Bildschirmbreite skaliert werden statt auf 384 px. `bgl_sky` ist egal, das Layer ist deckend.

Prompt aus Abschnitt 3 nehmen, **Negative Prompt (Kiri-e)** anhängen, in **Reve** rendern (Projekt mit Guidelines und Style-References konfiguriert, siehe Abschnitt 3).
Immer **Portrait 9:16** wählen — auch für quadratische Objekte. Das Modell liefert sonst Landscape und der Alpha-Crop schneidet Kanten ab.

### Schritt 2 — Ablegen
Datei unter ihrem **exakten Asset-Namen** nach `raw_renders/` legen (`.png`, `.jpg` oder `.jpeg`).
Der Dateiname steuert die gesamte Verarbeitung — es gibt keine Konfiguration außerhalb des Namens:

| Prefix | Verarbeitung | Ausgabe |
|---|---|---|
| `bgl_cabinet_` | Defringe, freigestellt, 1440px Breite, Shelf-Y-Positionen vermessen, **kein** `knockOutPanel` | `CABINET_SHELF_RATIOS`, `BG_FRAME_RECTS`, `BG_CAVITY_RECTS` |
| `bgl_` (Cover) | Defringe, freigestellt, 1440px Breite, **Position im Frame bleibt erhalten** | Parallax-Layer |
| `bgl_` (Sprite) | Defringe, exakter Alpha-Crop, Höhe 1024 | Katze, Shiba |
| `bgl_` (Band) | Defringe, auf Inhalt beschnitten, volle Breite, unten bündig | Wiese |
| `ui_card_` | Defringe, exakter Alpha-Crop, Höhe auf 256 normalisiert, Breite proportional | NineSlice-Karte |
| `btn_` / `ui_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Buttons & Icons |
| `fx_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Match-Effekt |
| Item-ID | Defringe, exakter Alpha-Crop, 384×384, Bottom-Offset gemessen | `ITEM_BOTTOM_OFFSETS` |

Die Zielgrößen stehen als Konstanten oben in `scripts/process_assets.js` und sind an der Canvasbreite bei `devicePixelRatio` 3 bemessen (rund 1240 px, siehe Abschnitt 1a).

Wird eine Zielgröße geändert, muss der Despill-Radius (`EDGE_SPRITE` / `EDGE_LAYER`) denselben Faktor bekommen: er ist eine Pixelbreite am fertigen Bild und deckt sonst nur noch den halben Saum ab.

Items müssen zusätzlich in `ITEM_IDS` (`scripts/process_assets.js:13`) stehen, sonst werden sie übersprungen.

### Schritt 3 — Verarbeiten
```
npm run process:assets
```
Schreibt nach `public/assets/items/` und regeneriert `src/item_offsets.generated.ts` mit folgenden Exports:

- `ITEM_BOTTOM_OFFSETS` — sichtbare Unterkante je Item
- `BG_CAVITY_RECTS` — lichte Nischenweite (nur für Legacy-`bg_`-Hintergründe)
- `BG_FRAME_RECTS` — äußere Kontur des Gehäuses
- `CABINET_SHELF_RATIOS` — Array von Y-Verhältnissen der Brettoberflächen je Cabinet-Variante
- `AVAILABLE_ASSETS` — alles, was tatsächlich in `public/assets/items/` liegt

**Ausgabeformat ist WebP** (`OUT_EXT`), nicht PNG. `alphaQuality: 100` hält den Alphakanal verlustfrei. Der Loader hängt die Endung über den generierten Export `ASSET_EXT` an, im Code steht sie nirgends fest.

Reste eines früheren Ausgabeformats werden beim Lauf aus `public/assets/items/` gelöscht, sonst lägen dieselben Assets doppelt im Build.

Alle Exports werden **am fertigen Bild** gemessen bzw. gelistet — nie im Code hardcoden.
`AVAILABLE_ASSETS` steuert das Laden optionaler Assets: der Vite-Dev-Server liefert für fehlende Dateien das HTML-Fallback mit Status 200, der Phaser-Loader würde daran hängenbleiben.

**Freistellen in zwei Stufen.** Erst wird die Maske in zusammenhängende Flächen zerlegt, dann erst die Bounding-Box gezogen:

- `union` (Items, Buttons, FX): alle Flächen ab 8 % der größten zusammen. Abgesetzte Details wie der Butterwürfel auf dem Toast oder die Goldflocke auf dem Yokan bleiben erhalten, Defringe-Krimskrams fällt raus.
- `widest` (UI-Karten): die Fläche mit dem breitesten Seitenverhältnis, als einzige.

**Innenlöcher.** Freigestellt wird gegen Magenta — bei hellen Washi-Objekten trifft das Keying auch helle Innenflächen. `fillInteriorHoles` flutet nach dem Keying von den Bildrändern durch die transparenten Pixel; was dabei nicht erreicht wird, liegt im Objektinneren und bekommt seine Deckung zurück.

**Weiche Ränder.** `trimSoftEdges` schrumpft die Box, solange eine Randreihe unter 90 % Deckung liegt.

**Schattenränder.** `trimShadowEdges` schrumpft die Box kantenweise, solange eine Randreihe zu ≥ 90 % aus unbunten hellen Pixeln besteht. Läuft **nur für `ui_card_`** — flache Rechtecke, bei denen der Streifen auffällt.

**Chroma-Spill und Kantenglättung.** `cleanEdges` läuft als letzter Schritt auf dem fertig skalierten Bild (`writeClean`), bewusst nicht bei voller Renderauflösung.

- **Despill.** Die Magenta-Fläche strahlt im Render auf das Motiv ab. Der Kanal, in dem der Hintergrund am dunkelsten ist (bei Magenta das Grün), ist der Referenzwert; was in den beiden anderen darüber liegt, wird abgezogen.
- **Alphaglättung.** 3×3-Mittel, aber nur wo im Umfeld sowohl deckende als auch transparente Pixel liegen.

Das Log meldet `N relevante Objekte im Render` — steht da mehr als 1, hat der Render Ballast und die Strategie hat geraten. Dann lieber neu rendern.

### Schritt 4 — Registrieren
Pflicht-Assets in `PreloadScene.preload()` (`src/main.ts`) mit `this.load.image(...)` laden, optionale mit `loadOptional(key)`.
`bgl_`-Layer werden geladen, sobald sie im Manifest (`AVAILABLE_ASSETS`) auftauchen. Cabinet-Varianten stehen in einer eigenen Liste und werden je nach Level-Tier geladen. Fehlt ein Layer, wird er still übersprungen.

### Schritt 5 — Prüfen
```
npm run build && npm run dev
```
Checkliste im Browser (DevTools auf ein Telefon mit DPR 3 stellen — bei DPR 1 fällt eine Auflösungsregression nicht auf):
- `document.querySelector('canvas').width` ist die CSS-Breite **mal DPR**, nicht die CSS-Breite
- Cabinet-Variante passt zum Level-Tier (4/5/6 Reihen)
- Items stehen mit der Unterkante auf der Regallippe (Shelf-Oberfläche) auf
- Kein separates Shoji-Panel mehr nötig — die Washi-Rückwand im Cabinet übernimmt den Kontrast
- Ein Zug fliegt in einer Parabel zum Zielslot, nicht seitlich herein

### Schritt 6 — Prompt zurückschreiben
Den tatsächlich verwendeten Prompt in Abschnitt 3 aktualisieren, inkl. Versionsnotiz, warum die Vorgängerversion ersetzt wurde. Der Katalog ist die einzige Quelle für Re-Renders.

### Das Combined Cabinet

Das Kabinett (`bgl_cabinet_*`) kommt als freistehendes Washi-Möbel mit Bretter und Rückwand als Einheit aus dem Render. Anders als beim alten `bgl_niche_frame` wird `knockOutPanel` **nicht** ausgeführt — die ivory Washi-Rückwand bleibt geschlossen und dient als neutraler Hintergrund für die Items. Das Shoji-Panel im Code (`GameScene.create`, Deckkraft 0.55) entfällt ersatzlos.

`BG_FRAME_RECTS` wird weiterhin am Alphakanal gemessen (äußere Kontur des Möbels). `BG_CAVITY_RECTS` kommt aus der lichten Innenfläche. Zusätzlich exportiert die Pipeline `CABINET_SHELF_RATIOS` — ein Array von Y-Verhältnissen (0–1, relativ zur Bildhöhe) der sichtbaren Brettoberflächen. Im Code ersetzt das die alte `buildLevel`-Logik, die Bretter per `cavityHeight/(rows+0.5)` gleichmäßig verteilte.

### Offene Punkte
- **Kiri-e-Nebeneffekt:** Der flache Papierstil erzeugt weniger Chroma-Spill als die alten 3D-Renders, aber helle Kraft-/Washi-Töne nahe am Magenta-Saum brauchen trotzdem Despill. Reve's Magenta-Hintergrund ist leicht rötlicher als reines #FF00FF — die Pipeline erkennt Chroma per Hue/Saturation an den Ecken, nicht per exaktem RGB-Match, sollte also funktionieren.
- **Alle 20 Items** im Kiri-e-Stil gerendert (Reve). `origami_crane` durch `koinobori` ersetzt (Kranich-Silhouette bei 58 px nicht lesbar). 5 Items (yokan, toast, torii, crane→koinobori, matcha_roll) mit verstärktem Flat-Prompt neu gerendert wegen 3D-Perspektive im ersten Durchgang.
- **`bgl_cat` Kiri-e-Version** steht noch aus — die alte Art-Toy-Version hat einen leichten Rosé-Ton in den Flecken.
- **`bgl_dog` Kiri-e-Version** steht noch aus.
- **Cabinet-Varianten 4row und 5row** noch nicht gerendert — nur 6row liegt als genehmigter Render vor.
- **UI-Karten** (`ui_card_kuro` / `ui_card_hinoki`) werden aktuell **nicht gezeichnet** — der Header steht frei über der Szene. `addCardNineSlice` bleibt im Code.
- **Pipeline-Anpassungen** für `bgl_cabinet_*`: `CABINET_SHELF_RATIOS`-Export, Skip von `knockOutPanel`, Vermessung der Shelf-Y-Positionen — noch zu implementieren.
