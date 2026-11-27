document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Copy email ----------
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      btn.dataset.feedback = "Copied!";
    } catch (e) {
      btn.dataset.feedback = "Copy failed";
    }
    btn.classList.add("copied");
    setTimeout(() => btn.classList.remove("copied"), 1400);
  });
});

// ---------- Back to top ----------
const backToTop = document.getElementById("backToTop");
if (backToTop) {
  window.addEventListener(
    "scroll",
    () => {
      backToTop.classList.toggle("show", window.scrollY > 600);
    },
    { passive: true }
  );
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
}

// ---------- Active nav link on scroll ----------
const navLinkMap = new Map();
document.querySelectorAll('.nav-links a[href^="#"]').forEach((a) => {
  navLinkMap.set(a.getAttribute("href").slice(1), a);
});
const navSections = Array.from(document.querySelectorAll("section[id], footer[id]")).filter((s) =>
  navLinkMap.has(s.id)
);
if (navSections.length && "IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = navLinkMap.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinkMap.forEach((l) => l.classList.remove("active"));
          link.classList.add("active");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  navSections.forEach((s) => navObserver.observe(s));
}

// ---------- Card tilt ----------
if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.querySelectorAll(".card:not(.diagram-card)").forEach((card) => {
    card.classList.add("tilt");
    const maxTilt = 5;
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-4px) perspective(700px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

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

// ---------- Diagram click-to-trace ----------
document.querySelectorAll(".diagram-wrap svg").forEach((svg) => {
  const nodes = Array.from(svg.querySelectorAll(".dnode"));
  const edges = Array.from(svg.querySelectorAll(".edge, .edge2, .edge3, .loopback"));

  function clearPin() {
    svg.classList.remove("pinned");
    svg.dataset.pinnedId = "";
    nodes.forEach((n) => {
      n.classList.remove("hl");
      n.setAttribute("aria-pressed", "false");
    });
    edges.forEach((e) => e.classList.remove("hl"));
  }

  function pinNode(node) {
    const id = node.dataset.id;
    svg.dataset.pinnedId = id;
    svg.classList.add("pinned");
    nodes.forEach((n) => {
      n.classList.remove("hl");
      n.setAttribute("aria-pressed", "false");
    });
    edges.forEach((e) => e.classList.remove("hl"));
    node.classList.add("hl");
    node.setAttribute("aria-pressed", "true");
    edges.forEach((e) => {
      if (e.dataset.from === id || e.dataset.to === id) {
        e.classList.add("hl");
        const otherId = e.dataset.from === id ? e.dataset.to : e.dataset.from;
        const otherNode = nodes.find((n) => n.dataset.id === otherId);
        if (otherNode) otherNode.classList.add("hl");
      }
    });
  }

  nodes.forEach((node) => {
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      if (svg.dataset.pinnedId === node.dataset.id) {
        clearPin();
      } else {
        pinNode(node);
      }
    });
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        node.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
      }
    });
  });

  svg.addEventListener("click", () => clearPin());
});

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
