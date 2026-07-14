const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ============================================================
// Animaciones de entrada al hacer scroll
// ============================================================
const revealEls = document.querySelectorAll(".reveal");
const show = (el) => el.classList.add("is-visible");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach(show);
} else {
  // Lo que ya está en el viewport inicial aparece de inmediato
  revealEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) show(el);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => {
    if (!el.classList.contains("is-visible")) observer.observe(el);
  });
}

// ============================================================
// Hero: el título se escribe a máquina al cargar la página
// ============================================================
(() => {
  const hero = document.querySelector(".hero");
  const typed = document.querySelector(".hero__typed");
  const caret = document.querySelector(".hero__caret");
  if (!hero || !typed || !caret || reducedMotion) return;

  const segments = [
    { text: "Pongo orden" },
    { br: true },
    { text: "en tu " },
    { text: "producto", em: true },
  ];

  hero.classList.add("is-typing");
  typed.innerHTML = "";
  caret.style.display = "inline-block";

  let si = 0;
  let ci = 0;
  let emEl = null;

  function step() {
    const seg = segments[si];
    if (!seg) return finish();

    if (seg.br) {
      typed.appendChild(document.createElement("br"));
      si++;
      return setTimeout(step, 160);
    }
    if (seg.em && !emEl) {
      emEl = document.createElement("em");
      typed.appendChild(emEl);
    }
    (seg.em ? emEl : typed).appendChild(document.createTextNode(seg.text[ci]));
    ci++;
    if (ci >= seg.text.length) {
      si++;
      ci = 0;
      emEl = null;
    }
    setTimeout(step, 45 + Math.random() * 65); // cadencia humana, con jitter
  }

  function finish() {
    // Al terminar de escribir, entran el subtítulo y los botones
    hero.classList.remove("is-typing");
    // El caret parpadea un poco más y se desvanece
    setTimeout(() => caret.classList.add("is-done"), 1800);
  }

  setTimeout(step, 400);
})();

// ============================================================
// Hero: líneas sutiles desde el cursor hacia puntos que
// derivan aleatoriamente por todo el hero
// ============================================================
(() => {
  const hero = document.querySelector(".hero");
  const canvas = document.getElementById("heroCanvas");
  if (!hero || !canvas || reducedMotion) return;

  const ctx = canvas.getContext("2d");

  // Paleta que cicla en bucle: magenta → púrpura → azul → magenta
  const palette = [
    [236, 72, 153], // magenta
    [139, 92, 246], // púrpura
    [43, 89, 255],  // azul
  ];
  const CYCLE_MS = 9000;   // duración de un ciclo completo de color
  const MAX_ALPHA = 0.2;   // opacidad máxima de las líneas
  const POINTS = 9;        // orígenes de línea

  const bounds = { w: 0, h: 0 };
  let anchors = [];
  const mouse = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  let alpha = 0;
  let targetAlpha = 0;
  let running = false;

  function initAnchors() {
    anchors = [];
    for (let i = 0; i < POINTS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.25 + Math.random() * 0.45; // px por frame, deriva lenta
      anchors.push({
        x: Math.random() * bounds.w,
        y: Math.random() * bounds.h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = hero.getBoundingClientRect();
    bounds.w = rect.width;
    bounds.h = rect.height;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (anchors.length === 0) initAnchors();
  }

  // Interpola la paleta en bucle; cada línea lleva un desfase propio
  function colorAt(time, offset) {
    const t = ((time / CYCLE_MS + offset) % 1 + 1) % 1;
    const scaled = t * palette.length;
    const i = Math.floor(scaled);
    const frac = scaled - i;
    const a = palette[i % palette.length];
    const b = palette[(i + 1) % palette.length];
    return [
      Math.round(a[0] + (b[0] - a[0]) * frac),
      Math.round(a[1] + (b[1] - a[1]) * frac),
      Math.round(a[2] + (b[2] - a[2]) * frac),
    ];
  }

  function frame(time) {
    alpha += (targetAlpha - alpha) * 0.07;
    eased.x += (mouse.x - eased.x) * 0.16;
    eased.y += (mouse.y - eased.y) * 0.16;

    ctx.clearRect(0, 0, bounds.w, bounds.h);

    if (alpha < 0.004 && targetAlpha === 0) {
      running = false; // se detiene hasta que el cursor vuelva a entrar
      return;
    }

    ctx.lineWidth = 1.25;
    anchors.forEach((p, i) => {
      // deriva aleatoria con rebote en los bordes del hero
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > bounds.w) { p.vx *= -1; p.x = Math.max(0, Math.min(bounds.w, p.x)); }
      if (p.y < 0 || p.y > bounds.h) { p.vy *= -1; p.y = Math.max(0, Math.min(bounds.h, p.y)); }

      const [r, g, b] = colorAt(time, i / anchors.length);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(eased.x, eased.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 1.4})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  function start() {
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  }

  // El cursor se sigue en toda la página: las líneas no desaparecen
  // al salir del hero (el canvas recorta lo que quede fuera)
  let firstMove = true;
  document.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (firstMove) {
      firstMove = false;
      eased.x = mouse.x;
      eased.y = mouse.y;
    }
    targetAlpha = MAX_ALPHA;
    start();
  });

  window.addEventListener("resize", resize);
  resize();
})();

// ============================================================
// Oferta: campo de líneas flotantes que ciclan color.
// Al hacer hover, las cercanas se alinean apuntando al CTA
// con un color fijo; las lejanas siguen dispersas.
// ============================================================
(() => {
  const offer = document.querySelector(".offer");
  const canvas = document.querySelector(".offer__canvas");
  if (!offer || !canvas || reducedMotion) return;

  const ctx = canvas.getContext("2d");
  const palette = [
    [236, 72, 153], // magenta
    [139, 92, 246], // púrpura
    [43, 89, 255],  // azul
  ];
  const FIXED = [43, 89, 255]; // color único de las líneas alineadas
  const CYCLE_MS = 9000;
  const COUNT = 64;

  const bounds = { w: 0, h: 0 };
  let lines = [];
  let btnCenter = { x: 0, y: 0 };
  let hovering = false;
  let running = false;

  function initLines() {
    lines = [];
    for (let i = 0; i < COUNT; i++) {
      const drift = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.35;
      lines.push({
        x: Math.random() * bounds.w,
        y: Math.random() * bounds.h,
        vx: Math.cos(drift) * speed,
        vy: Math.sin(drift) * speed,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.012,
        len: 20 + Math.random() * 38,
        align: 0,              // 0 = libre, 1 = apuntando al CTA
        offset: Math.random(), // desfase de color propio
      });
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = offer.getBoundingClientRect();
    bounds.w = rect.width;
    bounds.h = rect.height;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const btn = offer.querySelector(".btn");
    if (btn) {
      const br = btn.getBoundingClientRect();
      btnCenter = { x: br.left - rect.left + br.width / 2, y: br.top - rect.top + br.height / 2 };
    }
    if (lines.length === 0) initLines();
  }

  function colorAt(time, offset) {
    const t = ((time / CYCLE_MS + offset) % 1 + 1) % 1;
    const scaled = t * palette.length;
    const i = Math.floor(scaled);
    const frac = scaled - i;
    const a = palette[i % palette.length];
    const b = palette[(i + 1) % palette.length];
    return [
      a[0] + (b[0] - a[0]) * frac,
      a[1] + (b[1] - a[1]) * frac,
      a[2] + (b[2] - a[2]) * frac,
    ];
  }

  // Interpola ángulos por el arco más corto
  function lerpAngle(a, b, t) {
    const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    return a + d * t;
  }

  function frame(time) {
    if (!running) return;
    ctx.clearRect(0, 0, bounds.w, bounds.h);
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";

    // Radio de influencia: las líneas dentro se alinean, el resto no
    const R = 0.32 * Math.hypot(bounds.w, bounds.h);

    lines.forEach((L) => {
      // Las alineadas casi se detienen; las libres derivan y rotan
      const freedom = 1 - L.align * 0.85;
      L.x += L.vx * freedom;
      L.y += L.vy * freedom;
      if (L.x < 0 || L.x > bounds.w) { L.vx *= -1; L.x = Math.max(0, Math.min(bounds.w, L.x)); }
      if (L.y < 0 || L.y > bounds.h) { L.vy *= -1; L.y = Math.max(0, Math.min(bounds.h, L.y)); }
      L.angle += L.spin * freedom;

      const dx = btnCenter.x - L.x;
      const dy = btnCenter.y - L.y;
      const wants = hovering && Math.hypot(dx, dy) < R ? 1 : 0;
      L.align += (wants - L.align) * 0.05;

      const drawAngle = lerpAngle(L.angle, Math.atan2(dy, dx), L.align);
      const free = colorAt(time, L.offset);
      const r = Math.round(free[0] + (FIXED[0] - free[0]) * L.align);
      const g = Math.round(free[1] + (FIXED[1] - free[1]) * L.align);
      const b = Math.round(free[2] + (FIXED[2] - free[2]) * L.align);
      const alpha = 0.22 + L.align * 0.33;

      const hx = Math.cos(drawAngle) * L.len / 2;
      const hy = Math.sin(drawAngle) * L.len / 2;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(L.x - hx, L.y - hy);
      ctx.lineTo(L.x + hx, L.y + hy);
      ctx.stroke();
    });

    requestAnimationFrame(frame);
  }

  // Solo anima mientras el módulo está en pantalla
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  });
  io.observe(offer);

  offer.addEventListener("mouseenter", () => { hovering = true; });
  offer.addEventListener("mouseleave", () => { hovering = false; });

  window.addEventListener("resize", resize);
  resize();
})();
