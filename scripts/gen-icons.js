const sharp = require("sharp");
const fs = require("fs");

async function generateIcon(size, filename) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.12)}" fill="#18181b"/>
    <g transform="translate(${size * 0.15}, ${size * 0.15})">
      <rect width="${size * 0.7}" height="${size * 0.7}" rx="${Math.floor(size * 0.03)}" fill="none" stroke="white" stroke-width="${Math.floor(size * 0.04)}"/>
      <rect x="${size * 0.1}" y="${size * 0.1}" width="${size * 0.15}" height="${size * 0.15}" rx="${Math.floor(size * 0.01)}" fill="white"/>
      <rect x="${size * 0.4}" y="${size * 0.1}" width="${size * 0.15}" height="${size * 0.15}" rx="${Math.floor(size * 0.01)}" fill="white"/>
      <rect x="${size * 0.1}" y="${size * 0.4}" width="${size * 0.15}" height="${size * 0.15}" rx="${Math.floor(size * 0.01)}" fill="white"/>
      <rect x="${size * 0.4}" y="${size * 0.4}" width="${size * 0.15}" height="${size * 0.15}" rx="${Math.floor(size * 0.02)}" fill="white"/>
    </g>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(filename);
  console.log(`Generated ${filename}`);
}

async function main() {
  await generateIcon(192, "public/icon-192x192.png");
  await generateIcon(512, "public/icon-512x512.png");
  console.log("All icons generated");
}

main().catch(console.error);
