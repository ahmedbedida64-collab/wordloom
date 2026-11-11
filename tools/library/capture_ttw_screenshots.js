/**
 * capture_ttw_screenshots.js
 * Captures visual proof of the sharpless, humanized Type What You Hear experience.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/AhmedBedida/.gemini/antigravity/brain/805116ba-ca66-4373-9c24-98fad786dd96';

(async () => {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'mobile_390x844', width: 390, height: 844 }
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', 'active');
    });

    const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // Open review hub and populate sample words
    await page.evaluate(() => {
      window.showView('vocabulary');
      document.querySelector('#review-load-sample')?.click();
    });
    await page.waitForTimeout(300);

    // Launch TTW
    await page.evaluate(() => {
      document.querySelector('.review-method-face[data-reveal="ttw-stage"]')?.click();
    });
    await page.waitForTimeout(400);

    // Screenshot 1: Active prompt & input
    const p1 = path.join(OUT_DIR, `ttw_sharpless_active_${vp.name}.png`);
    await page.screenshot({ path: p1, fullPage: false });
    console.log(`Saved: ${p1}`);

    // Screenshot 1b: Progressive letter hint state
    await page.evaluate(() => {
      document.querySelector('#ttw-hint')?.click();
      document.querySelector('#ttw-hint')?.click();
    });
    await page.waitForTimeout(200);
    const pHint = path.join(OUT_DIR, `ttw_progressive_hint_${vp.name}.png`);
    await page.screenshot({ path: pHint, fullPage: false });
    console.log(`Saved: ${pHint}`);

    // Screenshot 2: Correct feedback state
    await page.evaluate(() => {
      const curr = window.ttwState?.words[window.ttwState.currentIndex];
      if (curr) {
        const input = document.querySelector('#ttw-input');
        input.value = curr.word;
        window.ttwCheckAnswer(true);
      }
    });
    await page.waitForTimeout(300);

    const p2 = path.join(OUT_DIR, `ttw_sharpless_feedback_${vp.name}.png`);
    await page.screenshot({ path: p2, fullPage: false });
    console.log(`Saved: ${p2}`);

    // Advance to results
    await page.evaluate(() => {
      window.ttwFinishSession();
    });
    await page.waitForTimeout(300);

    const p3 = path.join(OUT_DIR, `ttw_sharpless_results_${vp.name}.png`);
    await page.screenshot({ path: p3, fullPage: false });
    console.log(`Saved: ${p3}`);

    await context.close();
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
})();

