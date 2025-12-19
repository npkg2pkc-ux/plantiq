/**
 * PWA Icon Generator Script
 *
 * Untuk membuat icon PWA dari SVG, jalankan salah satu cara berikut:
 *
 * CARA 1: Menggunakan online tool (Paling mudah)
 * 1. Buka https://realfavicongenerator.net/ atau https://www.pwabuilder.com/imageGenerator
 * 2. Upload gambar logo (minimal 512x512 pixels)
 * 3. Download semua icon yang dihasilkan
 * 4. Letakkan di folder public/icons/
 *
 * CARA 2: Menggunakan Sharp (Node.js)
 * npm install sharp
 * node generate-icons.js
 *
 * CARA 3: Manual dengan Figma/Canva
 * 1. Buka icon.svg di browser
 * 2. Screenshot dan resize ke ukuran yang dibutuhkan:
 *    - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, "public/icons/icon.svg");
const outputDir = path.join(__dirname, "public/icons");

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(inputSvg).resize(size, size).png().toFile(outputFile);

      console.log(`✓ Generated ${outputFile}`);
    } catch (error) {
      console.error(`✗ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  console.log("\nDone! Icons generated in public/icons/");
}

// Run the generator
generateIcons().catch(console.error);
