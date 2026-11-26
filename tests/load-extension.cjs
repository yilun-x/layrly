const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
function playwright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(Boolean);
  for (const candidate of candidates) { try { return require(candidate); } catch {} }
  throw new Error('Install playwright as a dev dependency, or set PLAYWRIGHT_MODULE.');
}
async function launch() {
  const { chromium } = playwright();
  const systemChrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined;
  const executablePath = process.env.CHROME_PATH || (systemChrome && fs.existsSync(systemChrome) ? systemChrome : undefined);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'layrly-test-'));
  const context = await chromium.launchPersistentContext(profile, { executablePath, headless: true, ignoreDefaultArgs: ['--disable-extensions'], args: ['--enable-unsafe-extension-debugging'], viewport: { width: 1600, height: 1000 } });
  const browser = context.browser();
  try {
    const cdp = await browser.newBrowserCDPSession();
    const { id } = await cdp.send('Extensions.loadUnpacked', { path: path.resolve(__dirname, '..') });
    const close = async () => { await context.close(); fs.rmSync(profile, { recursive: true, force: true }); };
    return { browser, context, id, cdp, close };
  } catch (error) { await context.close(); fs.rmSync(profile, { recursive: true, force: true }); throw error; }
}
module.exports = { launch };
if (require.main === module) launch().then(async ({ close, id }) => { console.log(`Loaded real extension: ${id}`); await close(); }).catch(error => { console.error(error); process.exitCode = 1; });
