export function bootSite(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  let last = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle("is-compact", y > 20);
    const down = y > last + 4;
    header?.classList.toggle("is-hidden", y > 180 && down);
    if (y < 40) header?.classList.remove("is-hidden");
    last = y;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

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

  if (document.documentElement.dataset.tier === "0") {
    document.querySelectorAll(".dont-item").forEach((item) => item.classList.add("is-struck"));
    return;
  }

  const start = () => {
    void import("gsap").then(({ default: gsap }) =>
      import("gsap/ScrollTrigger").then(({ ScrollTrigger }) => {
        gsap.registerPlugin(ScrollTrigger);
        document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
          if (element.getBoundingClientRect().top <= window.innerHeight * 0.92) return;
          element.classList.add("is-pending");
          gsap.to(element, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 88%", once: true },
          });
        });
        document.querySelectorAll<HTMLElement>(".dont-item").forEach((element) => {
          ScrollTrigger.create({
            trigger: element,
            start: "top 82%",
            once: true,
            onEnter: () => element.classList.add("is-struck"),
          });
        });
      }),
    );
  };

  if ("requestIdleCallback" in window) window.requestIdleCallback(start);
  else window.addEventListener("load", start, { once: true });
}
