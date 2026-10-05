import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const markPath = "src/assets/brand/mark.webp";

function octagon(size) {
  const cut = size / (2 + Math.SQRT2);
  const edge = size;
  return [
    [cut, 0],
    [edge - cut, 0],
    [edge, cut],
    [edge, edge - cut],
    [edge - cut, edge],
    [cut, edge],
    [0, edge - cut],
    [0, cut],
  ]
    .map((point) => point.map((value) => value.toFixed(2)).join(","))
    .join(" ");
}

async function clippedMark(size) {
  const raster = await sharp(markPath)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><polygon points="${octagon(size)}" fill="#fff"/></svg>`,
  );
  return sharp(raster).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  const parts = [header];
  images.forEach((image, index) => {
    const at = 6 + index * 16;
    header.writeUInt8(image.size >= 256 ? 0 : image.size, at);
    header.writeUInt8(image.size >= 256 ? 0 : image.size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(image.png.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += image.png.length;
    parts.push(image.png);
  });
  return Buffer.concat(parts);
}

const mark1000 = await clippedMark(1000);
await sharp({
  create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: mark1000, left: 100, top: 100 }])
  .png()
  .toFile("public/logo.png");

const onWhite = await sharp({
  create: { width: 1200, height: 1200, channels: 3, background: { r: 255, g: 255, b: 255 } },
})
  .composite([{ input: mark1000, left: 100, top: 100 }])
  .raw()
  .toBuffer();
const edge = (1200 * 102 + 600) * 3;
console.log("mark edge on white", [onWhite[edge], onWhite[edge + 1], onWhite[edge + 2]]);

for (const size of [16, 32, 48, 96, 192, 512]) {
  const png = await clippedMark(size);
  if (size === 96) await sharp(png).toFile("public/favicon-96.png");
  if (size === 192) await sharp(png).toFile("public/icon-192.png");
  if (size === 512) await sharp(png).toFile("public/icon-512.png");
}

const icoImages = [];
for (const size of [16, 32, 48]) {
  icoImages.push({ size, png: await clippedMark(size) });
}
writeFileSync("public/favicon.ico", ico(icoImages));

const mark140 = await clippedMark(140);
await sharp({
  create: { width: 180, height: 180, channels: 3, background: { r: 255, g: 255, b: 255 } },
})
  .composite([{ input: mark140, left: 20, top: 20 }])
  .png()
  .toFile("public/apple-touch-icon.png");

await sharp(await clippedMark(256)).webp({ quality: 82 }).toFile("src/assets/brand/mark-256.webp");

const icon32 = (await clippedMark(64)).toString("base64");
const favicon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs><clipPath id="ring"><polygon points="${octagon(32)}"/></clipPath></defs>
  <image href="data:image/png;base64,${icon32}" width="32" height="32" clip-path="url(#ring)" preserveAspectRatio="xMidYMid slice"/>
</svg>
`;
writeFileSync("public/favicon.svg", favicon);

writeFileSync(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "NeoLeverage",
      short_name: "NeoLeverage",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: "#080808",
      background_color: "#ffffff",
      display: "standalone",
    },
    null,
    2,
  ),
);

const wordmark = await sharp(readFileSync("src/assets/brand/wordmark.svg")).resize({ width: 720 }).png().toBuffer();
const wordmarkMeta = await sharp(wordmark).metadata();
const lockupHeight = wordmarkMeta.height || 112;
const lockupMark = await clippedMark(Math.round((20.643 / 200) * 720));
await sharp(wordmark)
  .composite([
    {
      input: lockupMark,
      left: Math.round((41.427 / 200) * 720),
      top: Math.round((4.842 / 31) * lockupHeight),
    },
  ])
  .png()
  .toFile("src/assets/brand/wordmark-lockup.png");
console.log("brand assets written", { lockupHeight });
