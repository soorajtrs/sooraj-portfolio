document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Animated counters ----------
function animateCounter(el) {
  const target = parseFloat(el.dataset.target || "0");
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) {
    el.textContent = prefix + target + suffix;
    return;
  }
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
    const value = Math.round(target * eased);
    el.textContent = prefix + value + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counters = document.querySelectorAll(".counter");
if (counters.length) {
  if (!("IntersectionObserver" in window)) {
    counters.forEach(animateCounter);
  } else {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => counterObserver.observe(c));
  }
}

// ---------- Diagram draw-in ----------
function animateDiagram(wrap) {
  const svg = wrap.querySelector("svg");
  if (!svg) return;
  svg.classList.add("diagram-in");
  const lines = svg.querySelectorAll(".dline");
  lines.forEach((path, i) => {
    if (reduceMotion) {
      path.style.strokeDasharray = "none";
      return;
    }
    const len = path.getTotalLength();
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.getBoundingClientRect(); // force layout before transition
    path.style.transition = "stroke-dashoffset 0.9s ease";
    const delay = 350 + i * 120;
    setTimeout(() => {
      path.style.strokeDashoffset = "0";
    }, delay);
  });
}

const diagramWraps = document.querySelectorAll(".diagram-wrap");
if (diagramWraps.length) {
  if (!("IntersectionObserver" in window)) {
    diagramWraps.forEach(animateDiagram);
  } else {
    const diagramObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateDiagram(entry.target);
            diagramObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    diagramWraps.forEach((w) => diagramObserver.observe(w));
  }
}

const revealEls = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("in-view"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => observer.observe(el));
}

const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => navLinks.classList.remove("open"))
);

const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;

function applyStoredTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      root.setAttribute("data-theme", saved);
    }
  } catch (e) {
    /* localStorage unavailable; ignore */
  }
}
applyStoredTheme();

themeToggle.addEventListener("click", () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const current = root.getAttribute("data-theme") || (prefersDark ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch (e) {
    /* ignore */
  }
});
