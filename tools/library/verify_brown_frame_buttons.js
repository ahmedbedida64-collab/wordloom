/**
 * verify_brown_frame_buttons.js
 * Validates the brown natural frame styling and absence of arrows on back & forward buttons.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== VERIFYING BROWN NATURAL FRAME BUTTONS & ARROW REMOVAL ===\n');
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

  // 1. Verify Reader Back & Forward Buttons
  console.log('[CHECK 1] Reader Navigation Buttons (#back-to-library, #reader-prev-btn, #reader-next-btn)...');
  await page.evaluate(() => window.openReader("Aesop's Fables"));
  await page.waitForTimeout(300);

  const readerBtns = await page.evaluate(() => {
    const backLib = document.querySelector('#back-to-library');
    const prevBtn = document.querySelector('#reader-prev-btn');
    const nextBtn = document.querySelector('#reader-next-btn');

    const getStyle = el => {
      const c = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        innerHTML: el.innerHTML,
        borderWidth: c.borderTopWidth,
        borderStyle: c.borderTopStyle,
        borderColor: c.borderTopColor,
        borderRadius: c.borderRadius,
        backgroundColor: c.backgroundColor,
        color: c.color
      };
    };

    return {
      backLib: getStyle(backLib),
      prevBtn: getStyle(prevBtn),
      nextBtn: getStyle(nextBtn)
    };
  });

  console.log('   Reader Back to Library:', readerBtns.backLib);
  console.log('   Reader Previous:', readerBtns.prevBtn);
  console.log('   Reader Next:', readerBtns.nextBtn);

  // Assert arrows are removed
  if (readerBtns.backLib.text.includes('←') || readerBtns.backLib.text.includes('→')) {
    throw new Error('FAILED: #back-to-library contains arrows: ' + readerBtns.backLib.text);
  }
  if (readerBtns.prevBtn.text.includes('←') || readerBtns.prevBtn.text.includes('→')) {
    throw new Error('FAILED: #reader-prev-btn contains arrows: ' + readerBtns.prevBtn.text);
  }
  if (readerBtns.nextBtn.text.includes('←') || readerBtns.nextBtn.text.includes('→') || readerBtns.nextBtn.innerHTML.includes('arrow_forward')) {
    throw new Error('FAILED: #reader-next-btn contains arrows: ' + readerBtns.nextBtn.text);
  }

  // Assert Brown Natural Frame styling
  const expectedBorderColor = 'rgb(139, 90, 43)'; // #8B5A2B
  const expectedBgColor = 'rgb(250, 244, 235)'; // #FAF4EB
  const expectedTextColor = 'rgb(92, 64, 51)'; // #5C4033
  const expectedRadius = '6px';

  // backLib and nextBtn are active on page 1
  [readerBtns.backLib, readerBtns.nextBtn].forEach((btn, idx) => {
    if (btn.borderColor !== expectedBorderColor) {
      throw new Error(`FAILED: Active button index ${idx} border color is ${btn.borderColor}, expected ${expectedBorderColor}`);
    }
    if (btn.borderRadius !== expectedRadius) {
      throw new Error(`FAILED: Button index ${idx} border radius is ${btn.borderRadius}, expected ${expectedRadius}`);
    }
    if (btn.backgroundColor !== expectedBgColor) {
      throw new Error(`FAILED: Button index ${idx} background color is ${btn.backgroundColor}, expected ${expectedBgColor}`);
    }
  });

  // prevBtn is disabled on page 1, check radius and background
  if (readerBtns.prevBtn.borderRadius !== expectedRadius) {
    throw new Error('FAILED: #reader-prev-btn border radius is ' + readerBtns.prevBtn.borderRadius);
  }
  if (readerBtns.prevBtn.backgroundColor !== expectedBgColor) {
    throw new Error('FAILED: #reader-prev-btn background color is ' + readerBtns.prevBtn.backgroundColor);
  }
  console.log('   ✓ Reader navigation buttons have clean brown natural frame with NO arrows!');

  // 2. Test Page Flip: Next button still has no arrow, and Previous button becomes enabled
  console.log('\n[CHECK 2] Reader Page Flip (Page 2) Button States & Text...');
  await page.evaluate(() => window.moveReader(1));
  await page.waitForTimeout(300);

  const page2Btns = await page.evaluate(() => {
    const prevBtn = document.querySelector('#reader-prev-btn');
    const nextBtn = document.querySelector('#reader-next-btn');
    const prevComp = window.getComputedStyle(prevBtn);
    return {
      nextText: nextBtn.innerText.trim(),
      nextHasArrow: nextBtn.innerText.includes('→') || nextBtn.innerText.includes('←'),
      prevText: prevBtn.innerText.trim(),
      prevHasArrow: prevBtn.innerText.includes('←') || prevBtn.innerText.includes('→'),
      prevDisabled: prevBtn.disabled,
      prevBorderColor: prevComp.borderTopColor,
      prevRadius: prevComp.borderRadius
    };
  });
  console.log('   Page 2 reader buttons:', page2Btns);
  if (page2Btns.nextHasArrow || page2Btns.nextText !== 'Next') {
    throw new Error('FAILED: After flipping page, Next button reintroduced arrow: ' + JSON.stringify(page2Btns));
  }
  if (page2Btns.prevHasArrow || page2Btns.prevText !== 'Previous') {
    throw new Error('FAILED: Previous button text invalid: ' + JSON.stringify(page2Btns));
  }
  if (page2Btns.prevDisabled) {
    throw new Error('FAILED: Previous button should be enabled on page 2');
  }
  if (page2Btns.prevBorderColor !== expectedBorderColor || page2Btns.prevRadius !== expectedRadius) {
    throw new Error('FAILED: Enabled Previous button frame styling incorrect: ' + JSON.stringify(page2Btns));
  }
  console.log('   ✓ Reader pagination preserved "Next" & "Previous" with brown natural frames and no arrows!');

  // 3. Verify Review Back Button
  console.log('\n[CHECK 3] Review Back Button (#review-back-btn)...');
  await page.evaluate(() => {
    window.showView('game');
    const inside = document.querySelector('#review-inside');
    if (inside) inside.style.display = 'block';
  });
  await page.waitForTimeout(300);

  const reviewBackStyles = await page.evaluate(() => {
    const btn = document.querySelector('#review-back-btn');
    const c = window.getComputedStyle(btn);
    return {
      text: btn.innerText.trim(),
      borderTopColor: c.borderTopColor,
      borderRadius: c.borderRadius,
      backgroundColor: c.backgroundColor,
      color: c.color
    };
  });
  console.log('   Review back button styles:', reviewBackStyles);
  if (reviewBackStyles.text.includes('←') || reviewBackStyles.text.includes('→') || reviewBackStyles.text !== 'All methods') {
    throw new Error('FAILED: #review-back-btn text is invalid: ' + JSON.stringify(reviewBackStyles));
  }
  if (reviewBackStyles.borderTopColor !== expectedBorderColor || reviewBackStyles.borderRadius !== expectedRadius) {
    throw new Error('FAILED: #review-back-btn frame style incorrect: ' + JSON.stringify(reviewBackStyles));
  }
  console.log('   ✓ Review back button is "All methods" with brown natural frame!');

  // 4. Verify Settings Back Button
  console.log('\n[CHECK 4] Settings View Back Button (#settings-view .back-link)...');
  await page.evaluate(() => window.showView('settings'));
  await page.waitForTimeout(300);

  const settingsBackStyles = await page.evaluate(() => {
    const btn = document.querySelector('#settings-view .back-link');
    const c = window.getComputedStyle(btn);
    return {
      text: btn.innerText.trim(),
      borderTopColor: c.borderTopColor,
      borderRadius: c.borderRadius,
      backgroundColor: c.backgroundColor,
      color: c.color
    };
  });
  console.log('   Settings back button styles:', settingsBackStyles);
  if (settingsBackStyles.text.includes('←') || settingsBackStyles.text.includes('→') || settingsBackStyles.text !== 'Back to Library') {
    throw new Error('FAILED: Settings back button text invalid: ' + JSON.stringify(settingsBackStyles));
  }
  if (settingsBackStyles.borderTopColor !== expectedBorderColor || settingsBackStyles.borderRadius !== expectedRadius) {
    throw new Error('FAILED: Settings back button frame style incorrect: ' + JSON.stringify(settingsBackStyles));
  }
  console.log('   ✓ Settings back button is "Back to Library" with brown natural frame!');

  // 5. Verify Custom Books Back Button
  console.log('\n[CHECK 5] Custom Books View Back Button (#custom-book-view .back-link)...');
  await page.evaluate(() => window.showView('customBook'));
  await page.waitForTimeout(300);

  const customBooksBackStyles = await page.evaluate(() => {
    const btn = document.querySelector('#custom-book-view .back-link');
    const c = window.getComputedStyle(btn);
    return {
      text: btn.innerText.trim(),
      borderTopColor: c.borderTopColor,
      borderRadius: c.borderRadius,
      backgroundColor: c.backgroundColor,
      color: c.color
    };
  });
  console.log('   Custom Books back button styles:', customBooksBackStyles);
  if (customBooksBackStyles.text.includes('←') || customBooksBackStyles.text.includes('→') || customBooksBackStyles.text !== 'Back to Library') {
    throw new Error('FAILED: Custom Books back button text invalid: ' + JSON.stringify(customBooksBackStyles));
  }
  if (customBooksBackStyles.borderTopColor !== expectedBorderColor || customBooksBackStyles.borderRadius !== expectedRadius) {
    throw new Error('FAILED: Custom Books back button frame style incorrect: ' + JSON.stringify(customBooksBackStyles));
  }
  console.log('   ✓ Custom Books back button is "Back to Library" with brown natural frame!');

  console.log('\n======================================================');
  console.log('ALL BROWN NATURAL FRAME BUTTONS & ARROW REMOVAL TESTS PASSED!');
  console.log('======================================================\n');

  await browser.close();
})().catch(err => {
  console.error('❌ BUTTON VERIFICATION FAILED:', err);
  process.exit(1);
});
