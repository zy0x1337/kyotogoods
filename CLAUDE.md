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

9. **bg_kissa_niche** *(existing – Levels 1–3, cavity ≈66% of frame):*
   Front-facing rectangular wall niche carved into warm blonde hinoki wood frame, matte white plaster interior cavity, soft ambient overhead light casting gentle warmth, Japanese modern kissa aesthetic, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

10. **bg_kissa_niche_mid** *(Levels 4–5, cavity ≈78% of frame):*
    Front-facing wide rectangular wall niche carved into warm blonde hinoki wood frame with thinner side pillars, matte white plaster interior cavity, soft ambient overhead light, Japanese modern kissa aesthetic, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

11. **bg_kissa_niche_wide** *(Level 6, cavity ≈88% of frame):*
    Front-facing very wide panoramic wall niche carved into warm blonde hinoki wood frame with minimal thin side pillars, matte white plaster interior cavity, soft ambient overhead light, Japanese modern kissa aesthetic, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

### UI Card Prompts
12. **ui_card_kuro:**
    Minimalist horizontal bar card in matte charcoal black kuro steel with subtle brushed brass edge trim, Japanese modern kissa aesthetic, clean rounded corners, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw

13. **ui_card_hinoki:**
    Minimalist horizontal bar card in warm blonde hinoki wood with clean chamfered edges and subtle grain texture, Japanese modern kissa aesthetic, orthographic front view, pure solid white background (#FFFFFF), art toy product render, 8k resolution --style raw
   
