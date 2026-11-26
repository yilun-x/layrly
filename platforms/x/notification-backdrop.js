// X replaces its timeline when it opens Notifications. Keep only the visible
// fragments as an inert backdrop for that same-tab navigation, in memory.
(() => {
  const properties = (
    'display box-sizing flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self ' +
    'justify-content justify-self grid-template-columns grid-template-rows grid-column grid-row gap order ' +
    'width height min-width min-height max-width max-height padding margin overflow position inset ' +
    'border border-radius background-color background-image background-size background-position ' +
    'color font-family font-size font-weight line-height letter-spacing white-space overflow-wrap text-align ' +
    'text-overflow text-decoration object-fit object-position opacity visibility align-content mask-image mask-size mask-position mask-repeat'
  ).split(' ');

  function copy(source) {
    if (source.nodeType === Node.TEXT_NODE) return document.createTextNode(source.data);
    if (!(source instanceof Element) || source.matches('script,style,iframe,object,embed,input,textarea,form,link')) return null;
    const css = getComputedStyle(source);
    if (css.display === 'none' || css.visibility === 'hidden') return null;
    let node;
    if (source.matches('img,video,canvas')) {
      // Copy the decoded frame without reading pixels or starting another player.
      const rect = source.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      node = document.createElement('canvas');
      const scale = Math.min(devicePixelRatio, 2);
      const w = node.width = Math.max(1, Math.round(rect.width * scale));
      const h = node.height = Math.max(1, Math.round(rect.height * scale));
      const iw = source.videoWidth || source.naturalWidth || source.width;
      const ih = source.videoHeight || source.naturalHeight || source.height;
      if (iw && ih) {
        const fit = css.objectFit;
        let dw = w, dh = h;
        if (fit === 'cover' || fit === 'contain') {
          const factor = Math[fit === 'cover' ? 'max' : 'min'](w / iw, h / ih);
          dw = iw * factor; dh = ih * factor;
        }
        try { node.getContext('2d').drawImage(source, (w-dw)/2, (h-dh)/2, dw, dh); } catch { /* Undecoded media. */ }
      }
    } else if (source instanceof SVGElement) {
      if (!source.matches('svg,g,path,circle,rect,line,polyline,polygon,ellipse')) return null;
      node = document.createElementNS('http://www.w3.org/2000/svg', source.localName);
      for (const attr of ['viewBox','d','points','x','y','width','height','x1','y1','x2','y2','cx','cy','r','rx','ry','transform']) {
        if (source.hasAttribute(attr)) node.setAttribute(attr,source.getAttribute(attr));
      }
      for (const name of ['fill','stroke','stroke-width','stroke-linejoin','stroke-linecap','fill-rule']) node.style.setProperty(name,css.getPropertyValue(name));
    } else {
      node = document.createElement(source.matches('span,a,b,strong,small,time') ? 'span' : 'div');
    }
    for (const name of properties) node.style.setProperty(name,css.getPropertyValue(name));
    if (source.matches('img,video,canvas')) return node;
    if (source.hasAttribute('data-layrly-credit')) {
      const credit = document.createElement('strong');
      credit.textContent = source.getAttribute('data-layrly-credit') + ' ';
      node.append(credit);
    }
    for (const child of source.childNodes) {
      const part = copy(child);
      if (part) node.append(part);
    }
    return node;
  }

  globalThis.Layrly.captureNotificationBackdrop = () => {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden','true');
    host.className = 'layrly-notice-preview';
    const surface = host.attachShadow({mode:'closed'});
    const visible = document.querySelectorAll('main article[data-layrly-card],main .layrly-people,main [data-testid="sidebarColumn"],main [data-layrly-photo-link],main [data-testid="UserProfileHeader_Items"]');
    for (const item of visible) {
      const r = item.getBoundingClientRect();
      if (r.right <= 460 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight || !r.height || !r.width) continue;
      const node = copy(item);
      if (!node) continue;
      Object.assign(node.style, {position:'absolute', inset:'auto', left:r.x+'px', top:r.y+'px', width:r.width+'px',height:r.height+'px', boxSizing:'border-box', margin:'0'});
      surface.append(node);
    }
    return host;
  };
})();
