import sharp from 'sharp';
import { globSync } from 'glob';
import path from 'path';
import fs from 'fs';

const RAW_DIR = './raw_renders';
const OUT_DIR = './public/assets/items';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function processImages() {
  const files = globSync(`${RAW_DIR}/*.png`);
  if (files.length === 0) {
    console.log('No raw renders found in ./raw_renders. Vector CMF fallbacks will be used.');
    return;
  }

  for (const file of files) {
    const filename = path.basename(file);
    const targetPath = path.join(OUT_DIR, filename);

    console.log(`Processing & Defringing: ${filename}`);

    const image = sharp(file).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Euclidean distance threshold to strip white backdrop and soft white fringes
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

      if (dist < 15) {
        data[i + 3] = 0;
      } else if (dist < 35) {
        data[i + 3] = Math.floor(((dist - 15) / 20) * 255);
      }
    }

    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(targetPath);
  }
  console.log('Asset Processing Complete.');
}

processImages();
                                                       
