(() => {
  'use strict';
  const L = globalThis.Layrly = globalThis.Layrly || {};
  const DEFAULTS = Object.freeze({
    theme: 'light', columns: 3, width: 1120, gap: 20, ratio: 'original',
    hideSidebar: false, remember: true, defaultX: 'original', defaultInstagram: 'original'
  });
  const modes = ['original', 'transformed'];
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value))
    ? Math.min(max, Math.max(min, Math.round(Number(value)))) : fallback;
  function normalize(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    return {
      theme: ['light', 'dark', 'system'].includes(input.theme) ? input.theme : DEFAULTS.theme,
      columns: clamp(input.columns ?? DEFAULTS.columns, 2, 4, DEFAULTS.columns),
      width: clamp(input.width ?? DEFAULTS.width, 760, 1600, DEFAULTS.width),
      gap: clamp(input.gap ?? DEFAULTS.gap, 8, 40, DEFAULTS.gap),
      ratio: ['original', 'square', 'portrait', 'landscape'].includes(input.ratio) ? input.ratio : DEFAULTS.ratio,
      hideSidebar: typeof input.hideSidebar === 'boolean' ? input.hideSidebar : DEFAULTS.hideSidebar,
      remember: typeof input.remember === 'boolean' ? input.remember : DEFAULTS.remember,
      defaultX: modes.includes(input.defaultX) ? input.defaultX : DEFAULTS.defaultX,
      defaultInstagram: modes.includes(input.defaultInstagram) ? input.defaultInstagram : DEFAULTS.defaultInstagram
    };
  }
  function resolveMode(site, values, preferences) {
    const fallback = preferences[site === 'x' ? 'defaultX' : 'defaultInstagram'];
    const saved = values[`layrly.${site}`];
    return preferences.remember && modes.includes(saved) ? saved : fallback;
  }
  L.Storage = {
    DEFAULTS, normalize, resolveMode,
    async read() {
      const values = await chrome.storage.local.get(['layrly.preferences', 'layrly.x', 'layrly.instagram']);
      return { values, preferences: normalize(values['layrly.preferences']) };
    },
    async updatePreferences(patch) {
      const { preferences } = await this.read();
      const next = normalize({ ...preferences, ...patch });
      await chrome.storage.local.set({ 'layrly.preferences': next });
      return next;
    },
    async setMode(site, mode) {
      if (!['x', 'instagram'].includes(site) || !modes.includes(mode)) throw new Error('无效的布局');
      await chrome.storage.local.set({ [`layrly.${site}`]: mode });
    },
    async reset() {
      await chrome.storage.local.remove(['layrly.preferences', 'layrly.x', 'layrly.instagram']);
    }
  };
})();
