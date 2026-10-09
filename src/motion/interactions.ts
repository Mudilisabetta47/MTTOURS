import { motionEnv, onTick } from "./engine";

/** [data-reveal] → adds .is-in once visible. All visual states live in CSS. */
export function initReveals(root: ParentNode = document): () => void {
  const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
  if (motionEnv().reduced) {
    els.forEach((e) => e.classList.add("is-in"));
    return () => undefined;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

/** Magnetic buttons: [data-magnetic="0.3"] (strength). Pointer devices only. */
export function initMagnetic(root: ParentNode = document): () => void {
  if (!motionEnv().finePointer || motionEnv().reduced) return () => undefined;
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - (r.left + r.width / 2)) * strength;
      const y = (ev.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };
    const leave = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    cleanups.push(() => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    });
  });
  return () => cleanups.forEach((c) => c());
}

/** Custom cursor ring with states from [data-cursor] and [data-cursor-label]. Desktop pointer only. */
export function initCursor(): () => void {
  if (!motionEnv().finePointer || motionEnv().reduced) return () => undefined;
  const ring = document.createElement("div");
  ring.className = "cursor";
  ring.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  ring.appendChild(label);
  document.body.appendChild(ring);
  document.documentElement.classList.add("has-cursor");

  let tx = -100;
  let ty = -100;
  let x = -100;
  let y = -100;
  const move = (e: PointerEvent) => {
    tx = e.clientX;
    ty = e.clientY;
    const target = (e.target as Element | null)?.closest<HTMLElement>("[data-cursor], a, button, input, select, textarea, label");
    const state = target?.dataset.cursor ?? (target ? "link" : "");
    ring.dataset.state = state;
    label.textContent = target?.dataset.cursorLabel ?? "";
  };
  const leave = () => (ring.dataset.hidden = "true");
  const enter = () => delete ring.dataset.hidden;
  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", leave);
  document.addEventListener("pointerenter", enter);
  const stop = onTick((dt) => {
    const k = 1 - Math.exp(-dt * 22);
    x += (tx - x) * k;
    y += (ty - y) * k;
    ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }, 20);
  return () => {
    stop();
    window.removeEventListener("pointermove", move);
    document.removeEventListener("pointerleave", leave);
    document.removeEventListener("pointerenter", enter);
    ring.remove();
    document.documentElement.classList.remove("has-cursor");
  };
}
