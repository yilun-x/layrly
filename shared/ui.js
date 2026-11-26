(() => {
  const L = globalThis.Layrly;
  L.setUITheme = theme => {
    document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    try { const { preferences } = await L.Storage.read(); L.setUITheme(preferences.theme); } catch { /* Extension page is closing. */ }
  });
})();
