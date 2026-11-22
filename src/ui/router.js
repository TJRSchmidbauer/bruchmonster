// Minimaler Bildschirm-Router: ein Bildschirm zur Zeit, Fokus geht auf die h1.
const screens = new Map();
let root = null;
let app = null;
let cleanup = null;

export function startRouter(rootEl, appObj) {
  root = rootEl;
  app = appObj;
  cleanup = null;
}

export function registerScreen(name, render) {
  screens.set(name, render);
}

export function go(name, params = {}) {
  const render = screens.get(name);
  if (!render) throw new Error(`Unbekannter Bildschirm: ${name}`);
  if (typeof cleanup === 'function') cleanup();
  cleanup = null;
  root.replaceChildren();
  const result = render(root, params, app);
  if (typeof result === 'function') cleanup = result;
  const h1 = root.querySelector('h1');
  if (h1) {
    h1.setAttribute('tabindex', '-1');
    if (typeof h1.focus === 'function') h1.focus({ preventScroll: false });
  }
  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') window.scrollTo(0, 0);
}
