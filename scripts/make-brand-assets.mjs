import sharp from "sharp";
import { readFileSync } from "node:fs";

const mark = sharp("src/assets/brand/mark.webp").resize(1000, 1000, { fit: "fill" });
await sharp({
  create: {
    width: 1200,
    height: 1200,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: await mark.png().toBuffer(), left: 100, top: 100 }])
  .png()
  .toFile("public/logo.png");

await sharp("src/assets/brand/mark.webp")
  .resize(32, 32)
  .png()
  .toFile("public/favicon-32.png");

await sharp("src/assets/brand/mark.webp")
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");

const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9ec0e4"/>
      <stop offset="0.55" stop-color="#f3d7a4"/>
      <stop offset="1" stop-color="#f7e7cf"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7ea8c9"/>
      <stop offset="1" stop-color="#1d4d6e"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="360" fill="url(#sky)"/>
  <rect y="360" width="1200" height="270" fill="url(#sea)"/>
  <rect y="356" width="1200" height="2" fill="#fff6e8" opacity="0.85"/>
  <circle cx="860" cy="300" r="46" fill="#ffd27a" opacity="0.9"/>
  <text x="80" y="120" fill="#142028" font-family="Georgia, serif" font-size="28" letter-spacing="4">NEOLEVERAGE</text>
  <text x="80" y="200" fill="#142028" font-family="Georgia, serif" font-size="64">Tailwinds</text>
  <text x="80" y="268" fill="#142028" font-family="Georgia, serif" font-size="64">For Your Growth</text>
</svg>`;

await sharp(Buffer.from(ogSvg)).png().toFile("public/og-default.png");

const coverSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8eb4d8"/>
      <stop offset="1" stop-color="#f6d7a6"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6e9bbd"/>
      <stop offset="1" stop-color="#163e5c"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="460" fill="url(#sky)"/>
  <rect y="460" width="1200" height="340" fill="url(#sea)"/>
  <path d="M0 470 C 200 455 400 488 600 468 C 800 448 1000 482 1200 460" fill="none" stroke="#fff6ea" stroke-width="2" opacity="0.7"/>
  <path d="M0 520 C 220 500 420 540 640 512 C 860 484 1020 530 1200 508" fill="none" stroke="#d7ecf8" stroke-width="1.5" opacity="0.45"/>
</svg>`;

await sharp(Buffer.from(coverSvg)).png().toFile("src/assets/covers/horizon.png");

const wordmark = readFileSync("src/assets/brand/wordmark.svg");
await sharp(wordmark).resize({ width: 800 }).png().toFile("src/assets/brand/wordmark-preview.png");

console.log("brand assets written");
