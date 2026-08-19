// scripts/process_assets.js
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const RAW_DIR = './raw_renders';
const OUT_DIR = './public/assets/items';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function processImages() {
  if (!fs.existsSync(RAW_DIR)) return;
  const files = fs.readdirSync(RAW_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
  });

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const baseName = path.parse(file).name;
    const targetPath = path.join(OUT_DIR, `${baseName}.png`);

    console.log(`Processing: ${file}`);

    // FALL 1: Hintergrund (Seitenverhältnis erhalten, Breite 720)
    if (baseName.startsWith('bg_')) {
      await sharp(filePath)
        .resize(720, null, { fit: 'inside' })
        .png({ quality: 90 })
        .toFile(targetPath);
      continue;
    }

    // FALL 2: Regal-Leiste (Freistellen, aber breites Seitenverhältnis beibehalten)
    if (baseName.startsWith('shelf_')) {
      const image = sharp(filePath).ensureAlpha();
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

      for (let i = 0; i < data.length; i += 4) {
        const dist = Math.sqrt((255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2);
        if (dist < 18) data[i + 3] = 0;
        else if (dist < 38) data[i + 3] = Math.floor(((dist - 18) / 20) * 255);
      }

      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .trim()
        .resize(608, 184, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toFile(targetPath);
      continue;
    }

    // FALL 3: Goods & UI-Icons (Freistellen & 256x256 Quadrat)
    const image = sharp(filePath).ensureAlpha();
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.sqrt((255 - data[i]) ** 2 + (255 - data[i + 1]) ** 2 + (255 - data[i + 2]) ** 2);
      if (dist < 18) data[i + 3] = 0;
      else if (dist < 38) data[i + 3] = Math.floor(((dist - 18) / 20) * 255);
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