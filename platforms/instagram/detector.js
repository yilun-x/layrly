(() => {
  const L = globalThis.Layrly;
  L.Instagram = {
    main: () => document.querySelector('main, [role="main"]'),
    posts: (main) => [...main.querySelectorAll('article')].filter(post => !post.parentElement.closest('article')),
    postLinks: (main) => [...main.querySelectorAll('a[href]')].filter(link => /^\/(p|reel)\/[^/]+\/?$/.test(link.getAttribute('href')) && link.querySelector('img, video'))
  };
})();
