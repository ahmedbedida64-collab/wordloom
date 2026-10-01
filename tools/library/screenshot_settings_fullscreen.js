const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'tablet_1024x768', width: 1024, height: 768 },
    { name: 'mobile_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.addInitScript(() => {
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', JSON.stringify({
        token: 'test_token',
        userId: 'usr_demo',
        email: 'demo@wordloom.com',
        name: 'Demo Reader',
        language: 'ar'
      }));
    });

    await page.goto('file://' + path.resolve(__dirname, '../../index.html'), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Show Settings View
    await page.evaluate(() => {
      if (typeof window.showView === 'function') {
        window.showView('settings');
      }
    });

    await page.waitForTimeout(500);

    // Dimensions check
    const metrics = await page.evaluate(() => {
      const view = document.querySelector('#settings-view');
      const rect = view.getBoundingClientRect();
      const form = document.querySelector('#settings-page-form');
      const formRect = form ? form.getBoundingClientRect() : null;
      return {
        viewWidth: rect.width,
        formWidth: formRect ? formRect.width : 0,
        windowWidth: window.innerWidth
      };
    });

    console.log(`[${vp.name}] Settings dimensions:`, metrics);

    await page.screenshot({ path: path.resolve(__dirname, `../../docs/screenshots/settings_fullscreen_${vp.name}.png`), fullPage: false });
    await page.close();
  }

  await browser.close();
  console.log('All settings screenshots captured successfully!');
})();
