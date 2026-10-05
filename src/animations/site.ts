export function bootSite(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  let last = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const home = document.querySelector(".is-home");
    header?.classList.toggle("is-compact", y > 24);
    header?.classList.toggle("is-solid", !home || y > window.innerHeight * 0.82);
    const down = y > last + 6;
    const up = y < last - 6;
    if (y > 200 && down) header?.classList.add("is-hidden");
    if (up || y < 40) header?.classList.remove("is-hidden");
    last = y;
  };
  const parallax = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
  const bar = document.querySelector<HTMLElement>("[data-read-bar]");
  const paintExtras = () => {
    const y = window.scrollY;
    for (const node of parallax) {
      const shift = Math.max(-48, Math.min(48, (0.45 - node.getBoundingClientRect().top / window.innerHeight) * 48));
      node.style.transform = `translate3d(0, ${shift}px, 0)`;
    }
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    }
  };
  onScroll();
  paintExtras();
  window.addEventListener("scroll", () => { onScroll(); paintExtras(); }, { passive: true });
  const film = document.querySelector<HTMLVideoElement>("[data-film]");
  if (film && document.documentElement.dataset.tier !== "0") {
    const stop = () => {
      if (film.currentTime >= 5) {
        film.pause();
        film.currentTime = 5;
      }
    };
    film.addEventListener("timeupdate", stop);
    film.play().catch(() => undefined);
  }

  const menu = document.querySelector<HTMLElement>("[data-menu]");
  const openButton = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  const closeButton = document.querySelector<HTMLButtonElement>("[data-menu-close]");
  const setOpen = (value: boolean) => {
    if (!menu || !openButton) return;
    menu.hidden = !value;
    menu.classList.toggle("is-open", value);
    openButton.setAttribute("aria-expanded", String(value));
    document.body.style.overflow = value ? "hidden" : "";
    if (value) closeButton?.focus();
    else openButton.focus();
  };
  openButton?.addEventListener("click", () => setOpen(true));
  closeButton?.addEventListener("click", () => setOpen(false));
  menu?.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || !menu) return;
    const focusable = [...menu.querySelectorAll<HTMLElement>("a, button")];
    const first = focusable[0];
    const lastItem = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      lastItem?.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      first?.focus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  const strikes = [...document.querySelectorAll<HTMLElement>(".dont-item")];
  if (document.documentElement.dataset.tier === "0") {
    strikes.forEach((item) => item.classList.add("is-struck"));
  } else if (strikes.length) {
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-struck");
        seen.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -18% 0px" });
    strikes.forEach((item) => seen.observe(item));
  }

  const flow = document.querySelector<HTMLElement>("[data-flow]");
  const line = flow?.querySelector<HTMLElement>("[data-flow-line]");
  if (!flow || !line || !window.matchMedia("(min-width: 1024px)").matches) return;

  const start = () => {
    void import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        gsap.fromTo(line, { scaleX: 0 }, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: flow, start: "top top", end: "+=70%", scrub: true, pin: true },
        });
      }),
    );
  };

  if ("requestIdleCallback" in window) window.requestIdleCallback(start);
  else window.addEventListener("load", start, { once: true });
}
