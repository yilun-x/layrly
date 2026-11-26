(() => {
  'use strict';
  const L = globalThis.Layrly;
  const $ = selector => document.querySelector(selector);
  let site, tab, mode, preferences;
  let connected = false;
  let busy = false;
  let pageStatus;
  const showError = message => { $('#status').textContent = message; $('#status').classList.add('error'); };
  const describe = () => {
    $('#status').classList.remove('error');
    if (!site) return;
    if (!connected) { $('#status').textContent = 'Refresh this tab to connect the extension.'; return; }
    if (pageStatus?.error) { showError('The page structure changed. The original layout has been restored.'); return; }
    if (pageStatus?.route === 'native') { $('#status').textContent = 'This page uses the native layout.'; return; }
    if (mode === 'original') { $('#status').textContent = 'The original layout is active.'; return; }
    if (pageStatus?.fallback) {
      $('#status').textContent = site === 'x' ? 'This virtual timeline uses one column for continuous scrolling.' : 'Open a post to see its caption and native controls.'; return;
    }
    $('#status').textContent = pageStatus?.count ? 'Layout applied. Likes, replies and media use native controls.' : 'Waiting for page content…';
  };
  function render() {
    L.setUITheme(preferences.theme);
    $('#enabled').checked = mode === 'transformed';
    $('#enabled').disabled = !connected || busy;
    document.querySelectorAll('[data-mode]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.mode === mode)); button.disabled = !connected || busy; });
    document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === preferences.theme)));
    document.querySelectorAll('[data-columns]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.columns) === preferences.columns)));
    $('#active-label').textContent = mode === 'transformed' ? 'Enabled' : 'Original layout';
    const photoFeed = site === 'x' && mode === 'transformed' && pageStatus?.route === 'home';
    const gallery = site === 'x' ? mode === 'transformed' : mode !== 'transformed';
    $('#preview-art').className = `preview-art ${photoFeed ? 'photo-feed' : gallery ? 'gallery' : 'timeline'} ${mode === 'original' ? 'native' : ''}`;
    describe();
  }
  async function setMode(next) {
    if (busy || !connected) return;
    busy = true;
    render();
    try {
      // Persist first: storage failure must not silently leave a temporary layout.
      await L.Storage.setMode(site, next);
      pageStatus = await chrome.tabs.sendMessage(tab.id, { type: 'LAYRLY_MODE', mode: next });
      mode = next;
    } catch { connected = false; showError('Refresh the page and try again.'); }
    finally { busy = false; render(); }
  }
  $('#settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('#enabled').addEventListener('change', event => setMode(event.target.checked ? 'transformed' : 'original'));
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  document.querySelectorAll('[data-theme], [data-columns]').forEach(button => button.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      preferences = await L.Storage.updatePreferences(button.dataset.theme ? { theme: button.dataset.theme } : { columns: Number(button.dataset.columns) });
      render();
    } catch { showError('Could not save settings. Try again.'); }
    finally { busy = false; render(); }
  }));
  async function init() {
    try {
      ({ preferences } = await L.Storage.read());
      L.setUITheme(preferences.theme);
      [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      site = L.detectSite(tab?.url);
      $('#supported').hidden = !site;
      $('#unsupported').hidden = !!site;
      $('#site-name').textContent = site === 'x' ? 'X / Twitter' : site === 'instagram' ? 'Instagram' : 'Unsupported site';
      $('#site-description').textContent = site ? 'Layout for this tab' : 'Available on X and Instagram';
      $('#site-icon').textContent = site === 'x' ? '𝕏' : site === 'instagram' ? '◎' : '↗';
      if (!site) return;
      $('#original-name').textContent = site === 'x' ? 'Original X' : 'Original Instagram';
      $('#transformed-name').textContent = site === 'x' ? 'Instagram Layout' : 'X Layout';
      $('#transformed-caption').textContent = site === 'x' ? 'Single column · media first' : 'Compact timeline';
      $('#transformed-mini').classList.remove('mini-gallery');
      $('#transformed-mini').classList.add('mini-timeline');
      $('#columns-row').hidden = site !== 'x';
      try { pageStatus = await chrome.tabs.sendMessage(tab.id, { type: 'LAYRLY_STATUS' }); connected = !!pageStatus; } catch { /* New installs need a page refresh. */ }
      const { values } = await L.Storage.read();
      mode = pageStatus?.mode || L.Storage.resolveMode(site, values, preferences);
      render();
    } catch { $('#site-name').textContent = 'Settings unavailable'; showError('Close and reopen the popup.'); }
  }
  init();
})();
