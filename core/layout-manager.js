(() => {
  'use strict';
  const L = globalThis.Layrly;
  if (L.manager) return;
  const site = L.detectSite(location.href);
  if (!site) return;
  const marks = new L.Marks();
  const root = document.documentElement;
  let preferences = L.Storage.normalize();
  let mode = 'original';
  let observer;
  let result = { count: 0, fallback: false };
  let failure = false;
  const darkQuery = matchMedia('(prefers-color-scheme: dark)');
  const status = () => ({
    site, mode, route: L.detectRoute(site, location.pathname), ...result,
    active: mode === 'transformed' && root.hasAttribute('data-layrly'), error: failure
  });
  function apply() {
    observer?.pause();
    marks.clear();
    result = { count: 0, fallback: false };
    const route = L.detectRoute(site, location.pathname);
    try {
      failure = false;
      if (mode !== 'transformed' || route === 'native') return;
      marks.set(root, 'data-layrly', site);
      marks.set(root, 'data-layrly-route', route);
      marks.set(root, 'data-layrly-theme', preferences.theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : preferences.theme);
      marks.set(root, 'data-layrly-sidebar', preferences.hideSidebar ? 'hidden' : 'visible');
      marks.set(root, 'data-layrly-ratio', preferences.ratio);
      marks.set(root, 'data-layrly-columns', String(preferences.columns));
      // A private stylesheet avoids changing the site's inline style attribute.
      let variables = document.getElementById('layrly-variables');
      if (!variables) {
        variables = document.createElement('style');
        variables.id = 'layrly-variables';
        (document.head || root).append(variables);
      }
      const css = `:root[data-layrly]{--layrly-width:${preferences.width}px;--layrly-gap:${preferences.gap}px;--layrly-columns:${preferences.columns}}`;
      if (variables.textContent !== css) variables.textContent = css;
      result = site === 'x' ? L.applyX(marks, route) : L.applyInstagram(marks, route);
    } catch (error) {
      marks.clear();
      failure = true;
      console.warn('[LAYRLY] Restored native layout:', error.message);
    } finally {
      if (!root.hasAttribute('data-layrly')) {
        L.xNotifications?.clear();
        L.xNavigation?.cleanup();
        L.xFeed?.clear();
        document.getElementById('layrly-variables')?.remove();
      }
      observer?.resume();
    }
  }
  const themeChange = () => { if (preferences.theme === 'system') apply(); };
  darkQuery.addEventListener('change', themeChange);
  const storageChange = async (changes, area) => {
    if (area !== 'local') return;
    if (changes['layrly.preferences']) {
      preferences = L.Storage.normalize(changes['layrly.preferences'].newValue);
      // Reset also covers tabs that were enabled solely by a default layout,
      // without ever creating a per-site remembered-mode key.
      if (changes['layrly.preferences'].newValue === undefined) mode = 'original';
    }
    if (changes[`layrly.${site}`]) {
      const next = changes[`layrly.${site}`].newValue;
      mode = ['original', 'transformed'].includes(next) ? next : preferences[site === 'x' ? 'defaultX' : 'defaultInstagram'];
    }
    if (changes['layrly.preferences'] || changes[`layrly.${site}`]) apply();
  };
  chrome.storage.onChanged.addListener(storageChange);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id || !message || !['LAYRLY_STATUS', 'LAYRLY_MODE'].includes(message.type)) return;
    if (message.type === 'LAYRLY_MODE' && ['original', 'transformed'].includes(message.mode)) {
      mode = message.mode;
      apply();
    }
    respond(status());
  });
  L.manager = { status, apply };
  // Register the storage listener before reading, so startup cannot miss a toggle.
  L.Storage.read().then(({ values, preferences: saved }) => {
    preferences = saved;
    mode = L.Storage.resolveMode(site, values, saved);
    apply();
    observer = L.observe(apply);
  }).catch(() => { failure = true; });
})();
