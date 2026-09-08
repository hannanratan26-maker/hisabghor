// Permanently hides / removes injected editor badges ("Edit with Lovable" / "Edit with Base44").
const MATCHERS = [
  ".lovable-badge",
  "[data-lovable-badge]",
  "#lovable-badge",
  "#lovable-badge-root",
  'a[href*="lovable.dev"]',
  'a[href*="lovable.app/projects"]',
  'iframe[src*="lovable.dev"]',
  'iframe[src*="gpteng"]',
  ".base44-badge",
  "[data-base44-badge]",
  "#base44-badge",
  "#base44-badge-root",
  'a[href*="base44.com"]',
  'a[href*="base44.app"]',
  'iframe[src*="base44"]',
];

const TEXT_MATCHERS = ["edit with base44", "edit with lovable"];

function nukeByText(root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll("a, button, div").forEach((el) => {
    const text = (el.textContent || "").trim().toLowerCase();
    if (text.length > 40) return;
    if (TEXT_MATCHERS.some((t) => text === t || text.replace(/\s+/g, " ") === t)) nuke(el);
  });
}


function nuke(el) {
  if (!el) return;
  try {
    el.remove();
  } catch {
    el.style.setProperty("display", "none", "important");
  }
}

function sweep(root) {
  if (!root || !root.querySelectorAll) return;
  for (const sel of MATCHERS) {
    root.querySelectorAll(sel).forEach(nuke);
  }
  nukeByText(root);

  // shadow DOM hosts
  root.querySelectorAll?.("*").forEach((el) => {
    if (el.shadowRoot) sweep(el.shadowRoot);
  });
}

export function hideLovableBadge() {
  if (typeof window === "undefined") return undefined;

  const run = () => sweep(document);
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // safety net for late injections
  const iv = setInterval(run, 1000);
  setTimeout(() => clearInterval(iv), 30000);
  document.addEventListener("visibilitychange", run);

  return () => {
    observer.disconnect();
    clearInterval(iv);
    document.removeEventListener("visibilitychange", run);
  };
}
