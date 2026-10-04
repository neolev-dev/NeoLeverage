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

function heave(time: number): { y: number; pitch: number } {
  const phase = Math.sin(time * 1.7);
  return { y: phase * 4, pitch: phase * 1.5 };
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
  const spray = root.querySelector<HTMLElement>("[data-spray]");
  const gulls = [...root.querySelectorAll<HTMLElement>(".gull")];
  const divider = root.querySelector<HTMLElement>("[data-divider]");
  const lines = [...root.querySelectorAll<HTMLElement>(".wind-line")];
  const sp = () => window.matchMedia("(max-width: 800px)").matches;

  const placeScene = () => {
    if (!copy) return;
    const host = root.getBoundingClientRect();
    const box = copy.getBoundingClientRect();
    const narrow = host.width <= 800;
    if (narrow && boat) {
      boat.style.top = `${box.bottom - host.top + 20}px`;
      boat.style.left = host.width <= 430 ? "60%" : "68%";
      boat.style.width = host.width <= 430 ? "54vw" : "";
    }
    const pad = 48;
    const forbid = {
      l: box.left - host.left - pad,
      t: box.top - host.top - pad,
      r: box.right - host.left + pad,
      b: box.bottom - host.top + pad,
    };
    const hits = (x: number, y: number, w: number, h: number) =>
      x < forbid.r && x + w > forbid.l && y < forbid.b && y + h > forbid.t;
    root.querySelectorAll<HTMLElement>(".wind-line.in-sky").forEach((line, index) => {
      if (getComputedStyle(line).display === "none") return;
      const w = Math.min(host.width * 0.11, 160);
      const h = 3;
      let x = forbid.r + 16 + index * 12;
      const y = Math.max(72, box.top - host.top + 10 + index * Math.max(26, host.height * 0.055));
      if (x + w > host.width - 8) x = Math.max(8, host.width - w - 8);
      if (hits(x, y, w, h)) {
        line.style.visibility = "hidden";
        return;
      }
      line.style.visibility = "visible";
      line.style.left = `${x}px`;
      line.style.top = `${y}px`;
      line.style.width = `${w}px`;
    });
    gulls.forEach((gull, index) => {
      if (getComputedStyle(gull).display === "none") return;
      const w = gull.getBoundingClientRect().width || 22;
      const h = 14;
      let x = narrow ? host.width - 14 - w - index * 28 : host.width * (0.7 + index * 0.07);
      let y = narrow ? box.top - host.top + 6 + index * 26 : host.height * (index === 1 ? 0.22 : 0.16);
      if (hits(x, y, w, h)) {
        x = Math.min(host.width - w - 8, Math.max(8, forbid.r + 8));
        y = narrow ? box.top - host.top + 6 + index * 26 : y;
      }
      if (hits(x, y, w, h)) {
        x = Math.min(host.width - w - 8, host.width - 14 - w - (index % 2) * 32);
        y = forbid.b + 16 + index * 22;
      }
      if (hits(x, y, w, h) || x < 4 || y < 4 || x + w > host.width - 2 || y + h > host.height - 2) {
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

  if (tier === "0") {
    root.querySelectorAll<SVGPathElement>("[data-full]").forEach((path) => {
      if (path.dataset.full) path.setAttribute("d", path.dataset.full);
    });
    boat?.classList.add("is-full");
    divider?.classList.add("is-drawn");
    root.classList.add("is-settled");
    placeScene();
    document.fonts?.ready.then(placeScene).catch(() => undefined);
    window.addEventListener("resize", placeScene);
    return;
  }

  const motion = { wind: 0, front: 0, sail: 0, surge: 0, scroll: 0, nudge: 0 };
  const clock = { intro: 0, flow: 0, vel: 0, last: performance.now(), hidden: false, away: false, pointer: 0 };
  let raf = 0;
  let frame = (_now: number) => {};
  const live = () => !clock.hidden && !clock.away;
  const tweens: Array<{ paused: (value?: boolean) => void }> = [];

  const pose = () => {
    if (!boat) return;
    const damp = clock.intro < 4.2 ? 1 : clock.intro >= 5 ? 0 : 1 - (clock.intro - 4.2) / 0.8;
    const wave = heave(Math.min(clock.intro, 4.2));
    const heel = motion.sail * 8 + wave.pitch * damp;
    if (!sp()) boat.style.left = "72%";
    boat.style.transform = `translate3d(-50%, ${wave.y * damp}px, 0) rotate(${heel}deg)`;
    if (spray) spray.style.opacity = String(0.2 + motion.sail * 0.75);
    const drift = motion.surge * -6 - Math.min(motion.scroll, 0.75) * 10;
    if (fleet) fleet.style.transform = `translateX(${drift}vw)`;
    const pass = motion.surge * 8 + (motion.scroll < 0.4 ? (motion.scroll / 0.4) * 12 : motion.scroll > 0 ? 12 : 0);
    const travel = sp() ? 0 : pass;
    gulls.forEach((gull, index) => {
      gull.style.transform = `translate3d(${travel + (sp() ? 0 : index * 2)}vw, 0, 0)`;
    });
    if (clock.intro >= 5) root.classList.add("is-settled");
    placeScene();
  };

  const kick = () => {
    if (!raf && live()) raf = requestAnimationFrame(frame);
  };
  const setRun = () => {
    tweens.forEach((tween) => tween.paused(!live()));
    kick();
  };

  void import("gsap/MorphSVGPlugin").then(({ MorphSVGPlugin }) => {
    gsap.registerPlugin(MorphSVGPlugin);
    const morph = (path: SVGPathElement | null, key: "half" | "full", at: number) => {
      const target = path?.dataset[key];
      if (!path || !target) return;
      tweens.push(gsap.to(path, { morphSVG: target, duration: 0.6, delay: at, ease: lever }));
    };
    root.querySelectorAll<SVGPathElement>("[data-full]").forEach((path) => {
      morph(path, "half", 2.4);
      morph(path, "full", 3.0);
    });
    tweens.push(
      gsap.to(motion, { front: 1, duration: 1.2, delay: 1.2, ease: "power1.inOut" }),
      gsap.to(motion, { wind: 1, duration: 1.2, delay: 1.2, ease: "power1.inOut" }),
      gsap.to(motion, { sail: 1, duration: 1.2, delay: 2.4, ease: lever }),
      gsap.to(motion, { surge: 1, duration: 1.4, delay: 3.6, ease: "power2.inOut" }),
      gsap.from(".mv-ja", { y: 12, autoAlpha: 0, duration: 0.8, delay: 0.2, ease: "power3.out" }),
    );
    lines.forEach((line, index) => {
      const far = line.classList.contains("far") ? 0.45 : 0;
      const opacity = line.classList.contains("is-hot") ? 0.85 : line.classList.contains("is-sky") ? 0.7 : 0.55;
      const sky = line.classList.contains("in-sky");
      tweens.push(
        gsap.fromTo(
          line,
          { x: sky ? "0vw" : "-6vw", autoAlpha: 0 },
          { x: sky ? "0vw" : `${(1 - far) * 4.5}vw`, autoAlpha: opacity, duration: 3.8, delay: 1.2 + index * 0.04, ease: "none" },
        ),
      );
    });
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
      const dpr = Math.min(window.devicePixelRatio || 1, tier === "3" ? 1.5 : 1) * (tier === "3" ? 1 : 0.75);
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const paint = () => {
      const narrow = sp();
      const fov = ((narrow ? 50 : 36) * Math.PI) / 180;
      const horizon = narrow ? 0.6 : 0.66;
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
      gl.uniform1f(u("uOct"), tier === "3" ? 4 : 2);
      gl.uniform1f(u("uHi"), hi);
      gl.uniform1f(u("uFade"), fade);
      gl.uniform1f(u("uExposure"), 0.4 + sunLift * 0.08);
      gl.uniform1f(u("uCaustic"), tier === "3" ? 1 : 0.5);
      gl.uniform4f(u("uHead"), rect[0] ?? 0, rect[1] ?? 0, rect[2] ?? 0, rect[3] ?? 0);
      gl.uniform1f(u("uSunX"), narrow ? 0.86 : 0.84);
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
