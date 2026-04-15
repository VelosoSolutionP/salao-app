import sharp from "sharp";
import { writeFileSync } from "fs";
import path from "path";

const PUBLIC = path.join(process.cwd(), "public");

// SVG for the Bellefy icon — "B" letterform + sparkle on gradient background
function makeSvg(size) {
  const s = size;
  const pad = s * 0.14;
  const w = s - pad * 2;     // drawable width
  const h = s - pad * 2;     // drawable height
  const ox = pad;            // origin x
  const oy = pad;            // origin y

  // Scale factor from 24-unit viewbox
  const sc = w / 24;
  const tx = ox;
  const ty = oy;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="${s}" height="${s}" fill="url(#bg)" rx="${s * 0.22}"/>
  <!-- Bellefy B + sparkle, white, centered -->
  <g transform="translate(${tx}, ${ty}) scale(${sc})">
    <!-- Bold B -->
    <path fill="white" d="M3 2v20h9c2.8 0 5-2.2 5-5 0-1.6-.8-3.1-2-4 1-.9 1.7-2.2 1.7-3.6C16.7 6.5 14.8 5 12.5 5H3zm3 2.8 5.8.2c1.1 0 1.9.8 1.9 1.9s-.8 1.9-1.9 1.9H6V4.8zm0 6.2h6.2c1.3 0 2.3 1 2.3 2.3 0 1.2-1 2.2-2.3 2.2H6v-4.5z"/>
    <!-- Sparkle star -->
    <path fill="white" d="M20.5 1.5 21.3 3.7 23.5 4.5 21.3 5.3 20.5 7.5 19.7 5.3 17.5 4.5 19.7 3.7z"/>
  </g>
</svg>`;
}

async function generate(name, size, maskable = false) {
  const padding = maskable ? size * 0.14 : 0;
  const innerSize = size - padding * 2;

  let svg;
  if (maskable) {
    // Maskable: full bleed background, icon smaller
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${padding}, ${padding})">
    <svg width="${innerSize}" height="${innerSize}" viewBox="0 0 24 24">
      <path fill="white" d="M3 2v20h9c2.8 0 5-2.2 5-5 0-1.6-.8-3.1-2-4 1-.9 1.7-2.2 1.7-3.6C16.7 6.5 14.8 5 12.5 5H3zm3 2.8 5.8.2c1.1 0 1.9.8 1.9 1.9s-.8 1.9-1.9 1.9H6V4.8zm0 6.2h6.2c1.3 0 2.3 1 2.3 2.3 0 1.2-1 2.2-2.3 2.2H6v-4.5z"/>
      <path fill="white" d="M20.5 1.5 21.3 3.7 23.5 4.5 21.3 5.3 20.5 7.5 19.7 5.3 17.5 4.5 19.7 3.7z"/>
    </svg>
  </g>
</svg>`;
  } else {
    svg = makeSvg(size);
  }

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const outPath = path.join(PUBLIC, name);
  writeFileSync(outPath, buf);
  console.log(`✓ ${name} (${size}x${size})`);
}

await generate("icon-192.png", 192);
await generate("icon-512.png", 512);
await generate("icon-maskable.png", 512, true);
console.log("Bellefy icons generated.");
