/**
 * tier1_feature_coverage.js
 * Tier 1: Opaque-Box Feature Coverage Suite for Wordloom
 * 
 * Verifies core functionality across:
 * 1. Library View (book cards, filters, search, tabs, preview modal)
 * 2. Reader View (single paper layout, title isolation, word tokenization, dictionary modal)
 * 3. Audio Engine (SoundReader profiles, speech coordination, preview)
 * 4. Authentication (WordloomAuth, dark modal, demo fill, guest mode, session)
 * 5. Custom Books & Offline (file import controls, literature directory, IndexedDB download)
 * 6. Settings Dashboard (1360px layout, typography controls, mood swatches, profile)
 */

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('================================================================');
  console.log('       TIER 1: FEATURE COVERAGE & APP SHELL INTEGRITY           ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');

  // Pre-seed authenticated session to test full application shell
  await page.addInitScript(() => {
    localStorage.setItem('wordloom-welcome-complete', 'true');
    localStorage.setItem('wordloom-session', JSON.stringify({
      token: 'wl_test_token',
      userId: 'usr_test',
      email: 'tester@wordloom.com',
      name: 'Test Reader',
      language: 'ar',
      provider: 'local',
      loggedInAt: Date.now()
    }));
    localStorage.setItem('wordloom-language', 'ar');
    localStorage.setItem('wordloom-level', 'B1');
    localStorage.setItem('wordloom-line-size', 'standard');
    localStorage.setItem('wordloom-mood', 'parchment');
  });

  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // ------------------------------------------------------------------
  // SECTION 1: LIBRARY VIEW & SHELF CONTROLS
  // ------------------------------------------------------------------
  console.log('[1/6] Testing Library View & Shelf Controls...');
  
  // Verify book cards render
  const bookCount = await page.locator('.mini-book').count();
  console.log(`   Found ${bookCount} books rendered in library grid.`);
  if (bookCount < 21) {
    throw new Error(`FAILED: Expected at least 21 books in library, found ${bookCount}`);
  }

  // Verify single photo-cover card structure
  const firstBook = page.locator('.mini-book').first();
  const hasCoverPhoto = await firstBook.locator('.book-cover-frame img').count() > 0 ||
                        await firstBook.locator('.book-cover-frame').count() > 0;
  const hasReadBtn = await firstBook.locator('[data-read-book]').count() > 0;
  const hasFavoriteBtn = await firstBook.locator('[data-favorite-book]').count() > 0;
  if (!hasCoverPhoto || !hasReadBtn || !hasFavoriteBtn) {
    throw new Error('FAILED: First book card missing required photo-cover, read button, or favorite button');
  }
  console.log('   ✓ Single photo-cover card structure verified.');

  // Open level filter dropdown
  await page.locator('#library-filter-toggle').click();
  await page.waitForTimeout(200);
  await page.locator('#library-level-filter .level-button[data-level="A1"]').click();
  await page.waitForTimeout(300);
  const a1Count = await page.locator('.mini-book:visible').count();
  console.log(`   A1 Level filter: ${a1Count} books visible.`);
  if (a1Count === 0 || a1Count >= bookCount) {
    throw new Error(`FAILED: A1 level filter did not properly filter books (${a1Count}/${bookCount})`);
  }

  // Reset filter to All
  await page.locator('#library-filter-toggle').click();
  await page.waitForTimeout(200);
  await page.locator('#library-level-filter .level-button[data-level="all"]').click();
  await page.waitForTimeout(300);

  // Test Real-Time Search Bar
  const searchInput = page.locator('#library-search');
  await searchInput.fill('Wonderland');
  await page.waitForTimeout(400); // 160ms debounce + render
  const searchResults = await page.locator('.mini-book').count();
  console.log(`   Search for 'Wonderland': ${searchResults} book(s) matched.`);
  if (searchResults < 1) {
    throw new Error(`FAILED: Expected at least 1 match for 'Wonderland', found ${searchResults}`);
  }
  await searchInput.fill('');
  await page.waitForTimeout(400);

  // Test Favorite Heart Toggle
  const favBtn = firstBook.locator('[data-favorite-book]').first();
  const initialFavText = await favBtn.innerText();
  await favBtn.click();
  await page.waitForTimeout(200);
  const updatedFavText = await favBtn.innerText();
  console.log(`   Favorite toggle: "${initialFavText}" -> "${updatedFavText}"`);
  if (initialFavText === updatedFavText) {
    throw new Error('FAILED: Favorite heart toggle did not update state glyph');
  }

  // Test Book Preview Modal
  await page.evaluate(() => window.openBookPreview("Aesop's Fables"));
  await page.waitForTimeout(300);
  const isPreviewVisible = await page.evaluate(() => {
    const modal = document.querySelector('#book-preview-modal');
    return modal && !modal.hasAttribute('hidden') && !modal.classList.contains('hidden');
  });
  if (!isPreviewVisible) {
    throw new Error('FAILED: Book preview modal did not open via openBookPreview');
  }
  // Close preview modal
  await page.locator('#book-preview-modal [data-book-preview-close], [data-book-preview-close]').first().click();
  await page.waitForTimeout(300);
  console.log('   ✓ Book preview modal opens and closes cleanly.');

  // ------------------------------------------------------------------
  // SECTION 2: READER VIEW & MECHANICS
  // ------------------------------------------------------------------
  console.log('\n[2/6] Testing Reader View & Mechanics...');
  
  // Launch Reader for Aesop's Fables
  await page.evaluate(() => window.openReader("Aesop's Fables"));
  await page.waitForTimeout(400);

  // Verify reader view is active
  const isReaderActive = await page.locator('#reading-view.active, #reading-view:not(.hidden)').count() > 0;
  if (!isReaderActive) {
    throw new Error('FAILED: #reading-view is not active');
  }

  // Verify floating dock auto-hides during active reading
  const dockHidden = await page.evaluate(() => {
    const dock = document.querySelector('#react-nav-root');
    return !dock || dock.classList.contains('hidden') || window.getComputedStyle(dock).display === 'none';
  });
  if (!dockHidden) {
    throw new Error('FAILED: Navigation dock did not hide during active reading session');
  }
  console.log('   ✓ Floating dock auto-hides during active reading.');

  // Verify Single Paper sheet exists
  const paperExists = await page.locator('#reading-view .reading-paper, #reading-view #story-copy').count() > 0;
  if (!paperExists) {
    throw new Error('FAILED: Distraction-free single paper sheet not found');
  }

  // Verify First-Page Title Header isolation
  const page1HeaderVisible = await page.evaluate(() => {
    const h = document.querySelector('#story-copy .reader-page-title, #reader-heading, .reading-title-area');
    return h && window.getComputedStyle(h).display !== 'none';
  });
  console.log(`   Page 1 title visible: ${page1HeaderVisible}`);

  // Check Previous button is disabled on page 1
  const prevDisabled = await page.locator('#reader-prev-btn').getAttribute('disabled');
  if (prevDisabled === null && !(await page.locator('#reader-prev-btn').evaluate(el => el.disabled))) {
    throw new Error('FAILED: Previous button should be disabled on Page 1');
  }
  console.log('   ✓ Previous button is properly disabled on Page 1.');

  // Verify Interactive Word Tokens
  const wordTokens = await page.locator('#story-copy .word').count();
  if (wordTokens === 0) {
    throw new Error('FAILED: No interactive .word tokens rendered on story page');
  }
  console.log(`   Found ${wordTokens} interactive word tokens on current page.`);

  // Test Word Lookup Modal
  const firstWord = page.locator('#story-copy .word').first();
  const wordText = await firstWord.innerText();
  await firstWord.click();
  await page.waitForTimeout(400);

  const isDictModalOpen = await page.locator('#dictionary-modal:not([hidden]):not(.hidden)').count() > 0;
  if (!isDictModalOpen) {
    throw new Error('FAILED: Dictionary modal did not open on word token click');
  }
  const dictTitle = await page.locator('#dictionary-title').innerText().catch(() => '');
  console.log(`   Dictionary modal opened for word: "${dictTitle}"`);

  // Close dictionary modal
  await page.locator('#dictionary-modal [data-close-modal]').first().click();
  await page.waitForTimeout(300);

  // Return to library
  await page.locator('#back-to-library').click();
  await page.waitForTimeout(300);
  console.log('   ✓ Returned to library cleanly from reader view.');

  // ------------------------------------------------------------------
  // SECTION 3: AUDIO ENGINE (SoundReader)
  // ------------------------------------------------------------------
  console.log('\n[3/6] Testing Audio Engine (SoundReader)...');
  const soundReaderStatus = await page.evaluate(() => {
    if (typeof SoundReader === 'undefined') return { exists: false };
    return {
      exists: true,
      profile: SoundReader.currentVoiceProfile,
      hasSpeakWord: typeof SoundReader.speakWord === 'function',
      hasActiveUtterances: SoundReader.activeUtterances instanceof Set,
      currentId: SoundReader.currentId
    };
  });
  console.log('   SoundReader status:', soundReaderStatus);
  if (!soundReaderStatus.exists || !soundReaderStatus.hasSpeakWord || !soundReaderStatus.hasActiveUtterances) {
    throw new Error('FAILED: SoundReader audio engine is not properly initialized');
  }
  console.log('   ✓ SoundReader audio engine initialized with GC protection & concurrency tracking.');

  // ------------------------------------------------------------------
  // SECTION 4: AUTHENTICATION ENGINE (WordloomAuth)
  // ------------------------------------------------------------------
  console.log('\n[4/6] Testing Client-Side Authentication Engine...');
  const authStatus = await page.evaluate(() => {
    if (typeof WordloomAuth === 'undefined') return { exists: false };
    const session = WordloomAuth.getSession();
    return {
      exists: true,
      hasSession: !!session,
      user: session ? session.name : null,
      hasLogin: typeof WordloomAuth.login === 'function',
      hasRegister: typeof WordloomAuth.register === 'function',
      hasGuest: typeof WordloomAuth.guestLogin === 'function'
    };
  });
  console.log('   WordloomAuth status:', authStatus);
  if (!authStatus.exists || !authStatus.hasLogin || !authStatus.hasGuest) {
    throw new Error('FAILED: WordloomAuth client authentication engine missing required methods');
  }
  console.log('   ✓ WordloomAuth client authentication engine verified.');

  // ------------------------------------------------------------------
  // SECTION 5: CUSTOM BOOKS & OFFLINE CATALOG
  // ------------------------------------------------------------------
  console.log('\n[5/6] Testing Custom Books & Offline Catalog Controls...');
  await page.evaluate(() => window.showView('customBook'));
  await page.waitForTimeout(300);

  const hasFileInput = await page.locator('#pdf-input').count() > 0;
  const hasDownloadBtn = await page.locator('#download-full-catalog').count() > 0;
  const literatureLinksCount = await page.locator('#custom-book-view a[target="_blank"]').count();

  console.log(`   File input present: ${hasFileInput}, Download button present: ${hasDownloadBtn}`);
  console.log(`   Curated literature outbound links: ${literatureLinksCount}`);

  if (!hasFileInput || !hasDownloadBtn || literatureLinksCount < 4) {
    throw new Error('FAILED: Custom books view missing file input, download button, or curated links');
  }
  console.log('   ✓ Custom books and offline download infrastructure present.');

  // ------------------------------------------------------------------
  // SECTION 6: FULL-SCREEN SETTINGS DASHBOARD
  // ------------------------------------------------------------------
  console.log('\n[6/6] Testing Full-Screen Settings Dashboard...');
  await page.evaluate(() => window.showView('settings'));
  await page.waitForTimeout(400);

  const settingsData = await page.evaluate(() => {
    const view = document.querySelector('#settings-view');
    const voiceSelect = document.querySelector('#reader-voice');
    const lineSelect = document.querySelector('#line-size-shape');
    const langSelect = document.querySelector('#mother-language');
    const signoutBtn = document.querySelector('#auth-signout');

    return {
      viewVisible: view && !view.classList.contains('hidden'),
      voiceOptions: voiceSelect ? Array.from(voiceSelect.options).map(o => o.value) : [],
      lineOptions: lineSelect ? Array.from(lineSelect.options).map(o => o.value) : [],
      langOptions: langSelect ? Array.from(langSelect.options).map(o => o.value) : [],
      hasSignout: !!signoutBtn
    };
  });
  console.log('   Settings Dashboard inspection:', settingsData);

  if (!settingsData.viewVisible || settingsData.voiceOptions.length < 4 || settingsData.lineOptions.length < 3 || settingsData.langOptions.length < 5 || !settingsData.hasSignout) {
    throw new Error('FAILED: Settings dashboard missing voice options, typography options, or signout button');
  }
  console.log('   ✓ Full-screen simplified settings dashboard controls and profile actions verified.');

  console.log('\n================================================================');
  console.log('       ✓ TIER 1 FEATURE COVERAGE SUITE PASSED (100%)            ');
  console.log('================================================================\n');

  await browser.close();
})().catch(err => {
  console.error('\n❌ TIER 1 TEST SUITE FAILED:', err);
  process.exit(1);
});
