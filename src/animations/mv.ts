import BODY from "./mv-water.glsl?raw";

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

function software(gl: GL): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || "") : "";
  return /swiftshader|llvmpipe|softpipe|software/i.test(name);
}

export async function bootMv(root: HTMLElement): Promise<void> {
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  const query = new URLSearchParams(location.search);
  const asked = query.get("tier");
  const forced = asked === "0" || asked === "1" || asked === "2" || asked === "3";
  const stored = document.documentElement.dataset.tier;
  let tier: Tier = forced ? asked : stored === "0" || stored === "1" || stored === "2" || stored === "3" ? stored : "3";
  const boat = root.querySelector<HTMLElement>("[data-boat]");
  const fleet = root.querySelector<HTMLElement>("[data-fleet]");
  const copy = root.querySelector<HTMLElement>("[data-copy]");
  const gulls = [...root.querySelectorAll<HTMLElement>(".gull")];
  const wake = root.querySelector<SVGSVGElement>("[data-wake]");
  const bow = root.querySelector<SVGElement>("[data-bow]");
  const drops = [...root.querySelectorAll<SVGCircleElement>("[data-drop]")];
  const divider = root.querySelector<HTMLElement>("[data-divider]");
  const lines = [...root.querySelectorAll<HTMLElement>(".wind-trail")];
  const sp = () => window.matchMedia("(max-width: 800px)").matches;

  const placeScene = () => {
    if (!copy) return;
    const host = root.getBoundingClientRect();
    const box = copy.getBoundingClientRect();
    const narrow = host.width <= 800;
    const pad = 48;
    const forbid = {
      l: box.left - host.left - pad,
      t: box.top - host.top - pad,
      r: box.right - host.left + pad,
      b: box.bottom - host.top + pad,
    };
    const hits = (x: number, y: number, w: number, h: number) =>
      x < forbid.r && x + w > forbid.l && y < forbid.b && y + h > forbid.t;
    const minTop = 76 + 48;
    const bandTop = Math.max(minTop, host.height * 0.18);
    const bandBot = Math.max(bandTop + 24, Math.min(host.height * 0.38, host.height - 24));
    const boatBox = boat?.getBoundingClientRect();
    const hitsBoat = (x: number, y: number, w: number, h: number) => {
      if (!boatBox) return false;
      const bl = boatBox.left - host.left;
      const bt = boatBox.top - host.top;
      return x < bl + boatBox.width && x + w > bl && y < bt + boatBox.height * 0.72 && y + h > bt;
    };
    gulls.forEach((gull, index) => {
      if (getComputedStyle(gull).display === "none") return;
      const w = gull.getBoundingClientRect().width || (narrow ? 18 : 24);
      const h = 14;
      const slot = narrow ? [0.78, 0.9] : [0.48, 0.62, 0.78];
      let x = host.width * (slot[index] ?? 0.8);
      let y = bandTop + (bandBot - bandTop) * (index === 0 ? 0.08 : index === 1 ? 0.42 : 0.22);
      if (hits(x, y, w, h) || hitsBoat(x, y, w, h)) {
        x = Math.min(host.width - w - 8, Math.max(forbid.r + 12, x));
        y = bandTop + index * 10;
      }
      if (y < minTop) y = minTop;
      if (hits(x, y, w, h) || hitsBoat(x, y, w, h) || x < 4 || x + w > host.width - 4 || y + h > bandBot) {
        gull.style.visibility = "hidden";
        return;
      }
      gull.style.visibility = "visible";
      gull.style.left = `${x}px`;
      gull.style.right = "auto";
      gull.style.top = `${y}px`;
      gull.style.bottom = "auto";
    });
  };

  const placeWake = (scale: number) => {
    const svg = boat?.querySelector("svg");
    if (!wake || !svg) return;
    const pt = svg.createSVGPoint();
    pt.x = 46;
    pt.y = 428;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm);
    const host = root.getBoundingClientRect();
    wake.style.left = `${p.x - host.left}px`;
    wake.style.top = `${p.y - host.top}px`;
    wake.style.transform = `translate(-100%, -50%) scaleX(${scale})`;
  };

  if (tier === "0") {
    root.querySelectorAll<SVGPathElement>("[data-full]").forEach((path) => {
      if (path.dataset.full) path.setAttribute("d", path.dataset.full);
    });
    boat?.classList.add("is-full");
    divider?.classList.add("is-drawn");
    root.classList.add("is-settled");
    if (bow) bow.style.opacity = "1";
    drops.forEach((drop) => {
      drop.style.opacity = "0";
    });
    const show = () => {
      placeWake(1);
      placeScene();
    };
    show();
    requestAnimationFrame(show);
    document.fonts?.ready.then(show).catch(() => undefined);
    window.addEventListener("resize", show);
    return;
  }

  const motion = { wind: 0, front: 0, sail: 0, surge: 0, scroll: 0, nudge: 0 };
  const clock = { intro: 0, flow: 0, vel: 0, last: performance.now(), hidden: false, away: false, pointer: 0 };
  let raf = 0;
  let frame = (_now: number) => {};
  const live = () => !clock.hidden && !clock.away;
  let timeline: { seek: (time: number) => void } | null = null;

  const pose = () => {
    if (!boat) return;
    const span = clock.intro < 3 ? 0 : Math.min(1, (clock.intro - 3) / 2);
    const heelU = clock.intro >= 5 ? 1 : span <= 0 ? 0 : lever(span);
    const slide = span * span * (3 - 2 * span);
    const back = (1 - slide) * 3;
    boat.style.transform = `translate3d(calc(-50% - ${back}vw), 0px, 0) rotate(${heelU * 8}deg)`;
    placeWake(slide);
    if (bow) bow.style.opacity = String(span <= 0 ? 0 : Math.min(1, span / 0.4));
    const gullU = Math.min(1, clock.intro / 5);
    gulls.forEach((gull, index) => {
      const dist = 4 + (index % 3) * 1.5;
      gull.style.transform = `translate3d(${(gullU - 1) * dist}vw, 0, 0)`;
    });
    drops.forEach((drop) => {
      const baseX = Number(drop.dataset.x);
      const baseY = Number(drop.dataset.y);
      const rise = Number(drop.dataset.rise);
      const delay = Number(drop.dataset.delay);
      const t = (clock.intro - 3 - delay) / 0.6;
      if (clock.intro < 3 || clock.intro >= 5 || t <= 0 || t >= 1) {
        drop.style.opacity = "0";
        drop.setAttribute("cx", String(baseX));
        drop.setAttribute("cy", String(baseY));
        return;
      }
      const spread = (baseX - 322) * 0.35;
      drop.setAttribute("cx", String(baseX + spread * t));
      drop.setAttribute("cy", String(baseY - rise * t));
      drop.style.opacity = String(0.9 * (1 - t));
    });
    const shift = -Math.min(motion.scroll, 0.75) * 6;
    if (fleet) fleet.style.transform = shift ? `translateX(${shift}vw)` : "";
    if (clock.intro >= 5) root.classList.add("is-settled");
    placeScene();
  };

  const kick = () => {
    if (!raf && live()) raf = requestAnimationFrame(frame);
  };
  const setRun = () => {
    kick();
  };

  void import("gsap/MorphSVGPlugin").then(({ MorphSVGPlugin }) => {
    gsap.registerPlugin(MorphSVGPlugin);
    const tl = gsap.timeline({ paused: true });
    root.querySelectorAll<SVGPathElement>("[data-full]").forEach((path) => {
      const half = path.dataset.half;
      const full = path.dataset.full;
      if (half) tl.to(path, { morphSVG: half, duration: 0.9, ease: "power1.inOut" }, 1.2);
      if (full) tl.to(path, { morphSVG: full, duration: 0.9, ease: lever }, 2.1);
    });
    tl.to(motion, { sail: 1, front: 1, wind: 1, duration: 1.8, ease: "power1.inOut" }, 1.2);
    lines.forEach((line, index) => {
      const opacity = line.classList.contains("is-hot") ? 0.7 : 0.85;
      tl.fromTo(
        line,
        { x: "-72vw", autoAlpha: 0 },
        { x: "0vw", autoAlpha: opacity, duration: 0.9, ease: "power2.out", immediateRender: false },
        3 + index * 0.4,
      );
    });
    tl.fromTo(
      ".mv-ja",
      { y: 12, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out" },
      0,
    );
    timeline = tl;
    setRun();
  });

  ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom top",
    scrub: true,
    onUpdate: (self) => {
      motion.scroll = self.progress;
      root.classList.toggle("is-scrolled", self.progress > 0.01);
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
      const cap = tier === "3" ? 2 : tier === "2" ? 1.5 : 1;
      const dpr = Math.min(window.devicePixelRatio || 1, cap);
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const paint = () => {
      const narrow = sp();
      const fov = ((narrow ? 50 : 36) * Math.PI) / 180;
      const horizon = narrow ? 0.6 : 0.56;
      const ndc = 1 - horizon * 2;
      const look = Math.atan(-ndc * Math.tan(fov / 2));
      const p = motion.scroll;
      const drop = p < 0.75 ? 0 : ((p - 0.75) / 0.25) * (look - (-5 * Math.PI) / 180);
      const sunLift = p < 0.4 ? 0 : p > 0.75 ? 3 : ((p - 0.4) / 0.35) * 3;
      const windBase = motion.wind * (p < 0.4 ? 1 + (p / 0.4) * 0.4 : p > 0 ? 1.4 : 1);
      const wind = Math.min(1.5, windBase + motion.nudge);
      const converge = p < 0.75 ? 0 : (p - 0.75) / 0.25;
      const fade = p < 0.92 ? 0 : (p - 0.92) / 0.08;
      const host = root.getBoundingClientRect();
      const box = boat?.getBoundingClientRect();
      const ship = box
        ? [(box.left + box.width * 0.5 - host.left) / host.width, (box.top - host.top) / host.height, box.width / host.width, box.height / host.height]
        : [narrow ? 0.58 : 0.64, narrow ? 0.43 : 0.26, narrow ? 0.42 : 0.24, narrow ? 0.36 : 0.43];
      const head = copy?.getBoundingClientRect();
      const rect = head
        ? [(head.left - host.left) / host.width, (head.top - host.top) / host.height, head.width / host.width, head.height / host.height]
        : [0.04, 0.12, 0.48, 0.34];
      gl.uniform2f(u("uRes"), canvas.width, canvas.height);
      gl.uniform1f(u("uTime"), clock.flow);
      gl.uniform1f(u("uWind"), wind);
      gl.uniform1f(u("uWindFront"), motion.front);
      gl.uniform1f(u("uPitch"), look - drop);
      gl.uniform1f(u("uFov"), fov);
      gl.uniform1f(u("uSunEl"), ((14 + sunLift) * Math.PI) / 180);
      gl.uniform4f(u("uShip"), ship[0] ?? 0.64, ship[1] ?? 0.26, ship[2] ?? 0.24, ship[3] ?? 0.43);
      gl.uniform1f(u("uSail"), motion.sail);
      gl.uniform1f(u("uWake"), motion.sail * (0.55 + motion.surge * 0.45));
      gl.uniform1f(u("uConverge"), converge);
      gl.uniform1f(u("uGlitter"), glitter);
      gl.uniform1f(u("uOct"), tier === "3" ? 5 : 3);
      gl.uniform1f(u("uHi"), hi);
      gl.uniform1f(u("uFade"), fade);
      gl.uniform1f(u("uExposure"), 0.4 + sunLift * 0.08);
      gl.uniform1f(u("uCaustic"), tier === "3" ? 1 : 0.5);
      gl.uniform4f(u("uHead"), rect[0] ?? 0, rect[1] ?? 0, rect[2] ?? 0, rect[3] ?? 0);
      gl.uniform1f(u("uSunX"), 0.86);
      gl.uniform1f(u("uHorizon"), horizon);
      gl.uniform1f(u("uScroll"), p);
      gl.uniform1f(u("uCloud"), Math.min(clock.intro, 120) * (0.06 / 120) + p * 0.06);
      gl.uniform1f(u("uSunR"), 420 * (canvas.height / Math.max(host.height, 1)));
      gl.uniform3f(u("uTap"), 0, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (divider) divider.style.transform = `scaleX(${Math.min(1, converge)})`;
      canvas.style.opacity = String(1 - fade);
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
      if (clock.intro > 0.5) samples.push(span);
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
    if (tier === "0" || event.pointerType !== "mouse") return;
    clock.pointer = performance.now();
    const rect = root.getBoundingClientRect();
    motion.nudge = ((event.clientX - rect.left) / rect.width - 0.5) * 0.16;
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
    const dtRaw = (now - clock.last) / 1000;
    const dt = Math.min(0.05, dtRaw);
    clock.last = now;
    if (live()) {
      if (clock.intro < 5) clock.intro = Math.min(5, clock.intro + Math.min(0.25, dtRaw));
      timeline?.seek(clock.intro);
      const since = clock.pointer ? (now - clock.pointer) / 1000 : 99;
      const interacting = since < 1.2 || motion.scroll > 0.001;
      if (clock.intro < 5 || interacting) clock.vel = Math.min(1, clock.vel + dt / 0.2);
      else clock.vel = Math.max(0, clock.vel - dt / 1.2);
      const rate = clock.intro < 5 ? 0.25 + motion.surge * 1.1 : clock.vel;
      clock.flow += dt * rate * (1 + Math.min(motion.scroll, 0.4) * 0.6);
      if (since > 0.05) motion.nudge += (0 - motion.nudge) * Math.min(1, dt / 1.2);
    }
    pose();
    if (draw && live() && !dropped) {
      draw();
      grade?.(now);
    }
    kick();
  };
  kick();

  placeScene();
  document.fonts?.ready.then(placeScene).catch(() => undefined);
  window.addEventListener("resize", placeScene);
  if (tier === "1") root.classList.add("is-still");
  else {
    const arm = () => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => bootGl(), { timeout: 1800 });
      else window.setTimeout(bootGl, 320);
    };
    requestAnimationFrame(() => requestAnimationFrame(arm));
  }
}
