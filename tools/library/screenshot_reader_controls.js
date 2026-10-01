const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'mobile_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.addInitScript(() => {
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', 'active');
    });

    await page.goto('file://' + path.resolve(__dirname, '../../index.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Open Reader
    await page.evaluate(() => {
      if (typeof window.openReader === 'function') {
        window.openReader("Aesop's Fables");
      }
    });

    await page.waitForTimeout(500);

    // Get count of controls
    const info = await page.evaluate(() => {
      const controls = document.querySelectorAll('#reading-view .reader-controls button');
      return {
        count: controls.length,
        buttons: Array.from(controls).map(b => ({
          id: b.id,
          text: b.innerText.trim(),
          disabled: b.disabled
        }))
      };
    });

    console.log(`[${vp.name}] Reader controls count:`, info.count, JSON.stringify(info.buttons));

    // Capture full reading view screenshot and controls element screenshot
    await page.screenshot({ path: path.resolve(__dirname, `../../docs/screenshots/reader_view_${vp.name}.png`), fullPage: false });
    const controlsElem = await page.$('#reading-view .reader-controls');
    if (controlsElem) {
      await controlsElem.screenshot({ path: path.resolve(__dirname, `../../docs/screenshots/reader_controls_${vp.name}.png`) });
    }
    await page.close();
  }

  await browser.close();
  console.log('Reader screenshots captured successfully!');
})();
