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
   
