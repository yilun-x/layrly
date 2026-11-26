# Contributing to Layrly

The X home timeline is the baseline. If you are working on another route, check that switching back to the original layout still restores the native page and preserves its controls.

## Run the checks

Use Node.js 20 or newer. From the repository root run:

```sh
npm run check
npm test
```

For the browser suite, install Playwright as a local development tool and download its Chromium build:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run test:browser
```

The suite loads the unpacked extension into a temporary Chrome profile and intercepts platform URLs with local fixtures. On macOS it prefers an installed Google Chrome. Set `CHROME_PATH` to select another compatible browser executable, or `PLAYWRIGHT_MODULE` to use an existing Playwright installation. Screenshots are written to `artifacts/`.

To try a change in your own browser, click **Reload** on the extension card, then refresh the site tab. For distribution, run `npm run package` with Python 3 installed. The ZIP in `dist/` contains the extension and its license.

## Submit a change

Describe the affected route and the steps that reproduce the issue. For a visual change, a cropped before/after image using test data makes review easier. Add a fixture or assertion when it captures a regression. Note which checks you ran and which behaviors still need testing on the live site.
