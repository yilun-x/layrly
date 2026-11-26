(() => {
  const L = globalThis.Layrly;
  L.X = {
    main: () => document.querySelector('[data-testid="primaryColumn"]'),
    posts: (main) => [...main.querySelectorAll('article[data-testid="tweet"]')].filter(post => !post.parentElement.closest('article')),
    media: (post) => [...post.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]')].filter(media => !media.closest('[role="link"]')?.querySelector('article')),
    isVirtual: (node) => {
      const style = getComputedStyle(node);
      return ['absolute', 'fixed'].includes(style.position) || style.transform !== 'none' || (node.parentElement && getComputedStyle(node.parentElement).position === 'absolute');
    }
  };
})();
