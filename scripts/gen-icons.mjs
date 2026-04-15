/**
 * Gera os ícones PWA da Hera: 192, 512 e maskable.
 * Coroa de três pontas, gems nas pontas, fundo gradiente violeta.
 * Uso: node scripts/gen-icons.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

/** SVG da coroa em escala para um canvas size×size */
function crownSvg(size) {
  // Proporções baseadas num grid 24×24 — escalamos para size×size
  // mas adicionamos padding para a coroa não encostar nas bordas.
  const pad   = size * 0.15;        // 15% de margem em cada lado
  const inner = size - pad * 2;    // área útil
  const s     = inner / 24;        // escala do grid

  // Converte coordenadas do grid 24×24 para o canvas final
  const x = (v) => (pad + v * s).toFixed(2);
  const y = (v) => (pad + v * s).toFixed(2);

  // Para o maskable usamos um safe-zone maior (só 10% de padding extra)
  const crownPath = [
    `M${x(2)},${y(23)}`,
    `H${x(22)}`,
    `V${y(17)}`,
    `L${x(18)},${y(9)}`,
    `L${x(14)},${y(15)}`,
    `L${x(12)},${y(4)}`,
    `L${x(10)},${y(15)}`,
    `L${x(6)},${y(9)}`,
    `L${x(2)},${y(17)}`,
    "Z",
  ].join(" ");

  const r1 = (1.5 * s).toFixed(2);
  const r2 = (1.2 * s).toFixed(2);

  // Gradiente de fundo: violeta → índigo (igual ao app)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${(size * 0.02).toFixed(1)}" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Fundo redondo -->
  <rect width="${size}" height="${size}" rx="${(size * 0.22).toFixed(0)}" fill="url(#bg)"/>

  <!-- Brilho interno suave -->
  <ellipse cx="${size / 2}" cy="${size * 0.35}" rx="${size * 0.38}" ry="${size * 0.28}"
           fill="rgba(255,255,255,0.10)"/>

  <!-- Sombra da coroa -->
  <path d="${crownPath}" fill="rgba(0,0,0,0.25)" transform="translate(${(size*0.012).toFixed(1)},${(size*0.012).toFixed(1)})"/>

  <!-- Coroa branca -->
  <path d="${crownPath}" fill="white"/>

  <!-- Gemas nas pontas -->
  <circle cx="${x(12)}" cy="${y(4)}"  r="${r1}" fill="#e9d5ff"/>
  <circle cx="${x(6)}"  cy="${y(9)}"  r="${r2}" fill="#e9d5ff"/>
  <circle cx="${x(18)}" cy="${y(9)}"  r="${r2}" fill="#e9d5ff"/>
</svg>`;
}

/** SVG maskable: coroa centralizada, fundo cobre tudo (sem rx) */
function maskableSvg(size) {
  const pad   = size * 0.20;
  const inner = size - pad * 2;
  const s     = inner / 24;

  const x = (v) => (pad + v * s).toFixed(2);
  const y = (v) => (pad + v * s).toFixed(2);

  const crownPath = [
    `M${x(2)},${y(23)}`,
    `H${x(22)}`,
    `V${y(17)}`,
    `L${x(18)},${y(9)}`,
    `L${x(14)},${y(15)}`,
    `L${x(12)},${y(4)}`,
    `L${x(10)},${y(15)}`,
    `L${x(6)},${y(9)}`,
    `L${x(2)},${y(17)}`,
    "Z",
  ].join(" ");

  const r1 = (1.5 * s).toFixed(2);
  const r2 = (1.2 * s).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>

  <!-- Fundo sólido (maskable precisa cobrir 100%) -->
  <rect width="${size}" height="${size}" fill="url(#bg)"/>

  <!-- Brilho -->
  <ellipse cx="${size / 2}" cy="${size * 0.38}" rx="${size * 0.42}" ry="${size * 0.30}"
           fill="rgba(255,255,255,0.08)"/>

  <!-- Sombra -->
  <path d="${crownPath}" fill="rgba(0,0,0,0.20)" transform="translate(${(size*0.01).toFixed(1)},${(size*0.01).toFixed(1)})"/>

  <!-- Coroa -->
  <path d="${crownPath}" fill="white"/>

  <!-- Gemas -->
  <circle cx="${x(12)}" cy="${y(4)}"  r="${r1}" fill="#e9d5ff"/>
  <circle cx="${x(6)}"  cy="${y(9)}"  r="${r2}" fill="#e9d5ff"/>
  <circle cx="${x(18)}" cy="${y(9)}"  r="${r2}" fill="#e9d5ff"/>
</svg>`;
}

async function generate() {
  const out = path.join(process.cwd(), "public");

  await sharp(Buffer.from(crownSvg(192)))
    .png()
    .toFile(path.join(out, "icon-192.png"));
  console.log("✓ icon-192.png");

  await sharp(Buffer.from(crownSvg(512)))
    .png()
    .toFile(path.join(out, "icon-512.png"));
  console.log("✓ icon-512.png");

  await sharp(Buffer.from(maskableSvg(512)))
    .png()
    .toFile(path.join(out, "icon-maskable.png"));
  console.log("✓ icon-maskable.png");

  console.log("\nÍcones gerados com sucesso!");
}

generate().catch((e) => { console.error(e); process.exit(1); });
