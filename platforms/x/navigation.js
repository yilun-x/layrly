(() => {
  const L = globalThis.Layrly;
  const desktop = matchMedia('(min-width: 700px)');
  const entries = [
    ['brand', 'h1 a[href="/home"]'],
    ['home', 'nav a[href="/home"]'],
    ['video', 'nav a[href="/i/videos"]'],
    ['chat', 'nav a:is([href="/i/chat"],[href="/messages"])'],
    ['search', 'nav a[href="/explore"]'],
    ['notifications', 'nav a[href="/notifications"]'],
    ['compose', 'a[href="/compose/post"]'],
    ['studio', 'nav a[href="/i/jf/creators/studio"]'],
    ['profile', 'nav a[data-testid="AppTabBar_Profile_Link"]']
  ];
  const videoSearchUrl = '/search?q=filter%3Avideos&f=video';
  let state;
  function toggle(open, restore = false) {
    if (!state) return;
    const { button, banner } = state;
    if (open) populateMenu();
    banner.toggleAttribute('data-layrly-open', open);
    button.setAttribute('aria-expanded', String(open));
    if (open) {
      const first = [...banner.querySelectorAll('nav a, nav button, nav [role="button"]')].find(node => node.getClientRects().length);
      first?.focus({ preventScroll: true });
    } else if (restore) button.focus({ preventScroll: true });
  }
  function cleanup() {
    if (!state) return;
    const { rail, events, banner } = state;
    events.abort();
    state.extra.remove();
    rail.remove();
    banner.removeAttribute('data-layrly-open');
    state = null;
  }
  function mount(banner) {
    const rail = document.createElement('nav');
    rail.id = 'layrly-x-rail';
    rail.setAttribute('aria-label', 'X');
    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'More';
    button.setAttribute('aria-label', 'More');
    button.setAttribute('aria-expanded', 'false');
    button.dataset.item = 'more';
    button.append(L.xRailIcon('more'));
    const primary = document.createElement('div');
    primary.className = 'layrly-rail-primary';
    const footer = document.createElement('div');
    footer.className = 'layrly-rail-footer';
    const products = document.createElement('a');
    products.dataset.item = 'products';
    products.href = 'https://www.instagram.com/';
    products.target = '_blank';
    products.rel = 'noopener noreferrer';
    products.title = 'Open Instagram in a new tab';
    products.setAttribute('aria-label', products.title);
    products.append(L.xRailIcon('products'));
    footer.append(button, products);
    rail.append(primary, footer);
    document.body.append(rail);
    const events = new AbortController();
    const opts = { signal: events.signal };
    const extra = document.createElement('div');
    extra.className = 'layrly-extra-menu';
    banner.append(extra);
    state = { rail, primary, banner, button, events, extra, links: new Map(), url: location.href };
    button.addEventListener('click', () => toggle(!banner.hasAttribute('data-layrly-open')), opts);
    document.addEventListener('pointerdown', event => {
      if (!rail.contains(event.target) && !banner.contains(event.target) && !event.target.closest('[role="menu"], [role="dialog"]')) toggle(false);
    }, { capture: true, ...opts });
    document.addEventListener('focusin', event => {
      if (!rail.contains(event.target) && !banner.contains(event.target) && !event.target.closest('[role="menu"], [role="dialog"]')) toggle(false);
    }, opts);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && banner.hasAttribute('data-layrly-open') && !document.querySelector('[role="menu"], [role="dialog"]')) {
        event.preventDefault();
        toggle(false, true);
      }
    }, opts);
    desktop.addEventListener('change', () => toggle(false), opts);
  }
  function activePost() {
    const posts = [...document.querySelectorAll('article[data-testid="tweet"]')];
    const y = innerHeight * .45;
    return posts.find(post => {
      const r = post.getBoundingClientRect();
      return r.top <= y && r.bottom > y;
    }) || posts.find(post => {
      const r = post.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    });
  }
  function populateMenu() {
    const panel = state.extra;
    panel.replaceChildren();
    function group(title, nodes, collapsible = false) {
      if (!nodes.length) return;
      const container = collapsible ? document.createElement('details') : panel;
      if (collapsible) panel.append(container);
      const heading = document.createElement(collapsible ? 'summary' : 'strong');
      heading.textContent = title;
      container.append(heading);
      for (const [label, target] of nodes) {
        const button = document.createElement(target.matches('a[href]') ? 'a' : 'button');
        if (button.tagName === 'A') button.href = target.href;
        else button.type = 'button';
        button.textContent = label;
        if (target.getAttribute('aria-selected') === 'true') button.setAttribute('aria-current','true');
        button.addEventListener('click', event => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          if (!target.isConnected) { toggle(false,true); return; }
          event.preventDefault(); toggle(false,true); target.click();
        });
        container.append(button);
      }
    }
    const label = el => el.getAttribute('aria-label') || el.textContent.trim();
    const tabs = [...document.querySelectorAll('[data-layrly-timeline-picker] [role="tab"], [data-layrly-timeline-picker] [data-testid="addButton"], [data-layrly-timeline-picker] button[aria-label*="timeline" i]')];
    group('Timeline', tabs.map(el => [label(el), el]));
    const launchers = [...document.querySelectorAll('[data-layrly-launcher]')];
    group('Quick access', launchers.map(el => [label(el), el]));
    const side = new Map();
    for (const el of document.querySelectorAll('[data-layrly-sidebar-extra] a[href], a[data-layrly-sidebar-extra][href]')) {
      const name = label(el);
      if (!name || side.has(el.href) || el.closest('footer, [role="contentinfo"]')) continue;
      side.set(el.href, [name.slice(0, 100), el]);
    }
    group('Sidebar links', [...side.values()], true);
    const post = activePost();
    if (post) {
      const handle = post.querySelector('[data-testid="User-Name"] a')?.getAttribute('href')?.slice(1);
      group(handle ? '@' + handle + ' · Current post' : 'Current post',
        [...post.querySelectorAll('[data-layrly-post-extra]')].map(el => [label(el), el]));
    }
  }

  function foldExtras(marks, main, route) {
    if (!state) return;
    const picker = [...main.querySelectorAll('[role="tablist"]')].find(list => list.querySelector('[role="tab"]') && !list.closest('article, [role="dialog"]'));
    if (route === 'home' && picker) {
      let node = picker.closest('nav') || picker;
      for (let parent = node; parent && parent !== main && !parent.querySelector('article, [contenteditable="true"]'); parent = parent.parentElement) {
        node = parent;
        if (getComputedStyle(parent).position === 'sticky') break;
      }
      marks.set(node, 'data-layrly-timeline-picker');
    }
    for (const el of document.querySelectorAll('[data-testid="GrokDrawerHeader"],[data-testid="chat-drawer-main"]')) marks.set(el, 'data-layrly-launcher');
    for (const el of main.querySelectorAll('article button[aria-label*="Grok" i],article a[href*="/analytics"]')) marks.set(el, 'data-layrly-post-extra');
  }
  L.xNavigation = {
    cleanup, foldExtras,
    apply(marks) {
      const banner = document.querySelector('header[role="banner"]');
      if (!banner?.querySelector('nav a[href="/home"]')) { cleanup(); return; }
      if (banner !== state?.banner || !state.rail.isConnected) { cleanup(); mount(banner); }
      const { rail, primary, links } = state;
      if (state.url !== location.href) { toggle(false); state.extra.replaceChildren(); state.url = location.href; }
      marks.set(banner, 'data-layrly-drawer');
      marks.set(document.documentElement, 'data-layrly-rail');
      const path = location.pathname.replace(/\/$/, '') || '/home';
      const params = new URLSearchParams(location.search);
      const isVideoSearch = path === '/search' && params.get('q') === 'filter:videos' && params.get('f') === 'video';
      for (const [key, selector] of entries) {
        const source = banner.querySelector(selector);
        let link = links.get(key);
        const videoSearch = key === 'video' && !source;
        if (!source && !videoSearch) { link?.remove(); links.delete(key); continue; }
        marks.set(source, 'data-layrly-shortcut');
        if (!link) {
          link = document.createElement('a');
          link.dataset.item = key;
          link.append(L.xRailIcon(key));
          link.addEventListener('click', event => {
            if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = banner.querySelector(selector);
            if (!target) return;
            event.preventDefault();
            toggle(false);
            if (key === 'notifications') L.xNotifications.prepare();
            target.click();
          });
          links.set(key, link);
        }
        // Insert in design order even when X mounts some links later.
        if (!link.isConnected) {
          const index = entries.findIndex(entry => entry[0] === key);
          const next = entries.slice(index + 1).map(entry => links.get(entry[0])).find(node => node?.isConnected);
          if (key === 'brand') rail.prepend(link);
          else primary.insertBefore(link, next || null);
        }
        if (key === 'profile') {
          const photo = banner.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] img')?.currentSrc;
          let img = link.querySelector('img');
          if (photo) {
            if (!img) { img = document.createElement('img'); img.alt = ''; link.append(img); }
            if (img.src !== photo) img.src = photo;
          } else img?.remove();
        }
        if (key === 'notifications') link.toggleAttribute('data-layrly-unread', L.xNotifications.hasUnread(source));
        link.href = source?.href || videoSearchUrl;
        const label = source?.getAttribute('aria-label') || source?.textContent.trim() || (videoSearch ? 'Video' : key === 'brand' ? 'X' : key);
        link.title = label;
        link.setAttribute('aria-label', label);
        const profileTab = key === 'profile' && L.detectRoute('x', path) === 'profile' && path.split('/')[1] === source?.pathname.slice(1);
        const searchPage = key === 'search' && path === '/search' && !isVideoSearch;
        const current = key !== 'brand' && (source?.pathname === path || profileTab || searchPage ||
          (key === 'video' && isVideoSearch) || (!isVideoSearch && source?.getAttribute('aria-current') === 'page'));
        if (current) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    }
  };
})();
