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

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    targetAlpha = MAX_ALPHA;
    start();
  });

  hero.addEventListener("mouseenter", (e) => {
    const rect = hero.getBoundingClientRect();
    eased.x = mouse.x = e.clientX - rect.left;
    eased.y = mouse.y = e.clientY - rect.top;
  });

  hero.addEventListener("mouseleave", () => {
    targetAlpha = 0; // el bucle sigue hasta desvanecerse y luego se apaga
  });

  window.addEventListener("resize", resize);
  resize();
})();
