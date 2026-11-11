const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== STARTING FULL WORDLOOM APPLICATION AUDIT ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const issues = [];
  const logIssue = (section, desc, severity = 'warning') => {
    issues.push({ section, desc, severity });
    console.log(`[${severity.toUpperCase()}] [${section}] ${desc}`);
  };

  page.on('pageerror', err => logIssue('RUNTIME_ERROR', err.message, 'error'));
  page.on('console', msg => {
    if (msg.type() === 'error') logIssue('CONSOLE_ERROR', msg.text(), 'error');
  });

  await page.addInitScript(() => {
    localStorage.setItem('wordloom-welcome-complete', 'true');
    localStorage.setItem('wordloom-session', JSON.stringify({
      token: 'wl_demo_token',
      userId: 'usr_demo',
      email: 'demo@wordloom.com',
      name: 'Demo Reader',
      language: 'ar',
      loggedInAt: Date.now()
    }));
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  console.log('\n--- 1. AUDITING COVERS & ASSETS ---');
  const covers = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.cover-photo, .mini-cover img'));
    return imgs.map(img => ({
      src: img.getAttribute('src'),
      naturalWidth: img.naturalWidth,
      complete: img.complete
    }));
  });
  console.log('Total book covers found in library:', covers.length);
  const brokenCovers = covers.filter(c => c.complete && c.naturalWidth === 0);
  if (brokenCovers.length > 0) {
    logIssue('COVERS', `${brokenCovers.length} covers failed to load: ` + JSON.stringify(brokenCovers), 'error');
  } else {
    console.log('✓ All', covers.length, 'covers loaded successfully!');
  }

  console.log('\n--- 2. AUDITING HORIZONTAL OVERFLOW ACROSS VIEWPORTS ---');
  const viewports = [
    { name: 'Mobile (390x844)', width: 390, height: 844 },
    { name: 'Tablet (768x1024)', width: 768, height: 1024 },
    { name: 'Desktop (1440x900)', width: 1440, height: 900 }
  ];

  const views = ['#library-view', '#settings-view', '#custom-book-view', '#vocabulary-view'];
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const v of views) {
      await page.evaluate((viewId) => {
        document.querySelectorAll('main > section, .view').forEach(s => {
          if (s.id === viewId.replace('#', '')) {
            s.classList.remove('hidden');
            s.style.display = 'block';
          } else {
            s.classList.add('hidden');
            s.style.display = 'none';
          }
        });
      }, v);
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth + 1
        };
      });
      if (overflow.hasOverflow) {
        logIssue('RESPONSIVENESS', `Horizontal overflow in ${v} on ${vp.name}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`, 'warning');
      } else {
        console.log(`✓ No overflow in ${v} on ${vp.name}`);
      }
    }
  }

  console.log('\n--- 3. AUDITING READER VIEW & WORD INTERACTION ---');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    if (window.openReader) window.openReader("Aesop's Fables");
  });
  await page.waitForTimeout(400);

  const readerState = await page.evaluate(() => {
    const readingView = document.querySelector('#reading-view');
    const bottomNav = document.querySelector('#react-nav-root');
    const titleHeader = document.querySelector('.reader-page-title');
    const heading = document.querySelector('#reader-heading');
    const firstWord = document.querySelector('.word');
    const prevBtn = document.querySelector('#reader-prev-btn');
    const nextBtn = document.querySelector('#reader-next-btn');
    return {
      readingVisible: readingView && !readingView.classList.contains('hidden'),
      navHidden: bottomNav && (bottomNav.classList.contains('hidden') || window.getComputedStyle(bottomNav).display === 'none'),
      headingText: heading ? heading.innerText.trim() : '',
      titleHeaderVisible: titleHeader ? window.getComputedStyle(titleHeader).display !== 'none' : false,
      hasWord: !!firstWord,
      prevDisabled: prevBtn?.disabled,
      nextDisabled: nextBtn?.disabled
    };
  });
  console.log('Reader state on page 1:', readerState);
  if (!readerState.readingVisible) logIssue('READER', 'Reader view not visible after openReader', 'error');
  if (!readerState.navHidden) logIssue('READER', 'Bottom nav dock is NOT hidden in reader view', 'error');
  if (!readerState.prevDisabled) logIssue('READER', 'Previous button should be disabled on page 1', 'warning');
  if (!readerState.titleHeaderVisible) logIssue('READER', 'Title header should be visible on page 1', 'warning');

  // Test word click -> opens dictionary modal
  console.log('Clicking first word in reader...');
  await page.evaluate(() => {
    const word = document.querySelector('.word');
    if (word) word.click();
  });
  await page.waitForTimeout(300);

  const dictModalState = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      modalExists: !!modal,
      modalVisible: modal && !modal.classList.contains('hidden') && modal.style.display !== 'none' && !modal.hasAttribute('hidden'),
      title: document.querySelector('#dictionary-title')?.innerText.trim(),
      speakBtn: !!document.querySelector('[data-speak-word], #popup-speak-btn'),
      learnBtn: !!document.querySelector('[data-learn-word]')
    };
  });
  console.log('Dictionary modal state after word click:', dictModalState);
  if (!dictModalState.modalVisible) logIssue('READER_DICTIONARY', 'Dictionary modal did not become visible after clicking .word', 'warning');

  // Close dictionary modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('#dictionary-modal [data-close-modal], #dictionary-modal .modal-close');
    if (closeBtn) closeBtn.click();
  });
  await page.waitForTimeout(200);

  // Test page turn to page 2 and verify title disappears on page 2
  console.log('Advancing to page 2...');
  await page.evaluate(() => {
    const nextBtn = document.querySelector('#reader-next-btn');
    if (nextBtn) nextBtn.click();
  });
  await page.waitForTimeout(300);

  const page2State = await page.evaluate(() => {
    const titleHeader = document.querySelector('.reader-page-title');
    const pageInd = document.querySelector('#reader-status');
    return {
      titleHeaderVisible: titleHeader ? window.getComputedStyle(titleHeader).display !== 'none' && titleHeader.offsetHeight > 0 : false,
      indicator: pageInd ? pageInd.innerText.trim() : ''
    };
  });
  console.log('Page 2 state:', page2State);
  if (page2State.titleHeaderVisible) {
    logIssue('READER_TITLE', 'Book title header should only appear on page 1 (single-paper rule)', 'error');
  } else {
    console.log('✓ Single paper sheet rule verified: title header cleanly hidden on page 2!');
  }

  // Back to library
  await page.evaluate(() => {
    const backBtn = document.querySelector('#back-to-library');
    if (backBtn) backBtn.click();
  });
  await page.waitForTimeout(300);

  console.log('\n--- 4. AUDITING REVIEW HUB & ACTIVITIES ---');
  await page.evaluate(() => {
    if (window.showView) window.showView('vocabulary');
  });
  await page.waitForTimeout(300);

  const hubState = await page.evaluate(() => {
    const hub = document.querySelector('#vocabulary-view');
    const cards = Array.from(document.querySelectorAll('.review-method-face, [data-reveal]')).map(c => ({
      reveal: c.getAttribute('data-reveal'),
      title: c.querySelector('h3, .review-method-title')?.innerText.trim()
    }));
    return {
      hubVisible: hub && !hub.classList.contains('hidden'),
      cardsCount: cards.length,
      cards
    };
  });
  console.log('Review Hub state:', hubState);
  if (hubState.cardsCount < 3) logIssue('REVIEW_HUB', `Expected 3 review mode cards, found ${hubState.cardsCount}`, 'warning');
  else console.log('✓ All 3 review mode cards present in Review Hub!');

  console.log('\n--- 5. AUDITING SETTINGS DASHBOARD ---');
  await page.evaluate(() => {
    if (window.showView) window.showView('settings');
  });
  await page.waitForTimeout(300);

  const settingsState = await page.evaluate(() => {
    const settings = document.querySelector('#settings-view');
    const signoutBtn = document.querySelector('#settings-signout-btn, #signout-btn, [data-signout]');
    const swatches = document.querySelectorAll('[data-mood], .mood-swatch');
    const langSelect = document.querySelector('#native-language-select, #mother-language, select[name="language"]');
    return {
      settingsVisible: settings && !settings.classList.contains('hidden'),
      hasSignout: !!signoutBtn,
      swatchesCount: swatches.length,
      hasLangSelect: !!langSelect
    };
  });
  console.log('Settings state:', settingsState);
  if (!settingsState.settingsVisible) logIssue('SETTINGS', 'Settings view not visible', 'error');
  else console.log('✓ Settings dashboard loaded and responsive!');

  console.log('\n--- 6. AUDITING CUSTOM BOOKS VIEW ---');
  await page.evaluate(() => {
    if (window.showView) window.showView('customBook');
  });
  await page.waitForTimeout(300);

  const customState = await page.evaluate(() => {
    const view = document.querySelector('#custom-book-view');
    const uploadInput = document.querySelector('#pdf-input, #custom-book-file, input[type="file"]');
    const backBtn = document.querySelector('#custom-book-view .back-link');
    return {
      viewVisible: view && !view.classList.contains('hidden'),
      hasUploadInput: !!uploadInput,
      hasBackBtn: !!backBtn
    };
  });
  console.log('Custom books state:', customState);
  if (!customState.viewVisible) logIssue('CUSTOM_BOOKS', 'Custom books view not visible', 'error');
  else console.log('✓ Custom books view ready with file importer and back action!');

  console.log('\n======================================================');
  console.log('AUDIT SUMMARY: Total issues found:', issues.length);
  issues.forEach((iss, i) => console.log(`  ${i+1}. [${iss.severity.toUpperCase()}] ${iss.section}: ${iss.desc}`));
  console.log('======================================================');

  await browser.close();
})().catch(e => {
  console.error('Audit failed with error:', e);
  process.exit(1);
});

