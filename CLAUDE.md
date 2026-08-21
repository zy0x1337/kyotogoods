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

## 3. Reve Asset Generation Catalog — Kawaii Flat

### Stilwechsel: Kiri-e → Kawaii Flat

Ab dieser Version werden alle Assets im **Kawaii Flat Illustration-Stil** gerendert. Statt geschichteter Washi-Papier-Kompositionen (Kiri-e) entstehen saubere, farbenfrohe Flat-Illustrationen mit weichen Rundungen, einheitlichen dünnen Outlines und freundlichen Pastellfarben. Der Stil ist sofort zugänglich, universell ansprechend und bei Thumbnail-Grösse (58 px) deutlich besser lesbar als das texturreiche Kiri-e.

Vorgänger-Stile: Art Toy (mattierte 3D-Miniaturen) → Kiri-e (geschichtetes Washi-Papier) → **Kawaii Flat** (aktuell).

**Thema:** Japanisches Essen — 20 ikonische japanische Gerichte, Snacks und Süssigkeiten. Universell wiedererkennbar, visuell vielfältig, klar japanisch.

**Layout:** Freies Grid auf wechselnden illustrierten Hintergründen. Kein Regal, kein Cabinet, keine physischen Rahmen. Items schweben in unsichtbaren Slots über der Szene. Hintergrund wechselt pro Level-Gruppe (siehe „Layout-Konzept").

**Rendering-Tool:** Reve mit projektweit gesetzten Guidelines und Style-References. Stil, Komposition, Hintergrund und Proportionen sind über die Guidelines fixiert — die Item-Prompts beschreiben nur das jeweilige Objekt.

**References:** Die ersten zwei genehmigten Items (Empfehlung: onigiri + ramen) als **Style-References** im Reve-Projekt hinterlegen (Modus: **Style**). Das gibt dem Modell den visuellen Anker für konsistente Ergebnisse über alle weiteren Items.

### Hintergrundfarbe

**Items, Buttons, FX, UI-Karten:** Magenta (#FF00FF). Die Pipeline erkennt den Chroma-Hintergrund automatisch an den Bildecken. Kawaii-Flat-Items haben saubere Outlines und kaum Chroma-Spill — die Freistellung ist deutlich einfacher als bei Kiri-e.

**Hintergrund-Szenen (bgl_):** Kein Magenta. Die Szenen sind deckende Vollbilder ohne Transparenz — der „Hintergrund" IST die Szene (Himmel, Wände, Flächen). Die Pipeline skaliert sie nur auf Zielbreite, kein Chroma-Keying nötig.

### Reve Project Guidelines (im Reve-Projekt unter "Guidelines" eingetragen)

```
Cute Japanese kawaii flat illustration style. Clean simple rounded shapes with consistent soft dark-brown outlines of uniform weight throughout. Flat cheerful pastel colors filled solidly with no visible brushstrokes or complex textures. At most one subtle lighter highlight spot on the main rounded surface for gentle volume, no complex gradients or cel shading. Slightly exaggerated cute proportions, everything rounded and friendly. Strict front-facing flat view, no 3D perspective, no isometric angle. Compact proportions roughly as wide as tall. Single isolated food item centered with generous even padding on all sides. Pure solid magenta background (#FF00FF). Zero floor shadow, zero drop shadow beneath the object. Sharp clean silhouette edges against the magenta. No text, no watermark, no sparkle artifacts. Optional small kawaii face: two simple dot eyes, a tiny curved smile, and optional soft pink cheek circles. Keep faces minimal and consistent.
```

### Negative Prompt — Kawaii Flat (an alle Reve-Runs anhängen)

```
3D render, 3D perspective, isometric view, realistic, photorealistic, hyper-detailed, complex shading, multiple light sources, harsh shadows, visible brushstrokes, watercolor bleed, rough edges, sketchy lines, uneven outlines, gradient background, text, watermark, logo, multiple objects, duplicate, collage, dark moody colors, neon colors, oversaturated, glossy specular highlights, anime screentone, pixel art
```

### Silhouetten-Regel

Für dieses Spiel zählt vor allem die **Silhouette**: drei gleiche Objekte zu erkennen ist die ganze Mechanik. Jedes der 20 Items muss sich **allein am Umriss** von allen anderen unterscheiden. Kompakt, ungefähr quadratisch, klare Umrisslinie. Ein Item wird bei `ITEM_SIZE` 58 px Design angezeigt — bei dieser Grösse muss die Silhouette noch lesbar sein.

Die 20 Silhouetten decken folgende Grundformen ab — keine zwei Items teilen dieselbe:

| Grundform | Item | Unterscheidungsmerkmal |
|---|---|---|
| Abgerundetes Dreieck | onigiri | Flache Basis, breite Schultern |
| Flaches horizontales Oval | nigiri | Niedriges Profil, Topping oben |
| Kreis | maki | Perfekter Kreis, Muster innen |
| Tüte / Kegel | temaki | Spitze unten, offen oben |
| Halbmond | gyoza | Gewellte Oberkante, glatte Basis |
| Fischform | taiyaki | Kopf, Schwanzflosse, Rückenflosse |
| 3 Kugeln + vertikaler Stab | dango | Rund, gleichmässig vertikal gestapelt |
| 3 Blöcke + horizontaler Spiess | yakitori | Eckig, horizontal aufgereiht |
| Breite Schale + Stäbchen | ramen | Weite Schale, Stäbchen ragen oben raus |
| Flache Halbkugel | mochi | Niedrige Kuppel, kein Beiwerk |
| Doppelscheibe | dorayaki | Zwei gestapelte Kreise mit Füllung |
| Längliches Schiffchen | takoyaki | Boot-Form, Kugeln drin |
| Gebogene Schote mit Beulen | edamame | Lang, schmal, gebogen |
| Hoher Becher | matcha_latte | Schmal, hoch, Deckel oben |
| Aufrechtes Rechteck | tamagoyaki | Klar rechteckig, Schichtlinien |
| 5-Blatt-Blüte auf Teller | wagashi | Blütensilhouette + kleiner Teller |
| Eisberg auf Schale | kakigori | Hohe Spitze über kleiner Schale |
| Kugel mit Blatt/Stiel oben | ichigo_daifuku | Rund + Stielakzent oben |
| Kugel in grossem Blattwickel | sakura_mochi | Breiter als hoch, Blattspitzen seitlich |
| Ovales Täschchen mit Öffnung | inarizushi | Oval, oben offen, Football-Form |

### Item-Prompts — Kawaii Flat / Reve (20 Items)

Alle 20 Items sind japanisches Essen. Jedes hat eine einzigartige Silhouette und eigene Primärfarben. Die Prompts beschreiben nur das Objekt — Stil, Komposition, Hintergrund und Outline kommen aus den Guidelines.

⚠️ **WICHTIG:** Beim Rendern in Reve jeden Prompt IMMER mit der **Negative Prompt (Kawaii Flat)** anhängen. Alle Prompts folgen den **Reve Project Guidelines** (siehe oben) — Guidelines + Negative Prompt sind Pflicht für konsistente Ergebnisse.

1. **onigiri** *(abgerundetes Dreieck — weiss + schwarz/rot):*
   A single Japanese onigiri rice ball in a soft rounded triangle shape with a flat bottom edge, the body in clean white with a wide band of dark charcoal nori seaweed wrapped around the lower half, a small red umeboshi plum circle centered on the white face above the nori, a cute kawaii face with two simple dot eyes and a tiny curved smile on the white rice area with soft pink cheek circles. Always take the project guidelines and negative prompt into account. 

2. **nigiri** *(flaches Oval — lachs-orange + weiss):*
   A single piece of salmon nigiri sushi seen from the front, a horizontal oval pad of white rice on the bottom with a smooth curved slice of salmon in warm coral-orange draped neatly over the top, compact low profile wider than tall, the salmon slice showing a cute kawaii face with two simple dot eyes and a tiny curved smile. Always take the project guidelines and negative prompt into account. 

3. **maki** *(Kreis-Querschnitt — dunkelgrün + weiss/orange):*
   A single maki sushi roll seen as a perfect circle cross-section, a dark nori green outer ring, a white rice ring inside, a colorful center divided into salmon orange and avocado green segments. Always take the project guidelines and negative prompt into account. 

4. **temaki** *(Tütenform — dunkelgrün + bunt):*
   A single temaki hand roll cone shape angled to the upper right, dark nori green wrapper forming the cone with the pointed tip at the lower left, colorful sushi filling of salmon orange rice white and avocado green spilling generously out of the wide open top. Always take the project guidelines and negative prompt into account. 

5. **gyoza** *(Halbmond — goldgelb):*
   A single Japanese gyoza dumpling in a crescent half-moon shape, warm golden-yellow wrapper with a neat row of small crimped pleats along the entire curved top edge, smooth flat bottom edge, slightly wider than tall, a cute kawaii face with two simple dot eyes and a tiny curved smile on the smooth front of the wrapper. Always take the project guidelines and negative prompt into account. 

6. **taiyaki** *(Fischform — goldbraun):*
   A single taiyaki fish-shaped pastry in warm golden-brown, clearly recognizable fish silhouette with a rounded head on the left showing a cute kawaii face with two simple dot eyes and a tiny curved smile, a pointed dorsal fin on top, a small pectoral fin below, and a wide fan-shaped tail fin on the right. Always take the project guidelines and negative prompt into account. 

7. **dango** *(vertikaler Dreier-Stapel — pink/weiss/grün):*
   Three perfectly round dango balls stacked vertically on a thin pale bamboo skewer, top ball in soft sakura pink, middle ball in chalk white, bottom ball in soft matcha green, evenly spaced with the skewer visible between them, the middle white ball showing a cute kawaii face with two simple dot eyes and a tiny curved smile. Always take the project guidelines and negative prompt into account. 

8. **yakitori** *(horizontaler Spiess — karamellbraun):*
   Three chunky rectangular pieces of grilled chicken threaded on a horizontal bamboo skewer pointing to the right, warm caramel brown with subtle darker grill marks, the skewer in pale natural bamboo color extending past both ends. Always take the project guidelines and negative prompt into account. 

9. **ramen** *(breite Schale mit Stäbchen — cremegelb/terrakotta):*
   A wide round ramen bowl seen from the front with a pair of light wooden chopsticks angled upward from the right side, the bowl in warm terracotta red showing a cute kawaii face with two simple dot eyes and a tiny curved smile on the front of the bowl, golden broth with pale wavy noodles visible inside, a pink-and-white narutomaki spiral slice and a small dark nori rectangle as toppings. Always take the project guidelines and negative prompt into account. 

10. **mochi** *(flache Halbkugel — soft pink):*
    A single round mochi rice cake as a smooth soft pink squat dome shape sitting flat on its base, a subtle dusting of white starch powder on top, a cute kawaii face with two simple dot eyes and a tiny curved smile on the front of the dome with soft pink cheek circles, simple and minimal with no filling visible. Always take the project guidelines and negative prompt into account. 

11. **dorayaki** *(Doppelscheibe — honigbraun):*
    A single dorayaki seen from the front as two round golden honey-brown pancake discs stacked together with dark azuki red-brown bean paste filling visible as a generous stripe between them, slightly wider than tall, the top pancake showing a cute kawaii face with two simple dot eyes and a tiny curved smile. Always take the project guidelines and negative prompt into account. 

12. **takoyaki** *(Schiffchen mit Kugeln — goldbraun/kraft):*
    A small elongated paper boat tray in warm kraft-brown holding four round golden-brown takoyaki balls in a neat row, each ball topped with a thin squiggle of dark brown sauce and a tiny sprinkle of green aonori flakes, the front takoyaki ball showing a cute kawaii face with two simple dot eyes and a tiny curved smile, the boat shape longer than wide. Always take the project guidelines and negative prompt into account. 

13. **edamame** *(längliche Schote — hellgrün):*
    A single edamame soybean pod in bright fresh green, elongated and gently curved with two clearly visible round bean bumps pushing outward from inside the pod, a short brown stem at one end, the overall shape distinctly longer than wide. Always take the project guidelines and negative prompt into account. 

14. **matcha_latte** *(hoher Becher — matchagrün/weiss):*
    A tall straight-sided takeaway cup in clean white with a soft matcha-green plastic lid on top, a small white heart-shaped latte art visible on the green matcha surface just below the lid, a short brown kraft cardboard sleeve wrapped around the cup middle, a cute kawaii face with two simple dot eyes and a tiny curved smile on the white cup surface above the sleeve. Always take the project guidelines and negative prompt into account. 

15. **tamagoyaki** *(aufrechtes Rechteck — leuchtend gelb):*
    A single piece of tamagoyaki Japanese rolled omelette as a compact upright rectangle standing on its short end, bright warm yellow with three subtle horizontal layer lines showing the rolled egg structure, clean geometric shape. Always take the project guidelines and negative prompt into account. 

16. **wagashi** *(Fünf-Blatt-Blüte auf Teller — pastell-lila):*
    A single nerikiri wagashi sweet molded into a five-petal flower shape, soft pastel lavender petals with gently rounded edges, a small round matcha-green ball in the center, the flower showing a cute kawaii face with two simple dot eyes and a tiny curved smile, sitting on a tiny dark charcoal round plate beneath it. Always take the project guidelines and negative prompt into account. 

17. **kakigori** *(Eisberg auf Schale — hellblau):*
    A tall mound of fluffy shaved ice rising in a soft peak from a small round white bowl, the ice tinted in pale sky blue with a drizzle of deeper blue syrup streaming down one side, a small bright red cherry sitting on the very top, a cute kawaii face with two simple dot eyes and a tiny curved smile on the front of the ice mound, distinctly taller than wide. Always take the project guidelines and negative prompt into account. 

18. **ichigo_daifuku** *(Kugel mit Erdbeerspitze — weiss/rot):*
    A single round ichigo daifuku, a smooth white mochi ball with the pointed red tip of a strawberry peeking through the slightly translucent top, a tiny bright green leaf and short stem visible at the very peak, a cute kawaii face with two simple dot eyes and a tiny curved smile on the white mochi surface, the overall shape a round ball with a small accent on top. Always take the project guidelines and negative prompt into account. 

19. **sakura_mochi** *(rosa Kugel in grossem Blatt — rosa/dunkelgrün):*
    A single sakura mochi with a soft pink mochi ball in the center wrapped in a large flat dark green pickled sakura leaf, the pink mochi showing a cute kawaii face with two simple dot eyes and a tiny curved smile, the leaf extends horizontally well beyond the mochi on both sides creating a distinctly wider-than-tall silhouette with visible pointed leaf tips at the left and right edges. Always take the project guidelines and negative prompt into account. 

20. **inarizushi** *(Tofu-Täschchen — goldbraun/weiss):*
    A single piece of inarizushi, a plump golden-brown fried tofu pouch standing slightly upright with its top open revealing white sushi rice filling inside, a cute kawaii face with two simple dot eyes and a tiny curved smile on the front of the tofu pouch, oval football-like silhouette slightly taller than wide, the tofu skin in warm amber-gold. Always take the project guidelines and negative prompt into account. 

### Layout-Konzept: Freies Grid

Items sitzen in einem **unsichtbaren Grid** direkt über dem Hintergrund. Kein Regal, kein Cabinet, keine physischen Regalbretter. Die Reihen- und Spaltenanzahl wird vom Level bestimmt.

**Vorteile gegenüber Cabinet:**
- Maximale Spielfläche — kein Platz geht an Rahmen, Pfosten oder Ornamente verloren
- Null Pipeline-Aufwand für Layout-Messung (keine `CABINET_SHELF_RATIOS`, `BG_FRAME_RECTS`, `BG_CAVITY_RECTS`)
- Hintergrund ist ein einziges deckende Bild pro Level-Gruppe — kein Parallax-Layer-System
- Neue Level-Konfigurationen (andere Reihen/Spalten) brauchen keinen neuen Render

**Im Code:**
- Grid-Positionen werden rein rechnerisch aus Canvas-Grösse, Reihen-/Spaltenanzahl und Padding berechnet
- Ein halbtransparentes Overlay (Creme/Weiss, ~30 % Deckkraft) liegt im Grid-Bereich über dem Hintergrund für Item-Lesbarkeit
- Hintergrund wird als einzelnes deckende `bgl_`-Bild geladen, passend zur Level-Gruppe
- Die Imports `CABINET_SHELF_RATIOS`, `BG_FRAME_RECTS`, `BG_CAVITY_RECTS` entfallen

### Hintergrund-Szenen — Kawaii Flat (bgl_)

Statt Parallax-Layern und Cabinet-Rahmen gibt es **eine einzige deckende Szene** pro Level-Gruppe. Die Items schweben im Grid darüber. Jede Szene hat einen bewusst ruhigen Mittelbereich (~70 % der Fläche), damit die Items sauber lesbar bleiben. Dekorative Elemente sind an die Ränder gepusht.

Alle Szenen werden gegen ihren **natürlichen Hintergrund** gerendert (Himmel, Wände, Flächen) — **kein Magenta**, kein Chroma-Keying. Format: Portrait 9:16.

**bgl_kitchen** *(Levels 1–2 — gemütliche japanische Küche, warm/einladend):*
Cute kawaii flat illustration of a cozy Japanese home kitchen interior seen from the front, warm cream-colored walls with a soft mint-green subway tile backsplash in the upper portion, light natural wood open shelving with a few tiny decorative ceramic jars at the very top edge, a warm honey-toned wood countertop surface across the bottom fifth, a small window with simple white curtains and soft warm morning light in the upper right corner, a tiny potted herb on the windowsill, the large center area deliberately plain and empty showing only the smooth cream wall with no objects or clutter, warm and inviting atmosphere, all decorative details pushed to the very edges and corners only, no food items anywhere in the scene, kawaii flat illustration style with clean dark-brown outlines and solid flat pastel fills, tall portrait 9:16, no text, no watermark, 8k resolution

**bgl_yatai** *(Levels 3–4 — japanischer Strassenstand bei Abend, festlich):*
Cute kawaii flat illustration of a Japanese yatai street food stall at evening seen from the front, a row of warm glowing paper chochin lanterns in soft red and cream hanging across the top third on thin strings, a dark navy noren curtain with a simple white circular mon crest draped at the very top edge, warm amber evening light illuminating everything, the large center area deliberately plain and empty showing only a soft warm beige wall surface with no objects, a simple dark wood counter ledge across the bottom edge, tiny warm string lights twinkling at the upper corners, all decorative details at the top and bottom edges only with the center left clean, no food items anywhere in the scene, kawaii flat illustration style with clean dark-brown outlines and solid flat fills, warm amber evening color palette, tall portrait 9:16, no text, no watermark, 8k resolution

**bgl_konbini** *(Levels 5–6 — heller japanischer Konbini-Innenraum, modern/gemütlich):*
Cute kawaii flat illustration of a bright Japanese convenience store konbini interior seen from the front, a clean white ceiling with a simple rectangular fluorescent light panel across the very top edge and a small colorful striped awning banner in red blue and green at the very top center, neat rows of colorful product shelving with tiny kawaii-faced bottles and snack boxes lining the left and right edges only, a warm light wood floor across the bottom 10 percent with a small cute potted plant with a kawaii face at the bottom left corner, a tiny maneki neko figurine at the bottom right corner, the large center area at least 70 percent of the frame showing a clean empty aisle with a smooth soft cream-white back wall and absolutely no objects, warm soft lighting with a cozy inviting glow, all product shelves and decorative details pushed strictly to the left and right side edges and the top and bottom, no food items in the center area, kawaii flat illustration style with clean soft dark-brown outlines and solid warm pastel fills matching a cozy Japanese interior aesthetic, bright but warm modern color palette, tall portrait 9:16, no text, no watermark, 8k resolution

### UI Card Prompts — Kawaii Flat

Die Karte wird per NineSlice gezeichnet. Ecken und Kanten müssen im äusseren Drittel der Kartenhöhe liegen, das Mittelfeld muss ruhig und wiederholbar sein.
Format: Portrait 9:16 Canvas, Karte horizontal zentriert, grosszügiges Padding. Magenta-Hintergrund.

⚠️ **WICHTIG:** Beim Rendern in Reve jeden Prompt mit der **Negative Prompt (Kawaii Flat)** anhängen und die **Reve Project Guidelines** befolgen.

**ui_card_kuro** *(Header-Plakette: Score / Bar / Moves):*
Extremely wide horizontal nameplate bar in cute kawaii flat illustration style, aspect ratio 6:1, a smooth rounded rectangle body in dark charcoal gray with a thin warm gold pinstripe along the top and bottom edges, tiny gold circular dots at the far left and far right ends as minimal decoration, completely plain and unornamented uniform charcoal center field, softly rounded corners with generous radius, clean dark-brown outline of uniform weight, centered horizontally on a portrait 9:16 canvas with generous padding above and below, front-facing flat view, pure solid magenta background (#FF00FF), zero shadow, sharp clean edges, 8k resolution

**ui_card_hinoki** *(Booster-Tray):*
Wide horizontal tray bar in cute kawaii flat illustration style, aspect ratio 4:1, a smooth rounded rectangle body in warm light honey-wood color with a shallow slightly darker recessed inner channel running the full length, two small rounded end caps at the far left and far right in slightly darker wood tone, completely plain center field, softly rounded corners, clean dark-brown outline of uniform weight, centered horizontally on a portrait 9:16 canvas with generous padding, front-facing flat view, pure solid magenta background (#FF00FF), zero shadow, sharp clean edges, 8k resolution

### Booster Button Prompts — Kawaii Flat

Format: Portrait 9:16 Canvas, Objekt mittig, genau ein Objekt. Alle drei Buttons mit identischem rundem Körper in Soft Cream, nur das Symbol unterscheidet sich — so wirkt die Reihe einheitlich. Magenta-Hintergrund.

⚠️ **WICHTIG:** Beim Rendern in Reve jeden Prompt mit der **Negative Prompt (Kawaii Flat)** anhängen und die **Reve Project Guidelines** befolgen.

**btn_undo:**
Single round push button in cute kawaii flat illustration style, a smooth soft cream circle body with a chunky matcha-green counter-clockwise curved arrow symbol in the center, clean dark-brown outline of uniform weight on all shapes, front-facing flat view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero shadow, sharp clean edges, 8k resolution

**btn_shuffle:**
Single round push button in cute kawaii flat illustration style, a smooth soft cream circle body with two chunky soft rose-pink arrows crossing each other in an X pattern in the center, clean dark-brown outline of uniform weight on all shapes, front-facing flat view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero shadow, sharp clean edges, 8k resolution

**btn_hammer:**
Single round push button in cute kawaii flat illustration style, a smooth soft cream circle body with a chunky warm honey-brown mallet symbol in the center, clean dark-brown outline of uniform weight on all shapes, front-facing flat view, centered on a portrait 9:16 canvas with generous even padding, pure solid magenta background (#FF00FF), zero shadow, sharp clean edges, 8k resolution

### Match Feedback FX — Kawaii Flat

Format: Portrait 9:16 mobile Canvas, zentrierter quadratischer Effekt mit Padding. Magenta-Hintergrund.

⚠️ **WICHTIG:** Beim Rendern in Reve den Prompt mit der **Negative Prompt (Kawaii Flat)** anhängen und die **Reve Project Guidelines** befolgen.

**fx_match_burst:**
Cute kawaii flat celebration burst effect, a centered radial starburst of warm golden-yellow rays radiating outward from the middle, small pastel confetti shapes in soft pink and mint-green and lavender scattered between the rays, tiny gold five-pointed star sparkles dotted around, three subtle concentric circles in soft gold, clean flat shapes with uniform dark-brown outlines, no objects, no text, no numbers, no characters, crisp isolated front-facing graphic, portrait 9:16 mobile canvas, generous padding around the centered square effect, pure solid magenta background (#FF00FF), sharp clean edges, 8k resolution

---

## 4. Prompt- & Asset-Workflow

Der komplette Weg von einem Prompt aus Abschnitt 3 bis zum fertigen Asset im Spiel.

### Schritt 1 — Rendern
**Dateiformat:** PNG bevorzugen. JPEG funktioniert — freigestellt wird ohnehin gegen Magenta, nicht über einen Alphakanal. JPEG-Ringing an harten Kanten hinterlässt aber graue Sprenkel; bei Kawaii Flat mit den sauberen Outlines fällt das weniger auf als bei Kiri-e, PNG ist trotzdem sauberer.

Prompt aus Abschnitt 3 nehmen, **Negative Prompt (Kawaii Flat)** anhängen, in **Reve** rendern (Projekt mit Guidelines und Style-References konfiguriert, siehe Abschnitt 3).
Immer **Portrait 9:16** wählen — auch für quadratische Objekte. Das Modell liefert sonst Landscape und der Alpha-Crop schneidet Kanten ab.

**Hintergrund-Szenen (`bgl_`)** werden **ohne Negative Prompt** gerendert — die Szenen sind deckend und brauchen kein Chroma-Keying. Der Negative Prompt enthält Einschränkungen (kein Gradient etc.), die für Szenen kontraproduktiv wären.

### Schritt 2 — Ablegen
Datei unter ihrem **exakten Asset-Namen** nach `raw_renders/` legen (`.png`, `.jpg` oder `.jpeg`).
Der Dateiname steuert die gesamte Verarbeitung — es gibt keine Konfiguration ausserhalb des Namens:

| Prefix | Verarbeitung | Ausgabe |
|---|---|---|
| `bgl_` | Skalierung auf 1440 px Breite, **kein Chroma-Keying**, deckend | Hintergrundbild |
| `ui_card_` | Defringe, exakter Alpha-Crop, Höhe auf 256 normalisiert, Breite proportional | NineSlice-Karte |
| `btn_` / `ui_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Buttons & Icons |
| `fx_` | Defringe, exakter Alpha-Crop, 384×384 zentriert | Match-Effekt |
| Item-ID | Defringe, exakter Alpha-Crop, 384×384, Bottom-Offset gemessen | `ITEM_BOTTOM_OFFSETS` |

Die Zielgrössen stehen als Konstanten oben in `scripts/process_assets.js` und sind an der Canvasbreite bei `devicePixelRatio` 3 bemessen (rund 1240 px, siehe Abschnitt 1a).

Wird eine Zielgrösse geändert, muss der Despill-Radius (`EDGE_SPRITE` / `EDGE_LAYER`) denselben Faktor bekommen: er ist eine Pixelbreite am fertigen Bild und deckt sonst nur noch den halben Saum ab.

Items müssen zusätzlich in `ITEM_IDS` (`scripts/process_assets.js`) stehen, sonst werden sie übersprungen.

### Schritt 3 — Verarbeiten
```
npm run process:assets
```
Schreibt nach `public/assets/items/` und regeneriert `src/item_offsets.generated.ts` mit folgenden Exports:

- `ITEM_BOTTOM_OFFSETS` — sichtbare Unterkante je Item
- `AVAILABLE_ASSETS` — alles, was tatsächlich in `public/assets/items/` liegt

**Nicht mehr exportiert** (Grid-Layout braucht sie nicht): `BG_CAVITY_RECTS`, `BG_FRAME_RECTS`, `CABINET_SHELF_RATIOS`.

**Ausgabeformat ist WebP** (`OUT_EXT`), nicht PNG. `alphaQuality: 100` hält den Alphakanal verlustfrei. Der Loader hängt die Endung über den generierten Export `ASSET_EXT` an, im Code steht sie nirgends fest.

Reste eines früheren Ausgabeformats werden beim Lauf aus `public/assets/items/` gelöscht, sonst lägen dieselben Assets doppelt im Build.

Alle Exports werden **am fertigen Bild** gemessen bzw. gelistet — nie im Code hardcoden.
`AVAILABLE_ASSETS` steuert das Laden optionaler Assets: der Vite-Dev-Server liefert für fehlende Dateien das HTML-Fallback mit Status 200, der Phaser-Loader würde daran hängenbleiben.

**Freistellen in zwei Stufen.** Erst wird die Maske in zusammenhängende Flächen zerlegt, dann erst die Bounding-Box gezogen:

- `union` (Items, Buttons, FX): alle Flächen ab 8 % der grössten zusammen. Abgesetzte Details (z. B. Stäbchen am Ramen, Blatt am Sakura Mochi) bleiben erhalten, Defringe-Krimskrams fällt raus.
- `widest` (UI-Karten): die Fläche mit dem breitesten Seitenverhältnis, als einzige.

**Hintergrund-Szenen** werden NICHT freigestellt — sie sind deckend und durchlaufen nur die Skalierung.

**Innenlöcher.** Freigestellt wird gegen Magenta — bei hellen Pastellflächen nahe am Magenta-Saum kann das Keying auch Innenflächen treffen. `fillInteriorHoles` flutet nach dem Keying von den Bildrändern durch die transparenten Pixel; was dabei nicht erreicht wird, liegt im Objektinneren und bekommt seine Deckung zurück.

**Weiche Ränder.** `trimSoftEdges` schrumpft die Box, solange eine Randreihe unter 90 % Deckung liegt.

**Schattenränder.** `trimShadowEdges` schrumpft die Box kantenweise, solange eine Randreihe zu ≥ 90 % aus unbunten hellen Pixeln besteht. Läuft **nur für `ui_card_`** — flache Rechtecke, bei denen der Streifen auffällt.

**Chroma-Spill und Kantenglättung.** `cleanEdges` läuft als letzter Schritt auf dem fertig skalierten Bild (`writeClean`), bewusst nicht bei voller Renderauflösung. Bei Kawaii Flat mit sauberen Outlines fällt deutlich weniger Chroma-Spill an als bei Kiri-e.

- **Despill.** Die Magenta-Fläche strahlt im Render auf das Motiv ab. Der Kanal, in dem der Hintergrund am dunkelsten ist (bei Magenta das Grün), ist der Referenzwert; was in den beiden anderen darüber liegt, wird abgezogen.
- **Alphaglättung.** 3×3-Mittel, aber nur wo im Umfeld sowohl deckende als auch transparente Pixel liegen.

Das Log meldet `N relevante Objekte im Render` — steht da mehr als 1, hat der Render Ballast und die Strategie hat geraten. Dann lieber neu rendern.

### Schritt 4 — Registrieren
Pflicht-Assets in `PreloadScene.preload()` (`src/main.ts`) mit `this.load.image(...)` laden, optionale mit `loadOptional(key)`.
Hintergrund-Szenen (`bgl_kitchen`, `bgl_yatai`, `bgl_hanami`) werden geladen, sobald sie in `AVAILABLE_ASSETS` auftauchen. Der Code wählt anhand der Level-Gruppe die passende Szene. Fehlt eine Szene, wird ein einfacher Farbverlauf als Fallback gezeichnet.

### Schritt 5 — Prüfen
```
npm run build && npm run dev
```
Checkliste im Browser (DevTools auf ein Telefon mit DPR 3 stellen — bei DPR 1 fällt eine Auflösungsregression nicht auf):
- `document.querySelector('canvas').width` ist die CSS-Breite **mal DPR**, nicht die CSS-Breite
- Hintergrund-Szene passt zur Level-Gruppe (kitchen / yatai / hanami)
- Items sind im Grid gleichmässig verteilt, kein Überlappen
- Items heben sich klar vom Hintergrund ab (Overlay-Deckkraft prüfen)
- Alle 20 Food-Items laden als Kawaii-Flat-Texturen, kein Procedural-Fallback
- Ein Zug fliegt in einer Parabel zum Zielslot, nicht seitlich herein

### Schritt 6 — Prompt zurückschreiben
Den tatsächlich verwendeten Prompt in Abschnitt 3 aktualisieren, inkl. Versionsnotiz, warum die Vorgängerversion ersetzt wurde. Der Katalog ist die einzige Quelle für Re-Renders.

### Offene Punkte
- **Alle 20 Food-Items** müssen im Kawaii-Flat-Stil gerendert werden (Reve). Empfohlene Reihenfolge: erst onigiri + ramen als Style-References, dann den Rest.
- **Drei Hintergrund-Szenen** (bgl_kitchen, bgl_yatai, bgl_hanami) müssen gerendert werden. Kein Magenta-Hintergrund — die Szenen sind deckend.
- **Pipeline-Anpassung** (`scripts/process_assets.js`): `bgl_`-Prefix auf reine Skalierung umstellen (kein Chroma-Keying), `ITEM_IDS` auf die 20 neuen Food-Items aktualisieren, `bgl_cabinet_*`-Sonderbehandlung und Exports (`CABINET_SHELF_RATIOS`, `BG_FRAME_RECTS`, `BG_CAVITY_RECTS`) entfernen.
- **Code-Umbau** (`src/main.ts`): Cabinet-System entfernen, Grid-Layout implementieren, `ITEMS`-Registry und `LEVELS` auf neue Food-IDs umstellen, Parallax-Layer-System durch einzelne Hintergrund-Szene ersetzen, halbtransparentes Overlay im Grid-Bereich ergänzen.
- **UI-Karten** (`ui_card_kuro` / `ui_card_hinoki`) werden aktuell nicht gezeichnet — der Header steht frei über der Szene. `addCardNineSlice` bleibt im Code.
- **Booster Buttons** im neuen Kawaii-Flat-Stil rendern — runde Buttons statt der bisherigen quadratischen Kiri-e-Buttons.
- **FX** (fx_match_burst) im neuen Stil rendern.
