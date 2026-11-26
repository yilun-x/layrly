// Layrly navigation glyphs, drawn on a local 24-unit grid.
(() => {
  const paths = {
    brand: 'm3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5',
    home: 'm2.5 11 9.5-8 9.5 8 M5 10v11h5v-6h4v6h5V10',
    homeCurrent: 'M1 11 12 2l11 9-2 2-2-1v10h-5v-7h-4v7H5V12l-2 1z',
    video: 'M6 3h12q3 0 3 3v12q0 3-3 3H6q-3 0-3-3V6q0-3 3-3z M10 8l6 4-6 4z',
    videoCurrent: 'M5 2h14q3 0 3 3v14q0 3-3 3H5q-3 0-3-3V5q0-3 3-3z M9 7v10l8-5z',
    chat: 'M3 4h18v13H9l-5 4v-4H3z M7 9h10 M7 12h6',
    search: 'M18 10a8 8 0 1 1-16 0 8 8 0 1 1 16 0z M16 16l6 6',
    searchCurrent: 'M18 10a8 8 0 1 1-16 0 8 8 0 1 1 16 0z M16 16l6 6',
    notifications: 'M12 21 4.3 13.2C-2 6.4 6.5-.4 12 6.5c5.5-6.9 14-.1 7.7 6.7z',
    compose: 'M12 3v18 M3 12h18',
    studio: 'M3 3v18h18 M7 16v-4 M12 16V7 M17 16v-6',
    profile: 'M16 8a4 4 0 1 1-8 0 4 4 0 1 1 8 0z M4 21a8 7 0 0 1 16 0',
    more: 'M3 5h18 M3 12h18 M3 19h18',
    moreCurrent: 'M3 5h18 M3 12h18 M3 19h18',
    products: 'M3 4h7v7H3z M14 4h7v7h-7z M3 15h7v6H3z M14 15h7v6h-7z'
  };
  const ns = 'http://www.w3.org/2000/svg';
  globalThis.Layrly.xRailIcon = name => {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    for (const key of [name, name + 'Current']) {
      if (!paths[key]) continue;
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', paths[key]);
      const solid = key === 'homeCurrent' || key === 'videoCurrent';
      path.setAttribute('fill', solid ? 'currentColor' : 'none');
      if (solid) path.setAttribute('fill-rule','evenodd');
      else {
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', key.endsWith('Current') ? '3' : '2');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
      }
      if (paths[name + 'Current']) path.dataset.state = key === name ? 'idle' : 'current';
      svg.append(path);
    }
    return svg;
  };
})();
