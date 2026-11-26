(() => {
  'use strict';
  const L = globalThis.Layrly = globalThis.Layrly || {};
  L.detectSite = (url) => {
    try {
      const { hostname, protocol } = new URL(url);
      if (protocol !== 'https:') return null;
      if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(hostname)) return 'x';
      if (['instagram.com', 'www.instagram.com'].includes(hostname)) return 'instagram';
    } catch { /* An unsupported browser tab has no usable URL. */ }
    return null;
  };
  L.detectRoute = (site, path) => {
    const parts = path.split('/').filter(Boolean);
    if (site === 'x') {
      if (!parts.length || path === '/home' || path === '/home/') return 'home';
      if (parts[0] === 'notifications' && (parts.length === 1 || (parts.length === 2 && ['mentions','verified','all'].includes(parts[1])))) return 'notifications';
      if (['explore', 'search'].includes(parts[0])) return 'explore';
      if ((parts.length === 3 && parts[1] === 'status' && /^\d+$/.test(parts[2])) || /^\/i\/web\/status\/\d+\/?$/.test(path)) return 'detail';
      const reserved = ['i', 'intent', 'compose', 'messages', 'notifications', 'settings', 'login', 'logout', 'signup', 'tos', 'privacy', 'jobs', 'about', 'account', 'oauth', 'download', 'communities'];
      if (!reserved.includes(parts[0]) && /^[\w]{1,15}$/.test(parts[0]) && (parts.length === 1 || (parts.length === 2 && ['with_replies', 'media', 'likes', 'highlights', 'articles'].includes(parts[1])))) return 'profile';
    }
    if (site === 'instagram') {
      if (!parts.length) return 'home';
      if (parts[0] === 'explore') return 'explore';
      if (['p', 'reel'].includes(parts[0]) && parts.length === 2) return 'detail';
      const reserved = ['direct', 'accounts', 'reels', 'stories', 'notifications', 'your_activity', 'settings', 'about', 'legal', 'challenge', 'emails', 'developer', 'web', 'oauth'];
      if (!reserved.includes(parts[0]) && /^[\w.]+$/.test(parts[0]) && (parts.length === 1 || (parts.length === 2 && ['reels', 'tagged', 'saved'].includes(parts[1])))) return 'profile';
    }
    return 'native';
  };
})();
