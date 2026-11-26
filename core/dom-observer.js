(() => {
  'use strict';
  const L = globalThis.Layrly = globalThis.Layrly || {};
  L.observe = (callback) => {
    let timer = null;
    let stopped = false;
    let url = location.href;
    const schedule = () => {
      if (stopped || timer !== null || document.hidden) return;
      timer = setTimeout(() => { timer = null; callback(); }, 100);
    };
    const observer = new MutationObserver(schedule);
    const connect = () => {
      if (!stopped) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-testid', 'aria-selected', 'aria-label', 'src'] });
    };
    connect();
    const routeTimer = setInterval(() => {
      if (location.href !== url) { url = location.href; schedule(); }
    }, 800);
    const visible = () => { if (!document.hidden) schedule(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('popstate', schedule);
    window.addEventListener('pageshow', schedule);
    return {
      pause: () => observer.disconnect(),
      resume: connect,
      stop() {
        stopped = true;
        clearTimeout(timer);
        clearInterval(routeTimer);
        observer.disconnect();
        document.removeEventListener('visibilitychange', visible);
        window.removeEventListener('popstate', schedule);
        window.removeEventListener('pageshow', schedule);
      }
    };
  };
  // Track only our attributes. Never replace, clone, or move a platform's nodes.
  L.Marks = class {
    constructor() { this.nodes = new Map(); }
    set(node, name, value = '') {
      if (!node) return;
      let attributes = this.nodes.get(node);
      if (!attributes) this.nodes.set(node, attributes = new Map());
      if (!attributes.has(name)) attributes.set(name, node.getAttribute(name));
      if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    }
    clear() {
      for (const [node, attributes] of this.nodes) {
        for (const [name, previous] of attributes) {
          if (previous === null) node.removeAttribute(name);
          else node.setAttribute(name, previous);
        }
      }
      this.nodes.clear();
    }
  };
})();
