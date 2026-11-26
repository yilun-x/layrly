(() => {
  const L = globalThis.Layrly;
  let origin, preview, closeButton, events, closing = false;

  function hasUnread(link) {
    if (!link) return false;
    const labels = [link.getAttribute('aria-label') || ''];
    for (const element of link.querySelectorAll('[aria-label], div, span')) {
      const text = element.textContent.trim();
      if (/^[1-9]\d*\+?$/.test(text) && !element.childElementCount) return true;
      if (element.hasAttribute('aria-label')) labels.push(element.getAttribute('aria-label'));
    }
    return labels.some(label => /\b[1-9]\d*\+?\s+(?:(?:new|unread)\s+)?notifications?\b|[1-9]\d*\+?\s*(?:条|條|个|個)?\s*(?:新|未读|未讀)?通知|[（(]\s*[1-9]\d*\+?\s*[）)]/i.test(label) ||
      (/\bunread\b|未读|未讀/i.test(label) && !/\b(?:no|zero|0)\b|没有|沒有|无|無/.test(label.toLowerCase())));
  }

  function prepare() {
    const entry = window.navigation?.currentEntry;
    origin = {url:location.href, key:entry?.key, scroll:scrollY};
    try { preview = innerWidth > 460 ? L.captureNotificationBackdrop() : null; }
    catch { preview = null; }
  }

  async function close() {
    if (closing || !events) return;
    closing = true;
    const signal = events.signal;
    const main = document.querySelector('main[role="main"]');
    if (main && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frames = [{transform:'translateX(0)'},{transform:'translateX(-100%)'}];
      const animation = main.animate(frames,{duration:150,easing:'ease-in',fill:'forwards'});
      // Native SPA navigation can reuse this main element for the returning feed.
      signal.addEventListener('abort',() => animation.cancel(),{once:true});
      await animation.finished.catch(() => {});
    }
    if (signal.aborted || L.detectRoute('x',location.pathname) !== 'notifications') return;
    const back = origin;
    if (back?.key && window.navigation.entries().some(entry => entry.key === back.key)) {
      window.navigation.traverseTo(back.key).finished.catch(error => {
        if (!signal.aborted && error.name !== 'AbortError') location.assign(back.url);
      });
    } else {
      const home = document.querySelector('header nav a[href="/home"]');
      if (home) home.click();
      else location.assign('/home');
    }
  }

  function clear() {
    events?.abort();
    preview?.remove();
    closeButton?.remove();
    origin = preview = closeButton = events = null;
    closing = false;
  }

  function leave() {
    if (!events) return;
    const back = origin;
    clear();
    if (back?.url === location.href) {
      requestAnimationFrame(() => {
        if (back.url !== location.href || !document.documentElement.hasAttribute('data-layrly')) return;
        if (Math.abs(scrollY-back.scroll)>1) window.scrollTo({top:back.scroll,behavior:'instant'});
        document.querySelector('#layrly-x-rail [data-item="notifications"]')?.focus({preventScroll:true});
      });
    }
  }

  function dayLabel(stamp, lang) {
    const date = new Date(stamp);
    if (!stamp || Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const day = value => Date.UTC(value.getFullYear(),value.getMonth(),value.getDate());
    const age = (day(today)-day(date))/86400000;
    const zh = lang.startsWith('zh');
    if (age === 0) return zh ? '今天' : 'Today';
    if (age === 1) return zh ? '昨天' : 'Yesterday';
    if (age >= 2 && age < 7) return zh ? '近七天' : 'Last 7 days';
    if (age >= 7 && age < 30) return zh ? '近三十天' : 'Last 30 days';
    return zh ? '更早' : 'Earlier';
  }

  function apply(marks, main) {
    const lang = document.documentElement.lang || navigator.language;
    if (!events) {
      events = new AbortController();
      const options = {signal:events.signal};
      if (!preview) { preview = document.createElement('div'); preview.className = 'layrly-notice-preview'; }
      preview.setAttribute('aria-hidden','true');
      preview.addEventListener('click',close,options);
      preview.addEventListener('wheel',event => event.preventDefault(),{...options,passive:false});
      closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'layrly-notice-close';
      closeButton.setAttribute('aria-label',lang.startsWith('zh') ? '关闭通知' : 'Close notifications');
      closeButton.addEventListener('click',close,options);
      document.body.append(preview,closeButton);
      document.addEventListener('keydown',e => {
        if (e.key === 'Escape' && !document.querySelector('[role="dialog"],[role="menu"]')) {
          e.preventDefault(); close();
        }
      },options);
      closeButton.focus({preventScroll:true});
    }
    if (!main) return;
    const title = main.querySelector('h1,h2,[role="heading"]');
    if (title && !title.closest('[data-testid="cellInnerDiv"]')) marks.set(title,'data-layrly-notice-title');
    let previous = '';
    for (const cell of main.querySelectorAll('[data-testid="cellInnerDiv"]')) {
      const row = cell.querySelector('article');
      if (!row) continue;
      const label = dayLabel(row.querySelector('time[datetime]')?.dateTime,lang);
      if (label && label !== previous) marks.set(cell,'data-layrly-notice-period',label);
      if (label) previous = label;
      const actors = row.querySelector('ul:has(img),[role="list"]:has(img)');
      // X puts the avatar list in its own wrapper above the actor/action text.
      if (actors && row.matches('[data-testid="notification"]')) {
        let branch = actors;
        while (branch.parentElement && branch.parentElement !== row && branch.parentElement.childElementCount === 1) branch = branch.parentElement;
        if (branch.parentElement !== row && branch.parentElement?.querySelector('time, [dir]')) {
          marks.set(branch, 'data-layrly-notice-actors');
          marks.set(branch.parentElement, 'data-layrly-notice-body');
          const symbol = row.firstElementChild?.firstElementChild;
          if (symbol?.querySelector('svg') && !symbol.contains(actors)) marks.set(symbol,'data-layrly-notice-symbol');
        }
      }
    }
  }
  L.xNotifications = { hasUnread, prepare, apply, leave, clear };
})();
