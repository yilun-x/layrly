const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function core() {
  const saved = {};
  const context = vm.createContext({ URL, chrome: { storage: { local: {
    get: async keys => Object.fromEntries(keys.filter(key => key in saved).map(key => [key, saved[key]])),
    set: async values => Object.assign(saved, values),
    remove: async keys => keys.forEach(key => delete saved[key])
  } } } });
  for (const file of ['storage-manager.js', 'site-detector.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../core', file), 'utf8'), context);
  return { ...context.Layrly, saved };
}
test('site detection accepts only supported HTTPS hosts', () => {
  const { detectSite } = core();
  for (const host of ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']) assert.equal(detectSite(`https://${host}/home`), 'x');
  assert.equal(detectSite('https://www.instagram.com/'), 'instagram');
  for (const url of ['http://x.com/', 'https://x.com.evil.org/', 'https://notinstagram.com/', 'chrome://extensions', '', undefined]) assert.equal(detectSite(url), null);
});
test('routes protect account, messaging, compose, notifications, and settings flows', () => {
  const { detectRoute } = core();
  for (const route of ['/home', '/']) assert.equal(detectRoute('x', route), 'home');
  for (const route of ['/explore', '/search']) assert.equal(detectRoute('x', route), 'explore');
  for (const route of ['/designer', '/designer/media', '/designer/with_replies']) assert.equal(detectRoute('x', route), 'profile');
  for (const route of ['/designer/status/123', '/i/web/status/123']) assert.equal(detectRoute('x', route), 'detail');
  for (const path of ['/notifications','/notifications/mentions','/notifications/verified']) assert.equal(detectRoute('x', path), 'notifications');
  for (const route of ['/messages', '/i/chat', '/compose/post', '/settings', '/notifications/preferences', '/i/flow/login', '/intent/tweet']) assert.equal(detectRoute('x', route), 'native');
  for (const route of ['/direct/inbox', '/accounts/login', '/stories/test/123', '/reels/', '/challenge/']) assert.equal(detectRoute('instagram', route), 'native');
  assert.equal(detectRoute('instagram', '/explore/'), 'explore');
  assert.equal(detectRoute('instagram', '/design.studio/'), 'profile');
  assert.equal(detectRoute('instagram', '/design.studio/tagged/'), 'profile');
  assert.equal(detectRoute('instagram', '/p/abc/'), 'detail');
});
test('settings normalize untrusted storage and clamp numeric CSS values', () => {
  const { Storage } = core();
  assert.equal(Storage.normalize(null).theme, 'light');
  assert.equal(Storage.normalize('corrupt').columns, 3);
  const result = Storage.normalize({ theme: 'bad', columns: 999, width: '2000; color:red', gap: -8, ratio: 'bad', remember: 'false', defaultX: 'bad' });
  assert.equal(result.theme, 'light');
  assert.equal(result.columns, 4);
  assert.equal(result.width, 1120);
  assert.equal(result.gap, 8);
  assert.equal(result.ratio, 'original');
  assert.equal(result.remember, true);
  assert.equal(result.defaultX, 'original');
});
test('per-platform preferences, remember behavior and reset use only local keys', async () => {
  const { Storage, saved } = core();
  await Storage.setMode('x', 'transformed');
  await Storage.setMode('instagram', 'original');
  let { values, preferences } = await Storage.read();
  assert.equal(Storage.resolveMode('x', values, preferences), 'transformed');
  assert.equal(Storage.resolveMode('instagram', values, preferences), 'original');
  preferences = await Storage.updatePreferences({ remember: false, defaultInstagram: 'transformed' });
  assert.equal(Storage.resolveMode('x', values, preferences), 'original');
  assert.equal(Storage.resolveMode('instagram', values, preferences), 'transformed');
  await assert.rejects(Storage.setMode('unknown', 'transformed'));
  saved.unrelated = true;
  await Storage.reset();
  assert.deepEqual(Object.keys(saved), ['unrelated']);
});
