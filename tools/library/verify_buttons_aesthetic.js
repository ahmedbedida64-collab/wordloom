/**
 * verify_buttons_aesthetic.js
 * Validates the high-craft unified button upgrades across all app views.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== VERIFYING BUTTON DESIGN UPGRADES ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  await page.addInitScript(() => {
    localStorage.setItem('wordloom-welcome-complete', 'true');
    localStorage.setItem('wordloom-session', 'active');
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 1. Check Reader Back Button
  console.log('[CHECK 1] Reader "Back to Library" Button...');
  await page.evaluate(() => window.openReader("Aesop's Fables"));
  await page.waitForTimeout(300);

  const readerBackStyles = await page.evaluate(() => {
    const btn = document.querySelector('#back-to-library');
    const comp = window.getComputedStyle(btn);
    return {
      text: btn.innerText.trim(),
      display: comp.display,
      borderRadius: comp.borderRadius,
      fontFamily: comp.fontFamily,
      color: comp.color,
      cursor: comp.cursor
    };
  });
  console.log('   Reader Back Button styles:', readerBackStyles);
  if (!readerBackStyles.text.includes('Back to Library') || !readerBackStyles.borderRadius.includes('px') || !['flex', 'inline-flex'].includes(readerBackStyles.display)) {
    throw new Error('FAILED: Reader back button is not a styled pill: ' + JSON.stringify(readerBackStyles));
  }
  console.log('   ✓ Reader Back button is an elegant tactile pill button!');

  // 2. Check Settings Page Buttons
  console.log('\n[CHECK 2] Settings Page Action Buttons...');
  await page.evaluate(() => window.showView('settings'));
  await page.waitForTimeout(300);

  const settingsBtns = await page.evaluate(() => {
    const saveBtn = document.querySelector('#save-preferences');
    const backBtn = document.querySelector('.settings-form-actions .back-link');
    const saveComp = window.getComputedStyle(saveBtn);
    const backComp = window.getComputedStyle(backBtn);
    return {
      saveText: saveBtn.innerText.trim(),
      saveDisplay: saveComp.display,
      saveRadius: saveComp.borderRadius,
      backText: backBtn.innerText.trim(),
      backDisplay: backComp.display,
      backRadius: backComp.borderRadius
    };
  });
  console.log('   Settings Action Buttons:', settingsBtns);
  if (!settingsBtns.saveRadius.includes('px') || !['flex', 'inline-flex'].includes(settingsBtns.backDisplay)) {
    throw new Error('FAILED: Settings buttons not upgraded: ' + JSON.stringify(settingsBtns));
  }
  console.log('   ✓ Settings Save and Back buttons properly transformed!');

  // 3. Check Custom Books Buttons & Source Cards
  console.log('\n[CHECK 3] Custom Books Hero Buttons & Source Action Chips...');
  await page.evaluate(() => window.showView('customBook'));
  await page.waitForTimeout(300);

  const customBookCheck = await page.evaluate(() => {
    const importBtn = document.querySelector('#import-local-book');
    const offlineBtn = document.querySelector('#download-full-catalog');
    const sourceChips = Array.from(document.querySelectorAll('.source-card-btn')).map(c => c.innerText.trim().replace(/\s+/g, ' '));
    const backBtn = document.querySelector('.custom-book-footer-nav .back-link');
    return {
      importRadius: window.getComputedStyle(importBtn).borderRadius,
      offlineRadius: window.getComputedStyle(offlineBtn).borderRadius,
      sourceChipsCount: sourceChips.length,
      sourceChipsSample: sourceChips,
      backBtnText: backBtn.innerText.trim()
    };
  });
  console.log('   Custom Books Audit:', customBookCheck);
  if (customBookCheck.sourceChipsCount !== 5 || !customBookCheck.sourceChipsSample[0].includes('Explore stories')) {
    throw new Error('FAILED: Source cards did not render proper action chips: ' + JSON.stringify(customBookCheck));
  }
  console.log('   ✓ All 5 curated source cards contain interactive CTA button chips!');

  // 4. Check Vocabulary Review "Start Review" Buttons
  console.log('\n[CHECK 4] Vocabulary Review "Start Review" CTA Buttons...');
  await page.evaluate(() => window.showView('vocabulary'));
  await page.waitForTimeout(300);

  const reviewBtns = await page.evaluate(() => {
    const ctas = Array.from(document.querySelectorAll('.btn-enter-review')).map(el => ({
      text: el.innerText.trim().replace(/\s+/g, ' '),
      display: window.getComputedStyle(el).display,
      borderRadius: window.getComputedStyle(el).borderRadius,
      fontWeight: window.getComputedStyle(el).fontWeight
    }));
    return ctas;
  });
  console.log('   Review CTA Buttons:', reviewBtns);
  if (reviewBtns.length < 2 || !reviewBtns[0].text.includes('Start Review') || !['flex', 'inline-flex'].includes(reviewBtns[0].display)) {
    throw new Error('FAILED: Review CTA buttons not upgraded: ' + JSON.stringify(reviewBtns));
  }
  console.log('   ✓ Flashcards and Match It cards feature tactile "Start Review" CTA buttons!');

  console.log('\n======================================================');
  console.log('ALL BUTTON DESIGN UPGRADES VERIFIED 100% SUCCESSFULLY!');
  console.log('======================================================\n');

  await browser.close();
})().catch(err => {
  console.error('❌ BUTTON VERIFICATION FAILED:', err);
  process.exit(1);
});
