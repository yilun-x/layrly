// Build additions only from content already rendered in this timeline.
(() => {
  const posters = new Map();
  let strip, ownerRow;
  const owned = node => node && node.isConnected;
  const avatarURL = node => node?.querySelector('img')?.currentSrc || node?.querySelector('img')?.src;
  function portrait(container, url, label) {
    if (url) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = url;
      container.append(image);
    } else container.textContent = Array.from(label)[0] || '·';
  }
  function people(main, posts, follow) {
    const section = posts[0]?.closest('section') || main.querySelector('[data-testid="cellInnerDiv"]')?.parentElement;
    if (!section || !main.contains(section)) { strip?.remove(); strip = null; return; }
    const selected = main.querySelector('[data-layrly-timeline-picker] [aria-selected="true"], nav [role="tab"][aria-selected="true"]');
    const key = selected?.textContent.trim() || '';
    if (!owned(strip) || !main.contains(strip) || strip.dataset.timeline !== key) {
      strip?.remove();
      strip = document.createElement('div');
      strip.className = 'layrly-people';
      strip.dataset.timeline = key;
      strip.setAttribute('role', 'navigation');
      strip.setAttribute('aria-label', 'Timeline authors');
      section.before(strip);
    }
    // The timeline is virtual. Keep the first screen's portraits stable as X recycles cells.
    for (const post of posts) {
      if (strip.childElementCount >= 9) break;
      const source = post.querySelector('[data-testid="User-Name"] a[href]');
      if (!source || source.origin !== location.origin || !/^\/[\w]{1,15}\/?$/.test(source.pathname)) continue;
      if ([...strip.children].some(entry => entry.pathname === source.pathname)) continue;
      const handle = source.pathname.split('/')[1];
      const link = document.createElement('a');
      link.href = source.href;
      link.title = handle;
      const ring = document.createElement('span');
      portrait(ring, avatarURL(post.querySelector('[data-testid="Tweet-User-Avatar"]')), handle);
      const name = document.createElement('small');
      name.textContent = handle;
      link.append(ring, name);
      strip.append(link);
    }
    const profile = document.querySelector('header [data-testid="AppTabBar_Profile_Link"]');
    const account = document.querySelector('header [data-testid="SideNav_AccountSwitcher_Button"]');
    if (!follow || !profile || !account) { ownerRow?.remove(); ownerRow = null; return; }
    if (ownerRow?.dataset.profile === profile.pathname && ownerRow.parentElement === follow.parentElement) return;
    ownerRow?.remove();
    ownerRow = document.createElement('div');
    ownerRow.className = 'layrly-owner';
    ownerRow.dataset.profile = profile.pathname;
    const link = document.createElement('a');
    link.href = profile.href;
    const photo = document.createElement('span');
    const handle = profile.pathname.slice(1);
    portrait(photo, avatarURL(account), handle);
    const label = document.createElement('strong');
    label.textContent = handle;
    link.append(photo, label);
    const change = document.createElement('button');
    change.type = 'button';
    change.textContent = document.documentElement.lang.startsWith('zh') ? '切换' : 'Switch';
    change.addEventListener('click', () => account.click());
    ownerRow.append(link, change);
    follow.before(ownerRow);
  }

  function draw(canvas, text, author) {
    // The original caption below remains selectable, accessible and untruncated.
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width = 940, h = canvas.height = 940;
    let hash = 0;
    for (const c of author) hash = (hash * 31 + c.codePointAt(0)) >>> 0;
    const colors = [['#e9e6db','#34352c'],['#dce7ed','#203a47'],['#e5e1ed','#3d3450'],['#dce9e0','#284137']];
    const [bg, ink] = colors[hash % colors.length];
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ink;
    const size = text.length < 60 ? 64 : 49;
    ctx.font = '500 ' + size + 'px system-ui, sans-serif';
    const lines = [];
    let line = '';
    for (const token of text.slice(0, 2400).match(/\n|[A-Za-z0-9’'-]+|[^\S\n]+|[^\s]/gu) || []) {
      if (token === '\n') { lines.push(line.trimEnd()); line = ''; }
      else if (ctx.measureText(line + token).width > w - 128 && line) { lines.push(line.trimEnd()); line = token.trimStart(); }
      else line += token;
      if (lines.length >= 8) break;
    }
    if (lines.length < 8 && line.trim()) lines.push(line.trim());
    else if (lines.length === 8) lines[7] = lines[7].trimEnd() + '…';
    const spacing = size * 1.42;
    ctx.textBaseline = 'middle';
    lines.forEach((value, i) => ctx.fillText(value, 64, (h - (lines.length - 1) * spacing) / 2 + i * spacing, w-128));
  }

  function poster(post, text, hasVisual, captionBranch) {
    const prior = posters.get(post);
    const content = text?.textContent.trim();
    if (hasVisual || !content || !captionBranch) {
      prior?.canvas.remove(); posters.delete(post); return;
    }
    const author = post.querySelector('[data-testid="User-Name"] a')?.textContent || '';
    const canvas = prior?.canvas || document.createElement('canvas');
    canvas.className = 'layrly-text-photo';
    canvas.setAttribute('aria-hidden', 'true');
    if (canvas.parentElement !== captionBranch.parentElement) captionBranch.before(canvas);
    if (!prior || prior.content !== content || prior.author !== author) draw(canvas, content, author);
    posters.set(post, {canvas, content, author});
  }
  function sweep(posts) {
    const live = new Set(posts);
    for (const [post, entry] of posters) {
      if (!live.has(post)) { entry.canvas.remove(); posters.delete(post); }
    }
  }
  function clearPeople() { strip?.remove(); ownerRow?.remove(); strip = ownerRow = null; }
  function clear() { sweep([]); clearPeople(); }
  globalThis.Layrly.xFeed = { people, poster, sweep, clearPeople, clear };
})();
