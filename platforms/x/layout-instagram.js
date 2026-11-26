(() => {
  const L = globalThis.Layrly;
  function childContaining(parent, node) {
    if (!node || !parent || parent === node || !parent.contains(node)) return null;
    while (node.parentElement !== parent) node = node.parentElement;
    return node;
  }

  function formatPost(marks, post) {
    const author = post.querySelector('[data-testid="User-Name"]');
    const authorLink = author?.querySelector('a[href]:not([href*="/status/"])');
    if (authorLink) marks.set(authorLink, 'data-layrly-author');
    const avatar = post.querySelector('[data-testid="Tweet-User-Avatar"]');
    const text = post.querySelector('[data-testid="tweetText"]');
    const media = post.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]');
    const actions = [...post.querySelectorAll('[role="group"]')].at(-1);
    let row = avatar?.parentElement;
    while (row && row !== post && !row.contains(author)) row = row.parentElement;
    const body = childContaining(row, author);
    const picture = childContaining(row, avatar);
    const hasRow = row && row !== post && body && picture && body !== picture && row.children.length === 2 && (!text || body.contains(text)) && (!media || body.contains(media));
    if (hasRow) {
      marks.set(row, 'data-layrly-post-row');
      marks.set(body, 'data-layrly-post-content');
      marks.set(picture, 'data-layrly-avatar');
      marks.set(childContaining(body, author), 'data-layrly-byline');
    }
    if (actions) {
      const selectors = {
        like: '[data-testid="like"], [data-testid="unlike"]',
        reply: '[data-testid="reply"]',
        repost: '[data-testid="retweet"], [data-testid="unretweet"]',
        share: '[data-testid="share"], [aria-label*="share" i], [aria-label*="分享"]',
        save: '[data-testid="bookmark"], [data-testid="removeBookmark"]'
      };
      for (const [name, selector] of Object.entries(selectors)) {
        const control = actions.querySelector(selector);
        const branch = childContaining(actions, control);
        if (!branch) continue;
        marks.set(branch, 'data-layrly-action', name);
        marks.set(control, 'data-layrly-glyph', name);
      }
    }
    const mediaRoot = media?.closest('a[href*="/photo/"], [data-testid="videoPlayer"]') || media ||
      post.querySelector('[data-testid="card.wrapper"], video, [data-testid="poll"]');
    const attr = new Map([[author,'byline'],[mediaRoot,'photo'],[actions,'actions'],[text,'caption']]);
    attr.delete(null); attr.delete(undefined);
    const layout = hasRow ? body : post;
    if (layout === post) marks.set(layout, 'data-layrly-feed-stack');
    let captionBranch;
    function assign(parent) {
      for (const child of parent.children) {
        const parts = [...attr.keys()].filter(node => child.contains(node));
        if (!parts.length) continue;
        // Only dissolve neutral layout wrappers. Keep native media, quoted links
        // and their complete interactive subtrees together.
        if (parts.length > 1 && !attr.has(child) && child.matches('div:not([role]), section, header')) {
          marks.set(child, 'data-layrly-pass');
          assign(child);
          continue;
        }
        const part = parts.includes(mediaRoot) ? 'photo' : attr.get(parts[0]);
        marks.set(child, 'data-layrly-' + part);
        if (part === 'caption') captionBranch = child;
      }
    }
    assign(layout);
    if (text && author) {
      const name = authorLink?.getAttribute('href')?.split('/')[1];
      if (name) marks.set(text, 'data-layrly-credit', name);
      const handle = [...author.querySelectorAll('a[href]')].find(link => link.textContent.trim().startsWith('@'));
      if (handle && handle !== authorLink) marks.set(handle, 'data-layrly-handle');
    }
    L.xFeed.poster(post, text, mediaRoot, captionBranch);

  }

  function homePage(marks, main, posts) {
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (sidebar && main.parentElement === sidebar.parentElement) marks.set(main.parentElement, 'data-layrly-columns-wrap');
    const timeline = main.querySelector('section:has(article), [aria-label]:has(> [data-testid="cellInnerDiv"])');
    const composer = main.querySelector('[data-testid="tweetTextarea_0"]');
    if (timeline && composer && document.querySelector('header a[href="/compose/post"]')) {
      let container = composer;
      while (container.parentElement !== main && !container.parentElement.contains(timeline)) container = container.parentElement;
      if (!container.contains(timeline) && !container.contains(document.activeElement) &&
          !container.querySelector('[role="tab"], [data-testid="attachments"], [data-testid="pollComposer"], [data-testid="tweetButtonInline"]:not([disabled]):not([aria-disabled="true"])') &&
          !composer.textContent.trim()) marks.set(container, 'data-layrly-empty-composer');
    }
    // Trim the home recommendation column only if its follow panel exists.
    const follow = sidebar?.querySelector('aside:has([data-testid="UserCell"]), aside[aria-label="Who to follow"]');
    L.xFeed.people(main, posts, follow);
    if (follow) {
      marks.set(follow, 'data-layrly-follow');
      let branch = follow;
      while (branch !== sidebar) {
        marks.set(branch.parentElement, 'data-layrly-follow-wrap');
        for (const sibling of branch.parentElement.children) {
          if (branch !== sibling && !sibling.matches('.layrly-owner') && !sibling.contains(document.activeElement)) marks.set(sibling, 'data-layrly-sidebar-extra');
        }
        branch = branch.parentElement;
      }
    }
  }
  L.applyX = (marks, route) => {
    const main = L.X.main();
    if (route === 'notifications') {
      L.xNavigation.cleanup();
      L.xFeed.clear();
      L.xNotifications.apply(marks, main);
      return { count: main?.querySelectorAll('[data-testid="cellInnerDiv"]').length || 0, fallback: false };
    }
    L.xNotifications.leave();
    if (!main) { L.xFeed.clear(); L.xNavigation.cleanup(); return { count: 0, fallback: false }; }
    L.xNavigation.apply(marks);

    marks.set(main, 'data-layrly-main');
    const posts = L.X.posts(main);
    L.xFeed.sweep(posts);
    if (route === 'home') {
      homePage(marks, main, posts);
    } else L.xFeed.clearPeople();
    L.xNavigation.foldExtras(marks, main, route);
    for (const post of posts) {
      marks.set(post, 'data-layrly-card');
      for (const media of L.X.media(post)) marks.set(media, 'data-layrly-media');
      formatPost(marks, post);
    }
    if (['home','detail'].includes(route)) return { count: posts.length, fallback: false };
    // Native profile /media rows often contain photo links instead of articles.
    if (route === 'profile' && /\/media\/?$/.test(location.pathname)) {
      for (const media of main.querySelectorAll('[data-testid="tweetPhoto"]')) {
        if (media.closest('article')) continue;
        marks.set(media, 'data-layrly-media');
        const link = media.closest('a[href*="/status/"]');
        if (!link) continue;
        marks.set(link, 'data-layrly-photo-link');
        let row = link.parentElement;
        for (let depth = 0; row && row !== main && depth < 3; depth++, row = row.parentElement) {
          const branches = [...row.children].filter(child => child.matches('a[href*="/status/"]') || child.querySelector('a[href*="/status/"]'));
          if (branches.length > 1 && !L.X.isVirtual(row) && !branches.some(L.X.isVirtual)) {
            marks.set(row, 'data-layrly-media-grid');
          }
        }
      }
    }
    // X virtualizes many timelines. Changing cell coordinates breaks scrolling;
    // keep those timelines in native flow and arrange each post's media instead.
    let fallback = false;
    const cells = [...main.querySelectorAll('[data-testid="cellInnerDiv"]')];
    const parents = new Set(cells.map(cell => cell.parentElement));
    for (const parent of parents) {
      const siblings = [...parent.children];
      if (siblings.length < 2) continue;
      const virtual = siblings.some(L.X.isVirtual);
      if (virtual) { fallback = true; continue; }
      const postCells = siblings.filter(cell => cell.querySelector('article[data-testid="tweet"]'));
      if (postCells.length < 2) continue;
      marks.set(parent, 'data-layrly-grid', route === 'explore' ? 'explore' : 'cards');
      for (const cell of siblings) marks.set(cell, 'data-layrly-cell', postCells.includes(cell) ? 'post' : 'full');
    }
    return { count: posts.length, fallback };
  };
})();
