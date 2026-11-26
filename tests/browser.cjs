/* Real unpacked extension + Chrome storage/messaging, with local platform fixtures.
   These tests do not access a social account or make platform requests. */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { launch } = require('./load-extension.cjs');
const fixture = require('./fixtures.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const { context, id, close } = await launch();
  const errors = [];
  let passed = 0;
  const check = message => { passed++; console.log(`✓ ${message}`); };
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  let xVirtual = false;
  await context.route(/^https:\/\/(www\.)?(x\.com|instagram\.com)\//, route => {
    const url = new URL(route.request().url());
    const html = url.hostname.endsWith('x.com') ? fixture.x(xVirtual) : fixture.instagram(/studio|explore/.test(url.pathname));
    return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  });
  const extension = await context.newPage();
  const extensionURL = `chrome-extension://${id}`;
  try {
    await extension.goto(`${extensionURL}/options/options.html`);
    await extension.waitForFunction(() => document.getElementById('save-state').textContent.includes('✓'));
    assert.equal(await extension.locator('#remember').isChecked(), true);
    check('Manifest loads; options use real Chrome local storage');
    const set = values => extension.evaluate(values => chrome.storage.local.set(values), values);
    const get = () => extension.evaluate(() => chrome.storage.local.get(null));
    const send = (tabId, message) => extension.evaluate(({ tabId, message }) => chrome.tabs.sendMessage(tabId, message), { tabId, message });
    async function findTab(site) {
      return extension.evaluate(async site => {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          try {
            const status = await chrome.tabs.sendMessage(tab.id, { type: 'LAYRLY_STATUS' });
            if (status.site === site) return { id: tab.id, status };
          } catch {}
        }
        throw new Error(`No content script for ${site}`);
      }, site);
    }
    const x = await context.newPage();
    await x.goto('https://x.com/home');
    assert.equal(await x.locator('html').getAttribute('data-layrly'), null);
    const xTab = await findTab('x');
    await set({ 'layrly.x': 'transformed' });
    await x.waitForSelector('html[data-layrly="x"] [data-layrly-card]');
    assert.equal(await x.locator('[data-layrly-card]').count(), 6);
    assert.equal(await x.locator('[data-layrly-grid]').count(), 0);
    const boxes = await x.locator('article').evaluateAll(posts => posts.map(post => post.getBoundingClientRect().toJSON()));
    assert.ok(boxes.every((b, i) => b.width === 470 && b.x === boxes[0].x && (!i || b.y >= boxes[i-1].bottom)));
    const vertical = await x.locator('article').first().evaluate(post => ['User-Name', 'tweetPhoto', 'group', 'tweetText'].map(key => post.querySelector(key === 'group' ? '[role=group]' : '[data-testid="' + key + '"]').getBoundingClientRect().top));
    assert.ok(vertical.every((y, i) => !i || y > vertical[i-1]), vertical.join(', '));
    const textPost = x.locator('article').nth(1);
    const poster = textPost.locator('canvas.layrly-text-photo');
    assert.equal(await poster.count(), 1);
    const posterBounds = await poster.boundingBox();
    assert.ok(posterBounds.height >= 469);
    const caption = await textPost.locator('[data-testid="tweetText"]').boundingBox();
    assert.ok(caption.y >= posterBounds.y + posterBounds.height);
    await textPost.locator('[data-testid="tweetText"]').evaluate(el => { el.textContent += ' Updated.'; });
    await x.waitForTimeout(160);
    assert.equal(await poster.count(), 1);
    assert.equal(await x.locator('[data-testid="chat-drawer-main"]').isVisible(), false);
    assert.equal(await x.locator('main [role="tablist"]').isVisible(), false);
    const before = await x.locator('article').first().evaluate(el => ({
      size: getComputedStyle(el.querySelector('[data-testid="tweetText"]')).fontSize,
      border: getComputedStyle(el).borderBottomWidth,
      icon: el.querySelector('[data-testid="like"] svg').getBoundingClientRect().width,
      share: getComputedStyle(el.querySelector('[data-testid="share"] svg')).maskImage
    }));
    assert.equal(before.size,'15px'); assert.equal(before.border,'0px'); assert.equal(before.icon,24); assert.notEqual(before.share,'none');
    check('Text tweets render as local images above captions; icon sizes, font and borders match reference measurements');
    const type = await x.locator('article').first().evaluate(post => {
      return ['[data-layrly-author] span', 'time', '[data-testid="tweetText"]', '[data-testid="like"] span'].map(selector => {
        const style = getComputedStyle(post.querySelector(selector));
        return [style.fontFamily, style.fontSize, style.lineHeight, style.fontWeight, style.letterSpacing];
      });
    });
    const family = '-apple-system, "system-ui", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    assert.deepEqual(type, ['600','400','400','600'].map(weight => [family,'15px','18px',weight,'normal']));
    check('Author, timestamp, caption and counter use the reference face, size, leading and weight');

    const rail = x.locator('#layrly-x-rail');
    await x.setViewportSize({width:1470, height:775});
    const positions = () => rail.locator('[data-item]').evaluateAll(items => items.map(item => {
      const glyph = item.querySelector('img') || item.querySelector('svg');
      const {x,y,width,height} = glyph.getBoundingClientRect();
      const hit = item.getBoundingClientRect();
      return [item.dataset.item,x,y,width,height,hit.width,hit.height];
    }));
    const keys = ['brand','home','video','chat','search','notifications','compose','studio','profile','more','products'];
    const referenceY = [40,147.5,203.5,259.5,315.5,371.5,427.5,483.5,539.5,655,711];
    assert.deepEqual(await positions(), keys.map((key,i) => [key,24,referenceY[i],24,24,48,56]));
    await x.setViewportSize({width:1470,height:719});
    assert.deepEqual((await positions()).map(item => item[2]), referenceY.map((y,i) => y - (i === 0 ? 0 : i >= 9 ? 56 : 28)));
    const homeIcon = rail.locator('[data-item="home"]');
    assert.equal(await homeIcon.locator('[data-state="current"]').isVisible(),true);
    assert.equal(await homeIcon.locator('[data-state="idle"]').isVisible(),false);
    const footprint = await rail.locator('[data-item="search"] svg [data-state="idle"]').evaluate(path => {
      const box = path.getBBox();
      const style = getComputedStyle(path);
      const bounds = [box.x,box.y,box.width,box.height].map(value => Number(value.toFixed(3)));
      return [...bounds,style.strokeWidth,style.fill];
    });
    assert.deepEqual(footprint,[2,2,20,20,'2px','none']);
    assert.equal(await rail.locator('[data-item="products"]').getAttribute('href'),'https://www.instagram.com/');
    check('Desktop rail matches all eleven glyph positions and hit areas at the reference window size and tracks a height change');
    const notificationHeart = rail.locator('[data-item="notifications"]');
    const nativeNotificationLink = x.locator('header nav a[href="/notifications"]');
    await nativeNotificationLink.evaluate(a => a.setAttribute('aria-label','Notifications (1 unread notification)'));
    await x.waitForSelector('#layrly-x-rail [data-layrly-unread]');
    assert.equal(await notificationHeart.evaluate(el=>getComputedStyle(el,'::after').width), '8px');
    await nativeNotificationLink.evaluate(a => a.setAttribute('aria-label','No unread notifications'));
    await x.waitForFunction(()=>!document.querySelector('#layrly-x-rail [data-layrly-unread]'));
    await x.evaluate(()=>scrollTo(0,180));
    const priorScroll = await x.evaluate(()=>scrollY);
    await notificationHeart.click();
    await x.waitForSelector('html[data-layrly-route="notifications"] .layrly-notice-close');
    await x.locator('main').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
    const noticeBox = await x.locator('main').boundingBox();
    assert.equal(noticeBox.x,0); assert.equal(noticeBox.width,460);
    assert.equal(await x.locator('[data-layrly-notice-period]').count(),2);
    assert.equal(await x.locator('[data-layrly-notice-body]').count(),2);
    assert.equal(await x.locator('[data-testid="notification"] a[href="/formarchive/status/1"]').isVisible(),true);
    await x.getByRole('tab',{name:'Mentions'}).click();
    await x.waitForURL('**/notifications/mentions');
    await x.keyboard.press('Escape');
    await x.waitForURL('**/home');
    await x.waitForFunction(()=>document.activeElement?.dataset.item==='notifications');
    assert.equal(await x.evaluate(()=>scrollY),priorScroll);
    assert.equal(await notificationHeart.getAttribute('data-layrly-unread'), null);
    await notificationHeart.click();
    await x.waitForSelector('.layrly-notice-preview');
    await x.mouse.click(900,300);
    await x.waitForURL('**/home');
    await notificationHeart.waitFor();
    check('Native unread changes update the dot; notification filters, dated rows, outside click, Escape, scroll and focus restoration work');
    const more = x.locator('#layrly-x-rail button');
    const grok = x.locator('header nav a[href="/i/grok"]');
    assert.equal(await grok.isVisible(), false);
    await more.click();
    assert.equal(await grok.isVisible(), true);
    assert.equal(await more.locator('[data-state="current"]').isVisible(), true);
    await x.locator('.layrly-extra-menu').getByText('Following', {exact:true}).click();
    assert.equal(await more.getAttribute('aria-expanded'),'false');
    await more.click();
    for (const label of ['Chat','Grok window','Grok actions','View post analytics']) {
      assert.equal(await x.locator('.layrly-extra-menu').getByText(label,{exact:true}).count(),1);
    }
    assert.equal(await x.locator('header nav a[href="/home"]').isVisible(), false);
    await x.evaluate(() => document.querySelector('#timeline').append(document.createElement('div')));
    await x.waitForTimeout(180);
    assert.equal(await more.getAttribute('aria-expanded'), 'true');
    await x.keyboard.press('Escape');
    assert.equal(await grok.isVisible(), false);
    assert.ok(await more.evaluate(el => el === document.activeElement));
    await more.click();
    await x.locator('[data-testid="tweetText"]').first().click();
    assert.equal(await more.getAttribute('aria-expanded'), 'false');
    assert.equal(await x.locator('[data-layrly-empty-composer]').isVisible(), false);
    await x.setViewportSize({width: 600, height: 800});
    assert.equal(await more.isVisible(), true);
    assert.equal(await grok.isVisible(), false);
    await more.click();
    assert.equal(await grok.isVisible(), true);
    await x.keyboard.press('Escape');
    await x.setViewportSize({width:1600, height:1000});
    const likeX = await x.locator('[data-testid="like"]').first().boundingBox();
    const replyX = await x.locator('[data-testid="reply"]').first().boundingBox();
    assert.ok(likeX.x < replyX.x);
    await more.click();
    await grok.click();
    await x.waitForURL('**/i/grok');
    assert.equal(await x.locator('#layrly-x-rail').count(), 0);
    await x.goBack();
    await more.waitFor();
    await x.locator('#layrly-x-rail [data-item="compose"]').click();
    await x.waitForURL('**/compose/post');
    await x.goBack();
    await more.waitFor();
    check('470px feed, native overflow navigation, keyboard dismissal and narrow layout');
    const postLike = x.locator('article').first().locator('.like');
    const heartPosition = () => postLike.evaluate(el=>{
      const b = el.getBoundingClientRect(), p = getComputedStyle(el,'::before');
      return [b.left + parseFloat(p.left),b.top + b.height/2,p.width,p.height];
    });
    await postLike.scrollIntoViewIfNeeded();
    const idlePosition = await heartPosition();
    await postLike.click();
    assert.equal(await postLike.getAttribute('data-testid'),'unlike');
    assert.deepEqual(await heartPosition(),idlePosition);
    assert.equal(await postLike.locator('.native-like-sprite').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    assert.equal(await postLike.evaluate(el=>getComputedStyle(el,'::before').backgroundColor),'rgb(255, 48, 64)');
    await postLike.click();
    assert.deepEqual(await heartPosition(),idlePosition);
    check('Heart stays anchored through native sprite replacement, 99 to 100 likes, and unlike');
    await x.locator('.like').first().click();
    assert.equal(await x.locator('.like').first().getAttribute('aria-pressed'), 'true');
    await x.locator('.comment').first().click();
    assert.equal(await x.locator('input[aria-label="Reply text"]').count(), 1);
    check('X home conversion keeps original like and comment handlers');

    await x.evaluate(html => document.getElementById('timeline').insertAdjacentHTML('beforeend', html), fixture.xPost(7));
    await x.waitForFunction(() => document.querySelectorAll('[data-layrly-card]').length === 7);
    check('MutationObserver transforms dynamically inserted posts');
    await x.evaluate(() => history.pushState({}, '', '/messages'));
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    assert.equal(await x.locator('[data-layrly-card]').count(), 0);
    assert.equal(await x.locator('#layrly-variables').count(), 0);
    await x.evaluate(() => history.pushState({}, '', '/designer/media'));
    await x.waitForSelector('html[data-layrly-route="profile"]');
    check('SPA routes restore native messaging and reapply on supported profiles');
    await send(xTab.id, { type: 'LAYRLY_MODE', mode: 'original' });
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    assert.equal(await x.locator('[data-testid="tweet"]').count(), 7);
    assert.equal(await x.locator('.like').first().getAttribute('aria-pressed'), 'true');
    assert.equal(await x.locator('[data-layrly-card], .layrly-text-photo, .layrly-owner, .layrly-people, .layrly-extra-menu, [data-layrly-grid], #layrly-variables').count(), 0);
    check('Disabling removes all extension marks while preserving nodes and state');
    await x.reload();
    await x.waitForSelector('html[data-layrly="x"]');
    check('Saved layout is restored after reload');

    xVirtual = true;
    await x.reload();
    await x.waitForSelector('[data-layrly-card]');
    assert.equal(await x.locator('[data-layrly-grid]').count(), 0);
    assert.equal((await send(xTab.id, { type: 'LAYRLY_STATUS' })).fallback, true);
    check('Virtualized X timelines retain native coordinates');
    xVirtual = false;
    await x.goto('https://x.com/designer/status/123');
    await x.waitForSelector('[data-layrly-photo]');
    const detailPhoto = await x.locator('[data-layrly-photo]').first().boundingBox();
    const detailCaption = await x.locator('[data-layrly-caption]').first().boundingBox();
    assert.ok(detailCaption.y >= detailPhoto.y + detailPhoto.height);
    check('X detail captions sit below native media');
    await x.goto('https://x.com/explore');
    await x.waitForSelector('[data-layrly-grid="explore"]');
    assert.equal(await x.locator('[data-layrly-grid="explore"]').evaluate(node => getComputedStyle(node).columnCount), '3');
    assert.equal(await homeIcon.locator('[data-state="idle"]').isVisible(), true);
    assert.equal(await rail.locator('[data-item="search"] [data-state="current"]').evaluate(path => getComputedStyle(path).strokeWidth), '3px');
    assert.equal(await rail.locator('[data-item="search"] [data-state="current"]').isVisible(),true);
    await rail.locator('[data-item="video"]').click();
    await x.waitForURL('**/search?**');
    await rail.locator('[data-item="video"][aria-current="page"]').waitFor();
    assert.equal(await rail.locator('[aria-current="page"]').count(),1);
    check('Explore and video search select their own icons while the home outline returns');
    await x.goto('https://x.com/home');
    await x.waitForSelector('[data-layrly-card]');
    await x.evaluate(async () => {
      const cell = document.createElement('div');
      cell.dataset.testid = 'cellInnerDiv';
      cell.innerHTML = '<article data-testid="tweet"><div data-testid="videoPlayer"><video id="playback-check" controls muted autoplay width="320" height="180"></video></div></article>';
      document.getElementById('timeline').append(cell);
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      canvas.getContext('2d').fillRect(0, 0, 320, 180);
      window.fixtureStream = canvas.captureStream(1);
      const video = document.getElementById('playback-check');
      video.srcObject = window.fixtureStream;
      await video.play();
    });
    await x.waitForSelector('[data-layrly-media] #playback-check');
    await send(xTab.id, { type: 'LAYRLY_MODE', mode: 'original' });
    assert.equal(await x.locator('#playback-check').evaluate(video => !video.paused && video.srcObject === window.fixtureStream && video.controls), true);
    await send(xTab.id, { type: 'LAYRLY_MODE', mode: 'transformed' });
    assert.equal(await x.locator('#playback-check').evaluate(video => !video.paused && video.srcObject === window.fixtureStream), true);
    check('Live native video and its controls survive both layout switches');

    const ig = await context.newPage();
    await set({ 'layrly.instagram': 'transformed' });
    await ig.goto('https://www.instagram.com/');
    await ig.waitForSelector('html[data-layrly="instagram"] [data-layrly-card]');
    const igTab = await findTab('instagram');
    assert.equal(await ig.locator('[data-layrly-card]').count(), 3);
    assert.equal(await ig.locator('[data-layrly-card]').first().evaluate(node => Math.round(node.getBoundingClientRect().width)), 660);
    assert.equal(await ig.locator('[data-layrly-caption]').first().evaluate(node => getComputedStyle(node).order), '1');
    await ig.locator('.like').first().click();
    assert.equal(await ig.locator('.like').first().getAttribute('aria-pressed'), 'true');
    await ig.locator('input[aria-label="Add a comment"]').first().fill('Native comment input works');
    check('Instagram becomes a compact timeline with functioning native controls');
    await ig.goto('https://www.instagram.com/design.studio/');
    await ig.waitForSelector('[data-layrly-thumbnail]');
    assert.equal(await ig.locator('[data-layrly-thumbnail]').count(), 6);
    assert.equal(await ig.locator('.ig-row').first().evaluate(node => getComputedStyle(node).flexDirection), 'column');
    const href = await ig.locator('[data-layrly-thumbnail]').first().getAttribute('href');
    assert.equal(href, '/p/post1/');
    check('Instagram profile grid becomes a list without replacing links');
    await ig.goto('https://www.instagram.com/explore/');
    await ig.waitForSelector('html[data-layrly-route="explore"] [data-layrly-thumbnail]');
    await ig.locator('[data-layrly-thumbnail]').first().click();
    await ig.waitForSelector('html[data-layrly-route="detail"] [data-layrly-card]');
    assert.equal(await ig.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    check('Explore list opens native post detail routes');

    await extension.bringToFront();
    await extension.selectOption('#columns', '4');
    await extension.locator('#width').fill('1280');
    await extension.locator('#width').dispatchEvent('change');
    await extension.locator('#gap').fill('28');
    await extension.locator('#gap').dispatchEvent('change');
    await extension.selectOption('#ratio', 'square');
    await extension.check('#hideSidebar');
    await extension.locator('[data-theme="dark"]').click();
    await extension.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await x.waitForFunction(() => document.documentElement.dataset.layrlyTheme === 'dark' && document.documentElement.dataset.layrlyColumns === '4');
    await ig.waitForFunction(() => getComputedStyle(document.querySelector('#recommendations')).display === 'none');
    let stored = await get();
    assert.equal(stored['layrly.preferences'].width, 1280);
    assert.equal(stored['layrly.preferences'].gap, 28);
    assert.equal(stored['layrly.preferences'].ratio, 'square');
    check('Settings writes are serialized and update all open platform tabs');

    await extension.uncheck('#remember');
    await extension.selectOption('#defaultInstagram', 'original');
    await extension.waitForFunction(async () => (await chrome.storage.local.get('layrly.preferences'))['layrly.preferences'].remember === false);
    await ig.reload();
    await ig.waitForTimeout(200);
    assert.equal(await ig.locator('html').getAttribute('data-layrly'), null);
    await send(igTab.id, { type: 'LAYRLY_MODE', mode: 'transformed' });
    await ig.waitForSelector('html[data-layrly="instagram"]');
    check('Remember-off uses default on reload and still allows live switching');

    const popup = await context.newPage();
    // Direct navigation does not invoke an extension action. Supply only that
    // action's active-tab result; messaging, storage, and content scripts stay real.
    await popup.addInitScript(({ tabId }) => {
      if (location.pathname.endsWith('/popup.html')) chrome.tabs.query = async () => [{ id: tabId, url: 'https://x.com/designer/status/123' }];
    }, { tabId: xTab.id });
    await popup.goto(`${extensionURL}/popup/popup.html`);
    await popup.waitForSelector('#supported:not([hidden])');
    await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
    await popup.locator('[data-mode="original"]').click();
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    await popup.locator('[data-mode="transformed"]').click();
    await x.waitForSelector('html[data-layrly="x"]');
    check('Popup mode cards use real storage and tab messaging');

    const artifacts = path.join(root, 'artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    await popup.setViewportSize({ width: 380, height: 790 });
    await popup.locator('[data-theme="light"]').click();
    await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
    await popup.locator('[data-mode="original"]').click();
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    await popup.locator('[data-mode="transformed"]').click();
    await x.waitForSelector('html[data-layrly="x"]');
    await popup.locator('#enabled').scrollIntoViewIfNeeded();
    await popup.locator('body').screenshot({ path: path.join(artifacts, 'popup.png') });
    assert.equal(await popup.locator('body').evaluate(node => node.getBoundingClientRect().height <= 600), true);
    await extension.evaluate(() => scrollTo(0, 0));
    await extension.screenshot({ path: path.join(artifacts, 'settings.png'), fullPage: true });
    await x.goto('https://x.com/home');
    await send(xTab.id, { type: 'LAYRLY_MODE', mode: 'transformed' });
    await x.waitForSelector('[data-layrly-post-row]');
    await x.setViewportSize({width:1470, height:775});
    await set({'layrly.preferences': { theme:'dark', remember:false }});
    await x.waitForFunction(() => document.documentElement.dataset.layrlyTheme === 'dark');
    await x.locator('[data-layrly-photo]').first().scrollIntoViewIfNeeded();
    const sampled = await x.locator('article').first().evaluate(el => [el.getBoundingClientRect().left,
      getComputedStyle(document.body).backgroundColor, getComputedStyle(document.querySelector('[data-testid="primaryColumn"]')).backgroundColor,
      getComputedStyle(el).backgroundColor, getComputedStyle(document.getElementById('layrly-x-rail')).backgroundColor]);
    assert.ok(Math.abs(sampled[0] - 309) <= 1, JSON.stringify(sampled));
    assert.deepEqual(sampled.slice(1), ['rgb(12, 16, 20)','rgb(12, 16, 20)','rgba(0, 0, 0, 0)','rgb(12, 16, 20)']);
    check('Dark home matches sampled background and feed coordinates at 1470px');
    const imageReady = await x.locator('[data-layrly-photo] img').first().evaluate(async img => { await img.decode(); return img.naturalWidth; });
    assert.ok(imageReady > 0);
    await x.locator('article').first().evaluate(post => post.scrollIntoView({block:'start'}));
    await x.screenshot({ path: path.join(artifacts, 'x-layout.png') });
    await x.locator('article').nth(1).evaluate(el => el.scrollIntoView({block:'start'}));
    await x.screenshot({ path: path.join(artifacts,'x-text-photo.png') });
    await x.evaluate(() => window.scrollTo(0,0));
    await x.locator('#layrly-x-rail button').click();
    await x.screenshot({path: path.join(artifacts,'x-more.png')});
    await x.keyboard.press('Escape');
    await nativeNotificationLink.evaluate(a=>a.setAttribute('aria-label','Notifications (1 unread notification)'));
    await x.waitForSelector('#layrly-x-rail [data-layrly-unread]');
    await x.screenshot({path:path.join(artifacts,'x-notification-dot.png')});
    await notificationHeart.click();
    await x.waitForSelector('[data-layrly-notice-body]');
    await x.locator('main').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished));});
    await x.screenshot({path:path.join(artifacts,'x-notifications.png')});
    await x.setViewportSize({width:390,height:750});
    assert.equal((await x.locator('main').boundingBox()).width,390);
    await x.locator('.layrly-notice-close').click();
    await notificationHeart.waitFor();
    await x.goto('https://x.com/notifications');
    await send(xTab.id,{type:'LAYRLY_MODE',mode:'transformed'});
    await x.waitForSelector('.layrly-notice-close');
    await send(xTab.id, {type:'LAYRLY_MODE',mode:'original'});
    assert.equal(await x.locator('.layrly-notice-close,.layrly-notice-preview,[data-layrly-notice-body]').count(),0);
    assert.equal(await x.locator('[data-testid="notification"]').count(),2);
    await send(xTab.id, {type:'LAYRLY_MODE',mode:'transformed'});
    await x.locator('.layrly-notice-close').click();
    await x.waitForURL('**/home');
    check('Narrow and directly opened notification views close normally; disabling restores the native list');

    await ig.goto('https://www.instagram.com/');
    await send(igTab.id, { type: 'LAYRLY_MODE', mode: 'transformed' });
    await ig.waitForSelector('[data-layrly-card]');
    await ig.screenshot({ path: path.join(artifacts, 'instagram-layout.png'), fullPage: true });
    await extension.setViewportSize({ width: 560, height: 900 });
    await extension.screenshot({ path: path.join(artifacts, 'settings-mobile.png'), fullPage: true });
    assert.equal(await extension.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    check('Extension UI renders without horizontal overflow at narrow widths');

    const unsupported = await context.newPage();
    await unsupported.goto(`${extensionURL}/popup/popup.html`);
    await unsupported.waitForSelector('#unsupported:not([hidden])');
    assert.equal(await unsupported.locator('#enabled').isDisabled(), true);
    check('Unsupported tabs show working platform links and disable layout controls');

    await extension.locator('#reset').click();
    await extension.locator('#reset').click();
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    await ig.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    stored = await get();
    assert.equal(Object.keys(stored).filter(key => key.startsWith('layrly.')).length, 0);
    assert.equal(await x.locator('[data-layrly-card], #layrly-variables').count(), 0);
    assert.equal(await x.evaluate(() => [...document.querySelectorAll('*')].some(node => [...node.attributes].some(attribute => attribute.name.startsWith('data-layrly')))), false);
    check('Reset clears only LAYRLY data and restores all open pages');
    await set({ 'layrly.preferences': { defaultX: 'transformed', remember: false } });
    await x.reload();
    await x.waitForSelector('html[data-layrly="x"]');
    await extension.locator('#reset').click();
    await extension.locator('#reset').click();
    await x.waitForFunction(() => !document.documentElement.hasAttribute('data-layrly'));
    check('Reset also restores tabs enabled by defaults without a saved mode key');
    assert.deepEqual(errors, []);
    console.log(`\n${passed} browser checks passed; no uncaught page errors. Screenshots: artifacts/`);
  } finally { await close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
