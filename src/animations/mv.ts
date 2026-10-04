import gsap from "gsap";

const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uWind;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  float horizon = 0.42;
  float wind = clamp(uWind, 0.0, 1.35);
  vec3 zenith = mix(vec3(0.62, 0.76, 0.90), vec3(0.98, 0.78, 0.48), wind * 0.45);
  vec3 haze = mix(vec3(0.99, 0.93, 0.84), vec3(1.0, 0.62, 0.34), wind * 0.62);
  vec2 sun = vec2(0.74, horizon + 0.08);
  if (uv.y >= horizon) {
    float t = smoothstep(horizon, 1.0, uv.y);
    vec3 sky = mix(haze, zenith, pow(t, 0.8));
    float glow = exp(-distance(uv, sun) * 16.0);
    sky += vec3(1.0, 0.82, 0.48) * glow * (0.45 + wind * 0.35);
    vec2 q = (uv - sun) * vec2(uRes.x / uRes.y, 1.0);
    vec2 a = abs(q);
    float oct = max(max(a.x, a.y), (a.x + a.y) * 0.72);
    sky += vec3(1.0, 0.72, 0.38) * exp(-oct * 46.0) * 0.07;
    gl_FragColor = vec4(sky, 1.0);
    return;
  }
  float depth = (horizon - uv.y) / horizon;
  float amp = mix(0.0015, 0.012, wind);
  float ripple = sin(uv.x * mix(16.0, 42.0, wind) + uTime * 0.65) * amp;
  ripple += sin(uv.x * 11.0 - uTime * 0.32) * amp * 0.65;
  float sy = clamp(horizon + (horizon - uv.y) + ripple, horizon, 1.0);
  float st = smoothstep(horizon, 1.0, sy);
  vec3 reflected = mix(haze, zenith, pow(st, 0.85));
  reflected += vec3(1.0, 0.75, 0.42) * exp(-distance(vec2(uv.x + ripple * 3.0, sy), sun) * 12.0) * 0.55;
  vec3 deep = mix(vec3(0.16, 0.38, 0.52), vec3(0.05, 0.16, 0.28), depth);
  vec3 water = mix(deep, reflected, mix(0.62, 0.28, depth));
  float path = exp(-abs(uv.x - sun.x) * mix(22.0, 9.0, wind)) * exp(-depth * 1.35);
  water += vec3(1.0, 0.86, 0.62) * path * (0.18 + wind * 0.28);
  float spark = noise(vec2(uv.x * 70.0 + uTime * wind, uv.y * 40.0));
  water += vec3(0.9, 0.95, 1.0) * smoothstep(0.86, 1.0, spark) * wind * 0.12 * (1.0 - depth);
  gl_FragColor = vec4(water, 1.0);
}`;

type Tier = "high" | "medium" | "low" | "reduced";

function tierOf(): Tier {
  const value = document.documentElement.dataset.motion;
  if (value === "medium" || value === "low" || value === "reduced") return value;
  return "high";
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function bootMv(root: HTMLElement): void {
  const tier = tierOf();
  const pause = root.querySelector<HTMLButtonElement>("[data-pause]");
  const boat = root.querySelector<SVGGElement>("[data-boat]");
  const mainSail = root.querySelector<SVGGElement>(".sail-main");
  const jib = root.querySelector<SVGGElement>(".sail-jib");
  const lines = [...root.querySelectorAll<SVGPathElement>(".wind-line")];
  if (tier === "reduced") return;

  root.classList.add("is-live");

  const state = { wind: 0, sail: 0, x: 0, running: true, frames: 0, started: performance.now(), dropped: false };
  const sail = () => {
    const scale = 0.42 + state.sail * 0.58;
    if (mainSail) mainSail.style.transform = `scaleX(${scale})`;
    if (jib) jib.style.transform = `scaleX(${0.5 + state.sail * 0.5})`;
    if (boat) boat.style.transform = `translateX(${state.x}px)`;
  };
  sail();

  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
  tl.to(state, { wind: 0.35, duration: tier === "low" ? 0.8 : 1.1, onUpdate: sail }, 0.4);
  tl.to(state, { wind: 1, sail: 1, duration: tier === "low" ? 1.6 : 2.4, ease: "back.out(1.4)", onUpdate: sail }, 1.2);
  if (tier !== "low") tl.to(state, { x: 36, duration: 2.2, onUpdate: sail }, 2.2);

  const activeLines = tier === "low" ? lines.slice(0, 2) : lines;
  activeLines.forEach((line, index) => {
    line.style.animation = "none";
    gsap.fromTo(
      line,
      { x: -120 - index * 40 },
      { x: tier === "low" ? 480 : 720, duration: (tier === "low" ? 8 : 6) + index, repeat: -1, ease: "none", delay: 0.8 + index * 0.35 },
    );
  });
  if (tier !== "low") gsap.to(state, { wind: 0.82, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 5 });

  let userPaused = false;
  let offscreen = false;
  const applyRun = () => {
    const halted = userPaused || offscreen || document.hidden || state.dropped;
    state.running = !halted;
    tl.paused(halted);
    if (pause) {
      pause.setAttribute("aria-pressed", String(userPaused));
      pause.textContent = userPaused ? (pause.dataset.playLabel ?? "") : (pause.dataset.pauseLabel ?? "");
    }
  };

  pause?.addEventListener("click", () => {
    userPaused = !userPaused;
    applyRun();
  });

  const observer = new IntersectionObserver(([entry]) => {
    offscreen = !entry?.isIntersecting;
    applyRun();
  });
  observer.observe(root);
  document.addEventListener("visibilitychange", applyRun);

  if (tier === "low") return;

  const canvas = root.querySelector<HTMLCanvasElement>(".mv-gl");
  const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: tier === "high" ? "default" : "low-power" });
  if (!canvas || !gl) return;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uWind = gl.getUniformLocation(program, "uWind");

  const cap = tier === "high" ? (window.innerWidth < 800 ? 1.15 : 1.5) : 1;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, cap) * (tier === "medium" ? 0.8 : 1);
    canvas.width = Math.max(2, Math.floor(rect.width * dpr));
    canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize);

  const draw = (now: number) => {
    if (!state.running) return;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, now * 0.001);
    gl.uniform1f(uWind, state.wind);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    state.frames += 1;
    if (!state.dropped && now - state.started > 2000 && state.frames / 2 < 40) {
      state.dropped = true;
      root.classList.remove("is-gl");
      state.running = false;
      return;
    }
    requestAnimationFrame(draw);
  };

  root.classList.add("is-gl");
  requestAnimationFrame(draw);

  const onPointer = (event: PointerEvent) => {
    if (tier !== "high" || event.pointerType === "touch") return;
    const rect = root.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    state.wind = Math.min(1.25, state.wind * 0.92 + (0.55 + ratio * 0.55) * 0.08);
  };
  root.addEventListener("pointermove", onPointer);

  root.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || tier === "low") return;
    const extra = document.createElementNS("http://www.w3.org/2000/svg", "path");
    extra.setAttribute("d", "M0 520 H 180");
    extra.setAttribute("stroke", "#FE7F38");
    extra.setAttribute("stroke-width", "1.2");
    extra.setAttribute("fill", "none");
    root.querySelector(".winds")?.appendChild(extra);
    const rect = root.getBoundingClientRect();
    gsap.fromTo(extra, { x: event.clientX - rect.left - 40, y: event.clientY - rect.top - 520 }, { x: "+=280", duration: 1.4, ease: "power2.out", onComplete: () => extra.remove() });
  });

  const resumeDraw = () => {
    if (state.running) requestAnimationFrame(draw);
  };
  pause?.addEventListener("click", resumeDraw);
  document.addEventListener("visibilitychange", resumeDraw);
  observer.unobserve(root);
  const glObserver = new IntersectionObserver(([entry]) => {
    offscreen = !entry?.isIntersecting;
    applyRun();
    resumeDraw();
  });
  glObserver.observe(root);

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    root.classList.remove("is-gl");
    state.running = false;
  });
}
