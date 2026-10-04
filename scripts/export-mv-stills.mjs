import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";

const glsl = readFileSync("src/animations/mv-water.glsl", "utf8");
const lockup = readFileSync("src/assets/brand/wordmark-lockup.png");
mkdirSync("public/mv", { recursive: true });
mkdirSync("/tmp/mv-export", { recursive: true });

const html = `<!doctype html>
<meta charset="utf-8" />
<canvas id="c"></canvas>
<script>
const BODY = ${JSON.stringify(glsl)};
const leverPitch = (fov, horizon) => {
  const ndc = 1 - horizon * 2;
  return Math.atan(-ndc * Math.tan(fov / 2));
};
async function boot() {
  const canvas = document.getElementById("c");
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true })
    || canvas.getContext("webgl", { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error("no webgl");
  const webgl2 = gl instanceof WebGL2RenderingContext;
  const source = webgl2
    ? "#version 300 es\\nprecision highp float;\\nout vec4 fragColor;\\n" + BODY
    : "#version 100\\n#extension GL_OES_standard_derivatives : enable\\nprecision highp float;\\n#define fragColor gl_FragColor\\n" + BODY;
  const vert = webgl2
    ? "#version 300 es\\nin vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}"
    : "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}";
  const program = gl.createProgram();
  const compile = (type, text) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "compile");
    gl.attachShader(program, shader);
  };
  compile(gl.VERTEX_SHADER, vert);
  compile(gl.FRAGMENT_SHADER, source);
  if (!webgl2) gl.bindAttribLocation(program, 0, "aPos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(program, name);
  const face = new FontFace("OutfitLocal", "url(/Outfit.ttf)");
  await face.load();
  document.fonts.add(face);
  const mark = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("lockup"));
    image.src = "/lockup.png";
  });
  const draw = (w, h, narrow) => {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    const fov = ((narrow ? 50 : 36) * Math.PI) / 180;
    const horizon = narrow ? 0.6 : 0.56;
    const pitch = leverPitch(fov, horizon);
    const ship = narrow
      ? [0.58, 0.43, 0.42, 0.42 * (w / h) * (460 / 340)]
      : [0.64, 0.26, 0.43 * (h / w) * (340 / 460), 0.43];
    gl.uniform2f(u("uRes"), w, h);
    gl.uniform1f(u("uTime"), 5);
    gl.uniform1f(u("uWind"), 1);
    gl.uniform1f(u("uWindFront"), 1);
    gl.uniform1f(u("uPitch"), pitch);
    gl.uniform1f(u("uFov"), fov);
    gl.uniform1f(u("uSunEl"), (14 * Math.PI) / 180);
    gl.uniform4f(u("uShip"), ship[0], ship[1], ship[2], ship[3]);
    gl.uniform1f(u("uSail"), 1);
    gl.uniform1f(u("uWake"), 0.85);
    gl.uniform1f(u("uConverge"), 0);
    gl.uniform1f(u("uGlitter"), 1);
    gl.uniform1f(u("uOct"), 5);
    gl.uniform1f(u("uHi"), 1);
    gl.uniform1f(u("uFade"), 0);
    gl.uniform1f(u("uExposure"), 0.4);
    gl.uniform1f(u("uCaustic"), 1);
    gl.uniform4f(u("uHead"), narrow ? 0.05 : 0.044, narrow ? 0.13 : 0.12, narrow ? 0.9 : 0.48, narrow ? 0.28 : 0.4);
    gl.uniform1f(u("uSunX"), 0.86);
    gl.uniform1f(u("uHorizon"), horizon);
    gl.uniform1f(u("uScroll"), 0);
    gl.uniform1f(u("uCloud"), 5 * (0.06 / 120));
    gl.uniform1f(u("uSunR"), 420 * (h / (narrow ? 1920 : 900)));
    gl.uniform3f(u("uTap"), 0, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const save = async (name) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const response = await fetch("/save/" + name, { method: "POST", body: blob });
    if (!response.ok) throw new Error("save " + name);
  };
  draw(2560, 1440, false);
  await save("pc");
  draw(1080, 1920, true);
  await save("sp");
  draw(1200, 630, false);
  const flat = document.createElement("canvas");
  flat.width = 1200;
  flat.height = 630;
  const ctx = flat.getContext("2d");
  ctx.drawImage(canvas, 0, 0);
  ctx.drawImage(mark, 64, 40, 360, 360 * (mark.height / mark.width));
  ctx.fillStyle = "#080808";
  ctx.textBaseline = "alphabetic";
  ctx.font = "500 72px OutfitLocal";
  ctx.fillText("Tailwinds", 64, 188);
  ctx.font = "300 72px OutfitLocal";
  const lead = "For Your";
  ctx.fillText(lead, 64, 268);
  const width = ctx.measureText(lead).width;
  ctx.font = "500 72px OutfitLocal";
  ctx.fillText("Growth", 72 + width, 268);
  const card = await new Promise((resolve) => flat.toBlob(resolve, "image/png"));
  const posted = await fetch("/save/og", { method: "POST", body: card });
  if (!posted.ok) throw new Error("save og");
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
}
boot().then((renderer) => { document.title = "ok:" + renderer; }).catch((error) => { document.title = "err:" + error.message; });
</script>`;

const files = new Map();
const server = createServer(async (request, response) => {
  const url = request.url || "/";
  if (url.startsWith("/save/")) {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    files.set(url.slice(6), Buffer.concat(chunks));
    response.end("ok");
    return;
  }
  if (url === "/Outfit.ttf") {
    response.setHeader("content-type", "font/ttf");
    response.end(readFileSync("/tmp/mv-export/Outfit.ttf"));
    return;
  }
  if (url === "/lockup.png") {
    response.setHeader("content-type", "image/png");
    response.end(lockup);
    return;
  }
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(html);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const profile = mkdtempSync(`${tmpdir()}/mv-chrome-`);
const chrome = spawn(
  "/usr/local/bin/google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    `--window-size=1280,800`,
    `http://127.0.0.1:${port}/`,
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let log = "";
chrome.stderr.on("data", (chunk) => {
  log += chunk.toString();
});

const deadline = Date.now() + 45000;
while (files.size < 3 && Date.now() < deadline) {
  if (chrome.exitCode !== null) break;
  await delay(200);
}
chrome.kill("SIGKILL");
server.close();
await delay(300);
try {
  rmSync(profile, { recursive: true, force: true });
} catch (error) {
  console.warn(String(error));
}
writeFileSync("/tmp/mv-export/chrome.log", log);

if (files.size < 3) {
  console.error(log.slice(-2000));
  throw new Error(`stills missing (${files.size})`);
}

function relLuma(r, g, b) {
  const lin = (value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrast(r, g, b) {
  const lighter = Math.max(relLuma(14, 26, 36), relLuma(r, g, b));
  const darker = Math.min(relLuma(14, 26, 36), relLuma(r, g, b));
  return (lighter + 0.05) / (darker + 0.05);
}

const pcRaw = await sharp(files.get("pc")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let brightest = 0;
let sample = [0, 0, 0];
const width = pcRaw.info.width;
for (let y = Math.floor(1440 * 0.18); y < 1440 * 0.46; y += 8) {
  for (let x = 40; x < width * 0.42; x += 12) {
    const index = (y * width + x) * 4;
    const rgb = [pcRaw.data[index], pcRaw.data[index + 1], pcRaw.data[index + 2]];
    const luma = relLuma(rgb[0], rgb[1], rgb[2]);
    if (luma > brightest) {
      brightest = luma;
      sample = rgb;
    }
  }
}
const paper = contrast(255, 244, 214);
console.log("heading contrast vs sampled sky", contrast(sample[0], sample[1], sample[2]).toFixed(2), "sample", sample);
console.log("heading contrast vs #FFF4D6", paper.toFixed(2));

async function avif(input, dest, maxBytes, targetWidth) {
  let quality = 55;
  let buffer = await sharp(input).resize({ width: targetWidth }).avif({ quality, effort: 6 }).toBuffer();
  while (buffer.length > maxBytes && quality > 18) {
    quality -= 5;
    buffer = await sharp(input).resize({ width: targetWidth }).avif({ quality, effort: 6 }).toBuffer();
  }
  writeFileSync(dest, buffer);
  return { bytes: buffer.length, quality };
}

const pc2560 = await avif(files.get("pc"), "public/mv/pc-2560.avif", 140 * 1024, 2560);
const pc1920 = await avif(files.get("pc"), "public/mv/pc-1920.avif", 110 * 1024, 1920);
const pc1280 = await avif(files.get("pc"), "public/mv/pc-1280.avif", 80 * 1024, 1280);
const sp1080 = await avif(files.get("sp"), "public/mv/sp-1080.avif", 90 * 1024, 1080);
await sharp(files.get("pc")).resize({ width: 2560 }).webp({ quality: 68 }).toFile("public/mv/pc-2560.webp");
await sharp(files.get("pc")).resize({ width: 1920 }).webp({ quality: 68 }).toFile("public/mv/pc-1920.webp");
await sharp(files.get("pc")).resize({ width: 1280 }).webp({ quality: 68 }).toFile("public/mv/pc-1280.webp");
await sharp(files.get("sp")).resize({ width: 1080 }).webp({ quality: 68 }).toFile("public/mv/sp-1080.webp");
await sharp(files.get("og")).png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 }).toFile("public/og-default.png");
writeFileSync("/tmp/mv-export/pc.png", files.get("pc"));
writeFileSync("/tmp/mv-export/sp.png", files.get("sp"));
writeFileSync("/tmp/mv-export/og.png", files.get("og"));
console.log({ pc2560, pc1920, pc1280, sp1080, og: files.get("og").length });
