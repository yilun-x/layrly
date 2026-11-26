(() => {
  const L = globalThis.Layrly;
  L.applyInstagram = (marks, route) => {
    const main = L.Instagram.main();
    if (!main) return { count: 0, fallback: false };
    marks.set(main, 'data-layrly-main');
    const posts = L.Instagram.posts(main);
    for (const aside of document.querySelectorAll('aside')) {
      if (!aside.closest('article, nav, header, [role="dialog"]') && !aside.querySelector('nav, [role="navigation"]')) marks.set(aside, 'data-layrly-recommendations');
    }
    for (const post of posts) {
      marks.set(post, 'data-layrly-card');
      const parent = post.parentElement;
      if (parent && !parent.closest('article')) marks.set(parent, 'data-layrly-feed');
      for (const media of post.querySelectorAll('video, img')) {
        // Small avatars and emoji keep their native dimensions.
        if (media.tagName === 'VIDEO' || Math.max(media.width, media.naturalWidth) > 150) marks.set(media, 'data-layrly-media');
      }
      // Prefer the caption above media only when native semantic boundaries make
      // it safe. Obfuscated / ambiguous structures keep their existing order.
      const caption = post.querySelector('[data-testid="post-caption"], h1, p');
      const media = post.querySelector('[data-layrly-media]');
      const header = post.querySelector('header');
      if (caption && media && header) {
        let body = caption.parentElement;
        while (body && body !== post && !body.contains(media)) body = body.parentElement;
        if (body) {
          const textBranch = [...body.children].find(child => child === caption || child.contains(caption));
          const mediaBranch = [...body.children].find(child => child === media || child.contains(media));
          const headerBranch = [...body.children].find(child => child === header || child.contains(header));
          if (textBranch && mediaBranch && textBranch !== mediaBranch && (!headerBranch || headerBranch !== textBranch)) {
            marks.set(body, 'data-layrly-reading-body');
            marks.set(textBranch, 'data-layrly-caption');
            marks.set(mediaBranch, 'data-layrly-embedded-media');
            if (headerBranch) marks.set(headerBranch, 'data-layrly-author');
          }
        }
      }
    }
    let thumbnails = 0;
    if (['profile', 'explore'].includes(route)) {
      const links = L.Instagram.postLinks(main).filter(link => !link.closest('[role="dialog"]'));
      for (const link of links) {
        marks.set(link, 'data-layrly-thumbnail');
        thumbnails++;
        // Preserve every link and row wrapper; flatten row layout using CSS only.
        let row = link.parentElement;
        for (let depth = 0; row && row !== main && depth < 4; depth++, row = row.parentElement) {
          const branches = [...row.children].filter(child => child.matches('a[data-layrly-thumbnail]') || child.querySelector('a[href^="/p/"], a[href^="/reel/"]'));
          if (branches.length > 1) {
            marks.set(row, 'data-layrly-list');
            for (const child of branches) marks.set(child, 'data-layrly-list-item');
          }
        }
      }
    }
    const header = route === 'profile' ? main.querySelector('header') : null;
    marks.set(header, 'data-layrly-profile');
    return { count: posts.length || thumbnails, fallback: thumbnails > 0 };
  };
})();
