import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BODY from "./mv-water.glsl?raw";

gsap.registerPlugin(ScrollTrigger);

type Tier = "0" | "1" | "2" | "3";
type GL = WebGL2RenderingContext | WebGLRenderingContext;

const lever = (() => {
  const x1 = 0.34;
  const y1 = 1.3;
  const x2 = 0.64;
  const y2 = 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (amount: number) => {
    let t = amount;
    for (let i = 0; i < 5; i += 1) t -= (sx(t) - amount) / (dx(t) || 1e-4);
    return sy(t);
  };
})();

function frag(webgl2: boolean): string {
  return webgl2
    ? `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n${BODY}`
    : `#version 100\n#extension GL_OES_standard_derivatives : enable\nprecision highp float;\n#define fragColor gl_FragColor\n${BODY}`;
}

function heave(time: number): { y: number; pitch: number } {
  const k = (Math.PI * 2) / 66;
  const phase = Math.sin(Math.sqrt(9.81 * k) * time);
  return { y: phase * 3, pitch: phase * 1.2 };
}

function software(gl: GL): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "") : "";
  return /swiftshader|llvmpipe|softpipe|software/i.test(name);
}

export function bootMv(root: HTMLElement): void {
  const query = new URLSearchParams(location.search);
  const asked = query.get("tier");
  const forced = asked === "0" || asked === "1" || asked === "2" || asked === "3";
  const stored = document.documentElement.dataset.tier;
  let tier: Tier = forced ? asked : stored === "0" || stored === "1" || stored === "2" || stored === "3" ? stored : "3";
  const oct = query.get("oct") === "1";
  const boat = root.querySelector<HTMLElement>("[data-boat]");
  const mainSail = root.querySelector<SVGPathElement>("[data-sail='main']");
  const jib = root.querySelector<SVGPathElement>("[data-sail='jib']");
  const boom = root.querySelector<SVGGElement>("[data-boom]");
  const pauseBtn = root.querySelector<HTMLButtonElement>("[data-pause]");
  const divider = root.querySelector<HTMLElement>("[data-divider]");
  const lines = [...root.querySelectorAll<HTMLElement>(".wind-line")];
  const sp = () => window.matchMedia("(max-width: 800px)").matches;

  if (tier === "0") {
    if (mainSail?.dataset.full) mainSail.setAttribute("d", mainSail.dataset.full);
    if (jib?.dataset.full) jib.setAttribute("d", jib.dataset.full);
    divider?.classList.add("is-drawn");
    pauseBtn?.addEventListener("click", () => {
      const pressed = pauseBtn.getAttribute("aria-pressed") === "true";
      pauseBtn.setAttribute("aria-pressed", String(!pressed));
      pauseBtn.textContent = !pressed ? pauseBtn.dataset.playLabel || "" : pauseBtn.dataset.pauseLabel || "";
    });
    return;
  }

  const motion = { wind: 0, front: 0, sail: 0, surge: 0, scroll: 0, nudge: 0 };
  const clock = { t: 0, last: performance.now(), paused: false, hidden: false, away: false };
  let raf = 0;
  let frame = (_now: number) => {};
  const live = () => !clock.paused && !clock.hidden && !clock.away;
  const tap = [0.2, 0.62, 0];
  const tweens: gsap.core.Animation[] = [];

  const pose = () => {
    if (!boat) return;
    const wide = sp() ? 0.64 : 0.68;
    const far = sp() ? 0.8 : 0.86;
    const span = motion.scroll < 0.25 ? 0 : motion.scroll > 0.6 ? 1 : (motion.scroll - 0.25) / 0.35;
    const wave = heave(clock.t);
    const heel = (motion.sail * 6 + span * 2 + wave.pitch) * (Math.PI / 180);
    boat.style.left = `${(wide + (far - wide) * span) * 100}%`;
    boat.style.transform = `translate3d(calc(-50% + ${motion.surge}px), ${wave.y}px, 0) rotate(${heel}rad)`;
  };

  const kick = () => {
    if (!raf && live()) raf = requestAnimationFrame(frame);
  };
  const setRun = () => {
    tweens.forEach((tween) => tween.paused(!live()));
    if (pauseBtn) {
      pauseBtn.setAttribute("aria-pressed", String(clock.paused));
      pauseBtn.textContent = clock.paused ? pauseBtn.dataset.playLabel || "" : pauseBtn.dataset.pauseLabel || "";
    }
    kick();
  };

  void import("gsap/MorphSVGPlugin").then(({ MorphSVGPlugin }) => {
    gsap.registerPlugin(MorphSVGPlugin);
    const morph = (path: SVGPathElement | null, key: "half" | "full", delay: number) => {
      const target = path?.dataset[key];
      if (!path || !target) return;
      tweens.push(gsap.to(path, { morphSVG: target, duration: 0.7, delay, ease: lever }));
    };
    morph(mainSail, "half", 1.6);
    morph(mainSail, "full", 2.3);
    morph(jib, "half", 1.6);
    morph(jib, "full", 2.3);
    if (boom) tweens.push(gsap.to(boom, { rotation: 6, svgOrigin: "168 360", duration: 1.4, delay: 1.9, ease: lever }));
    const leech = root.querySelector<SVGGElement>("[data-leech]");
    if (leech) tweens.push(gsap.to(leech, { x: 2, duration: 0.227, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    lines.forEach((line, index) => {
      tweens.push(gsap.fromTo(line, { xPercent: -120, opacity: 0 }, { xPercent: 0, opacity: 0.55, duration: 1.5, delay: 0.8 + index * 0.08, ease: "power2.out" }));
    });
    tweens.push(
      gsap.to(motion, { wind: 1, duration: 2.2, delay: 0.8, ease: "power1.inOut" }),
      gsap.to(motion, { front: 1, duration: 1.1, delay: 0.5, ease: "power2.inOut" }),
      gsap.to(motion, { sail: 1, duration: 1.4, delay: 1.6, ease: lever }),
      gsap.to(motion, { surge: 28, duration: 2.4, delay: 3, ease: "power2.inOut" }),
      gsap.to(motion, { surge: 18, duration: 3.6, delay: 5.6, yoyo: true, repeat: -1, ease: "sine.inOut" }),
    );
    gsap.from(".mv-line", { y: "0.12em", duration: 0.9, ease: "expo.out", stagger: 0.08 });
    gsap.from(".mv-later", { y: "0.12em", duration: 0.9, delay: 0.3, ease: "expo.out", stagger: 0.08 });
    setRun();
  });

  ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => {
      motion.scroll = self.progress;
    },
  });

  if (!forced && tier !== "1") {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    if (!gl || software(gl)) tier = "1";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }

  const canvas = root.querySelector<HTMLCanvasElement>(".mv-gl");
  let draw: (() => void) | null = null;
  let grade: ((now: number) => void) | null = null;
  let dropped = false;

  const bootGl = () => {
    if (!canvas || tier === "1") {
      root.classList.add("is-still");
      divider?.classList.add("is-drawn");
      return;
    }
    const gl2 = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: tier === "3" ? "high-performance" : "low-power" });
    const gl = gl2 || canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) {
      root.classList.add("is-still");
      tier = "1";
      return;
    }
    if (!forced && software(gl)) {
      root.classList.add("is-still");
      tier = "1";
      return;
    }
    const webgl2 = gl instanceof WebGL2RenderingContext;
    const program = gl.createProgram();
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader || !program) return false;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn(gl.getShaderInfoLog(shader));
        return false;
      }
      gl.attachShader(program, shader);
      return true;
    };
    const vert = webgl2
      ? `#version 300 es\nin vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}`
      : `attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.,1.);}`;
    if (!program || !compile(gl.VERTEX_SHADER, vert) || !compile(gl.FRAGMENT_SHADER, frag(webgl2))) {
      root.classList.add("is-still");
      return;
    }
    if (!webgl2) gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(program));
      root.classList.add("is-still");
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    let hi = tier === "3" ? 1 : 0;
    let glitter = tier === "3" ? 1 : 0.45;
    const samples: number[] = [];
    let graded = forced;
    let lastFrame = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "3" ? 1.5 : 1) * (tier === "3" ? 1 : 0.75);
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const paint = () => {
      const narrow = sp();
      const fov = ((narrow ? 52 : 38) * Math.PI) / 180;
      const horizon = narrow ? 0.62 : 0.56;
      const ndc = 1 - horizon * 2;
      const look = Math.atan(-ndc * Math.tan(fov / 2));
      const p = motion.scroll;
      const drop = p < 0.6 ? 0 : ((p - 0.6) / 0.4) * ((8 * Math.PI) / 180);
      const sun = ((2 + (p <= 0.25 ? 0 : p >= 0.6 ? 4 : ((p - 0.25) / 0.35) * 4)) * Math.PI) / 180;
      const wind = Math.min(1.35, motion.wind + (p < 0.25 ? (p / 0.25) * 0.35 : 0.35) + motion.nudge);
      const converge = p < 0.6 ? 0 : (p - 0.6) / 0.4;
      const fade = p < 0.85 ? 0 : (p - 0.85) / 0.15;
      const box = boat?.getBoundingClientRect();
      const host = root.getBoundingClientRect();
      const ship = box
        ? [(box.left + box.width * 0.5 - host.left) / host.width, (box.top - host.top) / host.height, box.width / host.width, box.height / host.height]
        : [narrow ? 0.64 : 0.68, narrow ? 0.42 : 0.22, narrow ? 0.36 : 0.2, narrow ? 0.5 : 0.44];
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), clock.t);
      gl.uniform1f(u("uWind"), wind);
      gl.uniform1f(u("uWindFront"), motion.front);
      gl.uniform1f(u("uPitch"), look - drop);
      gl.uniform1f(u("uFov"), fov);
      gl.uniform1f(u("uSunEl"), sun);
      gl.uniform4f(u("uShip"), ship[0] ?? 0.68, ship[1] ?? 0.3, ship[2] ?? 0.2, ship[3] ?? 0.3);
      gl.uniform1f(u("uSail"), motion.sail);
      gl.uniform1f(u("uWake"), motion.sail * (0.4 + Math.min(1, p / 0.6)));
      gl.uniform1f(u("uConverge"), converge);
      gl.uniform1f(u("uGlitter"), glitter);
      gl.uniform1f(u("uOct"), oct ? 1 : 0);
      gl.uniform1f(u("uHi"), hi);
      gl.uniform1f(u("uFade"), fade);
      gl.uniform3f(u("uTap"), tap[0], tap[1], tap[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (divider) divider.style.transform = `scaleX(${Math.min(1, 0.08 + converge)})`;
      canvas.style.opacity = String(1 - fade);
      if (boat) boat.style.opacity = String(1 - Math.max(0, fade - 0.15));
    };

    draw = paint;
    canvas.classList.add("is-on");
    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      dropped = true;
      root.classList.add("is-still");
    });

    grade = (now: number) => {
      if (graded || dropped) return;
      const span = now - lastFrame;
      lastFrame = now;
      if (clock.t > 0.5) samples.push(span);
      if (samples.length < 90) return;
      const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? 16;
      samples.length = 0;
      if (tier === "3" && median > 22) {
        tier = "2";
        hi = 0;
        glitter = 0.45;
        canvas.classList.add("is-cross");
        resize();
        return;
      }
      graded = true;
      if (tier === "2" && median > 28) {
        dropped = true;
        canvas.classList.add("is-cross");
        window.setTimeout(() => {
          root.classList.add("is-still");
          canvas.classList.remove("is-on");
        }, 400);
      }
    };
  };

  root.addEventListener("pointermove", (event) => {
    if (tier !== "3" || event.pointerType === "touch") return;
    const rect = root.getBoundingClientRect();
    motion.nudge = ((event.clientX - rect.left) / rect.width - 0.5) * 0.16;
  });
  root.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      const rect = root.getBoundingClientRect();
      tap[0] = (event.clientX - rect.left) / rect.width;
      tap[1] = (event.clientY - rect.top) / rect.height;
      tap[2] = clock.t;
      const burst = document.createElement("i");
      burst.className = "wind-line wind-burst";
      burst.style.left = `${tap[0] * 100}%`;
      burst.style.top = `${tap[1] * 100}%`;
      root.appendChild(burst);
      gsap.fromTo(burst, { x: 0, opacity: 0.55 }, { x: 120, opacity: 0, duration: 0.9, ease: "power2.out", onComplete: () => burst.remove() });
    },
    { passive: true },
  );

  pauseBtn?.addEventListener("click", () => {
    clock.paused = !clock.paused;
    setRun();
  });
  document.addEventListener("visibilitychange", () => {
    clock.hidden = document.hidden;
    setRun();
  });
  const seen = new IntersectionObserver(([entry]) => {
    clock.away = !entry?.isIntersecting;
    setRun();
  });
  seen.observe(root);

  frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;
    if (live()) clock.t += dt;
    pose();
    if (draw && live() && !dropped) {
      draw();
      grade?.(now);
    }
    kick();
  };
  kick();

  if (tier === "1") root.classList.add("is-still");
  else if ("requestIdleCallback" in window) window.requestIdleCallback(bootGl);
  else window.addEventListener("load", bootGl, { once: true });
}
