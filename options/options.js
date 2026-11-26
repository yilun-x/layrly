(() => {
  'use strict';
  const L = globalThis.Layrly;
  const form = document.getElementById('preferences');
  const state = document.getElementById('save-state');
  const reset = document.getElementById('reset');
  let preferences;
  let queue = Promise.resolve();
  let resetTimer;
  let confirming = false;
  function render() {
    L.setUITheme(preferences.theme);
    for (const [key, value] of Object.entries(preferences)) {
      const input = form.elements.namedItem(key);
      if (!input || document.activeElement === input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
    }
    for (const name of ['width', 'gap']) document.getElementById(`${name}-value`).value = `${preferences[name]} px`;
    document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === preferences.theme)));
  }
  function save(patch) {
    state.textContent = 'Saving…';
    // Serialize writes so rapid sliders and switches cannot overwrite one another.
    queue = queue.then(async () => {
      preferences = await L.Storage.updatePreferences(patch);
      render();
      state.classList.remove('error');
      state.textContent = '✓ Changes saved locally';
    }).catch(() => { state.textContent = 'Could not save. Try again.'; state.classList.add('error'); });
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.type === 'range') document.getElementById(`${input.name}-value`).value = `${input.value} px`;
  });
  form.addEventListener('change', event => {
    const input = event.target;
    if (!input.name) return;
    save({ [input.name]: input.type === 'checkbox' ? input.checked : ['columns', 'width', 'gap'].includes(input.name) ? Number(input.value) : input.value });
  });
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => save({ theme: button.dataset.theme })));
  reset.addEventListener('click', async () => {
    if (!confirming) {
      confirming = true;
      reset.textContent = 'Click again to confirm';
      resetTimer = setTimeout(() => { confirming = false; reset.textContent = 'Restore defaults'; }, 5000);
      return;
    }
    clearTimeout(resetTimer);
    reset.disabled = true;
    await queue;
    try {
      await L.Storage.reset();
      preferences = L.Storage.normalize();
      render();
      state.textContent = '✓ Defaults restored';
      state.classList.remove('error');
    } catch { state.textContent = 'Could not restore defaults. Try again.'; state.classList.add('error'); }
    finally { confirming = false; reset.disabled = false; reset.textContent = 'Restore defaults'; }
  });
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes['layrly.preferences']) {
      preferences = L.Storage.normalize(changes['layrly.preferences'].newValue);
      render();
    }
  });
  L.Storage.read().then(data => {
    preferences = data.preferences;
    render();
    state.textContent = '✓ Settings saved locally';
  }).catch(() => {
    state.textContent = 'Could not read settings. Reopen this page.';
    form.querySelectorAll('input, select, button').forEach(input => { input.disabled = true; });
  });
})();
