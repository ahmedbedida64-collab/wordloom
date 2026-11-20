/**
 * tools/library/challenger2_adversarial_test.js
 * Empirical Challenger 2: Storage, Offline Resilience & State Adversarial Verification
 * 
 * Verifies:
 * 1. Cross-Session Persistence Round-Trip across all 8 core storage keys & DOM/runtime state restoration.
 * 2. Corrupted Storage Injection across individual keys to detect uncaught SyntaxError crashes vs graceful recovery.
 * 3. Custom Books Import, Shelf Rendering, Reload Persistence & Reader Opening.
 * 4. Empty Review Deck Handling for Flashcards, Match It, and Type What You Hear, including sample deck generation.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE_URL = 'file://' + path.resolve(__dirname, '../../index.html');
const TEST_TXT_PATH = path.resolve(__dirname, 'test_adventure.txt');

// Ensure a dummy custom txt file exists for import test with sufficient length for paragraphs
const DUMMY_TXT_CONTENT = `The Secret of the Old Mill

Chapter 1: The Discovery
Frank and Joe Hardy arrived at the old abandoned mill just as dusk was falling over Barmet Bay.
The water wheel stood motionless against the gray sky, covered in green moss and tangled vines.
Inside the doorway, a faint beam of light caught their attention, reflecting off a piece of polished brass hidden beneath the floorboards.

Chapter 2: The Hidden Tunnel
Joe knelt down to pry open the loose oak board with his pocketknife.
Beneath the wood lay a steep stone stairway leading down into darkness.
"Listen," Frank whispered, raising his hand. "Do you hear that sound?"
Far below in the cavern, a steady rhythmic clicking echoed through the damp stone corridor.`;

fs.writeFileSync(TEST_TXT_PATH, DUMMY_TXT_CONTENT, 'utf8');

(async () => {
  console.log('================================================================');
  console.log('  CHALLENGER 2: STORAGE, OFFLINE & STATE ADVERSARIAL HARNESS    ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const results = {
    persistenceRoundTrip: { passed: false, moodDomRestored: false, details: {} },
    corruptedStorage: { passed: false, findings: [] },
    customBooksLifecycle: { passed: false, details: {} },
    emptyReviewDecks: { passed: false, stackHiddenProperly: false, details: {} }
  };

  // -------------------------------------------------------------------------
  // SUITE 1: CROSS-SESSION PERSISTENCE ROUND-TRIP & DOM RESTORATION
  // -------------------------------------------------------------------------
  console.log('[SUITE 1] Testing Cross-Session Persistence Round-Trip & DOM Restoration...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

    // Pre-seed clean state with all 8 core keys
    const testSession = {
      token: 'wl_challenger2_token_99',
      userId: 'usr_c2_001',
      email: 'c2@wordloom.com',
      name: 'Challenger Two',
      language: 'fr',
      provider: 'local'
    };
    const testVocab = {
      "adversary": {
        word: "adversary",
        meaning: "خصم",
        sentence: "He confronted his adversary boldly.",
        level: "B2",
        repetitions: 2,
        interval: 3,
        nextReview: Date.now() + 86400000
      }
    };
    const testCustomBooks = [
      {
        title: "Chronicles of Amber",
        author: "Zelazny",
        level: "B2",
        topic: "culture",
        source: "Imported Text",
        length: "1 page",
        progress: 0,
        chapters: [{
          title: "Chronicles of Amber",
          subtitle: "Chapter 1",
          paragraphs: ["It was morning in the court of Amber."]
        }]
      }
    ];

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ session, vocab, customBooks }) => {
      localStorage.setItem('wordloom-session', JSON.stringify(session));
      localStorage.setItem('wordloom-language', 'fr');
      localStorage.setItem('wordloom-level', 'B2');
      localStorage.setItem('wordloom-line-size', 'roomy');
      localStorage.setItem('wordloom-mood', 'fern');
      localStorage.setItem('wordloom-voice', 'natural-male');
      localStorage.setItem('wordloom-voice', 'british-classic');
      localStorage.setItem('wordloom-vocabulary-records', JSON.stringify(vocab));
      localStorage.setItem('wordloom-saved-words', JSON.stringify(['adversary']));
      localStorage.setItem('wordloom-custom-books', JSON.stringify(customBooks));
    }, { session: testSession, vocab: testVocab, customBooks: testCustomBooks });

    // Reload to verify clean persistence across session boot
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const state = await page.evaluate(() => {
      const session = WordloomAuth.getSession();
      const isShellLocked = document.querySelector('.app-shell')?.classList.contains('auth-locked');
      const isAuthHidden = document.querySelector('#auth-screen')?.classList.contains('hidden');
      const langInput = document.querySelector('#mother-language')?.value;
      const levelInput = document.querySelector('#learner-level')?.value;
      const lineInput = document.querySelector('#line-size-shape')?.value;
      const readingLineAttr = document.querySelector('#reading-view')?.getAttribute('data-reading-line');
      const bodyMoodClass = Array.from(document.body.classList).find(c => c.startsWith('mood-'));
      const soundVoice = SoundReader.currentVoiceProfile;
      const hasAdversaryVocab = !!vocabularyRecords['adversary'];
      const savedCountText = document.querySelector('#saved-word-count')?.textContent;
      const customBookInBooks = books.some(b => b.title === 'Chronicles of Amber');
      const customCardVisible = Array.from(document.querySelectorAll('.mini-book')).some(el => el.innerText.includes('Chronicles of Amber'));

      return {
        storage: {
          session: localStorage.getItem('wordloom-session'),
          language: localStorage.getItem('wordloom-language'),
          level: localStorage.getItem('wordloom-level'),
          lineSize: localStorage.getItem('wordloom-line-size'),
          mood: localStorage.getItem('wordloom-mood'),
          voice: localStorage.getItem('wordloom-voice'),
          vocabRecords: localStorage.getItem('wordloom-vocabulary-records'),
          customBooks: localStorage.getItem('wordloom-custom-books')
        },
        domRuntime: {
          sessionUser: session?.email,
          isShellLocked,
          isAuthHidden,
          motherLanguageGlobal: motherLanguage,
          langInput,
          learnerLevelGlobal: learnerLevel,
          levelInput,
          readingLineGlobal: readingLine,
          lineInput,
          readingLineAttr,
          bodyMoodClass: bodyMoodClass || null,
          soundVoice,
          hasAdversaryVocab,
          savedCountText,
          customBookInBooks,
          customCardVisible
        }
      };
    });

    console.log('   Storage keys verification:');
    let allStorageKeysPresent = true;
    for (const [k, v] of Object.entries(state.storage)) {
      const ok = v !== null && v !== undefined;
      console.log(`     - ${k}: ${ok ? 'OK' : 'MISSING'}`);
      if (!ok) allStorageKeysPresent = false;
    }

    console.log('   DOM and runtime state restoration:');
    console.log(`     - Session user email: ${state.domRuntime.sessionUser} (unlocked: ${!state.domRuntime.isShellLocked})`);
    console.log(`     - Language: ${state.domRuntime.motherLanguageGlobal} (input value: ${state.domRuntime.langInput})`);
    console.log(`     - Level: ${state.domRuntime.learnerLevelGlobal} (input value: ${state.domRuntime.levelInput})`);
    console.log(`     - Reading line: ${state.domRuntime.readingLineGlobal} (attr: ${state.domRuntime.readingLineAttr})`);
    console.log(`     - Mood body class: ${state.domRuntime.bodyMoodClass} (localStorage: ${state.storage.mood})`);
    console.log(`     - Voice profile: ${state.domRuntime.soundVoice}`);
    console.log(`     - Custom book in books: ${state.domRuntime.customBookInBooks}, shelf card: ${state.domRuntime.customCardVisible}`);

    const moodRestored = state.domRuntime.bodyMoodClass === 'mood-fern';
    if (!moodRestored) {
      console.warn('   ⚠️ DEFECT IDENTIFIED: wordloom-mood is stored in localStorage as "fern", but document.body DOES NOT have "mood-fern" on reload! Body class is: ' + state.domRuntime.bodyMoodClass);
    }

    results.persistenceRoundTrip = {
      passed: allStorageKeysPresent && state.domRuntime.sessionUser === 'c2@wordloom.com' && state.domRuntime.customCardVisible,
      moodDomRestored: moodRestored,
      details: state
    };

    console.log(`   Result: ${results.persistenceRoundTrip.passed ? '✓ STORAGE PERSISTED' : '✗ FAILED'}\n`);
    await page.close();
  }

  // -------------------------------------------------------------------------
  // SUITE 2: CORRUPTED STORAGE INJECTION & UNCAUGHT EXCEPTION AUDIT
  // -------------------------------------------------------------------------
  console.log('[SUITE 2] Testing Corrupted Storage Injection across Individual Keys...');
  {
    const keysToTest = [
      { key: 'wordloom-session', corruptVal: '{bad_json: true, missing_closing' },
      { key: 'wordloom-custom-books', corruptVal: '[{invalid_json: true,' },
      { key: 'wordloom-definitions-cache', corruptVal: '{"broken_cache":' },
      { key: 'wordloom-custom-translations', corruptVal: '{"broken_trans":' },
      { key: 'wordloom-vocabulary-records', corruptVal: '{"corrupted_vocab":' },
      { key: 'wordloom-saved-words', corruptVal: '[corrupted_saved_words' },
      { key: 'wordloom-favorite-books', corruptVal: '[corrupted_favorites' },
      { key: 'wordloom-reading-history', corruptVal: '[corrupted_history' },
      { key: 'wordloom-reading-metrics', corruptVal: '{"corrupted_metrics":' }
    ];

    for (const item of keysToTest) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      // Navigate first, inject corruption, then reload
      await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ targetKey, targetVal }) => {
        localStorage.clear();
        localStorage.setItem('wordloom-session', 'active');
        localStorage.setItem(targetKey, targetVal);
      }, { targetKey: item.key, targetVal: item.corruptVal });

      let bootSucceeded = false;
      let evalError = null;
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(300);

        const runtimeStatus = await page.evaluate(() => {
          return {
            hasRenderBooks: typeof window.renderBooks === 'function',
            booksCount: typeof books !== 'undefined' ? books.length : 0,
            hasBookGrid: !!document.querySelector('#book-grid'),
            gridCards: document.querySelectorAll('.mini-book').length
          };
        });

        bootSucceeded = runtimeStatus.hasRenderBooks && runtimeStatus.gridCards > 0;
      } catch (e) {
        evalError = e.message;
      }

      const hasCrash = pageErrors.length > 0 || !bootSucceeded;
      console.log(`   - Testing key "${item.key}": ${hasCrash ? '✗ CRASHED' : '✓ GRACEFUL RECOVERY'}`);
      if (hasCrash) {
        console.log(`       Page Errors: ${pageErrors.join(' | ') || 'None'}`);
        console.log(`       Boot Succeeded: ${bootSucceeded}, Eval Error: ${evalError || 'None'}`);
      }

      results.corruptedStorage.findings.push({
        key: item.key,
        corruptVal: item.corruptVal,
        crashed: hasCrash,
        pageErrors,
        bootSucceeded
      });

      await page.close();
    }

    const anyCrashed = results.corruptedStorage.findings.some(f => f.crashed);
    results.corruptedStorage.passed = !anyCrashed;
    console.log(`\n   Suite 2 Summary: ${anyCrashed ? '⚠️ VULNERABILITIES DETECTED in corrupted JSON handling' : '✓ ALL KEYS RECOVERED GRACEFULLY'}\n`);
  }

  // -------------------------------------------------------------------------
  // SUITE 3: CUSTOM BOOKS LIFECYCLE (IMPORT -> SHELF -> OPEN -> RELOAD -> RE-OPEN)
  // -------------------------------------------------------------------------
  console.log('[SUITE 3] Testing Custom Books Import, Shelf, Reload & Reader Opening...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('wordloom-session', 'active');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // 1. Navigate to Custom Book view
    await page.evaluate(() => window.showView('customBook'));
    await page.waitForTimeout(300);

    // 2. Upload test_adventure.txt via #pdf-input
    console.log('   Uploading custom text file: test_adventure.txt...');
    const fileInput = page.locator('#pdf-input');
    await fileInput.setInputFiles(TEST_TXT_PATH);
    await page.waitForTimeout(600);

    // 3. Verify reader opened automatically
    const readerStatusAfterUpload = await page.evaluate(() => {
      const activeView = activeAppView;
      const readingViewDisplay = window.getComputedStyle(document.querySelector('#reading-view')).display;
      const title = document.querySelector('#reader-heading')?.textContent || activeBook?.title;
      const statusText = document.querySelector('#reader-status')?.textContent;
      const paragraphs = Array.from(document.querySelectorAll('.reader-page p')).map(p => p.textContent);
      return { activeView, readingViewDisplay, title, statusText, paragraphCount: paragraphs.length, firstP: paragraphs[0] };
    });
    console.log('   Reader state after import:', readerStatusAfterUpload);

    const importedTitle = readerStatusAfterUpload.title;
    if (!importedTitle || !importedTitle.toLowerCase().includes('adventure')) {
      throw new Error(`FAIL: Custom book title was not formatted or opened in reader: ${importedTitle}`);
    }

    // 4. Inspect shelf before reload
    console.log('   Returning to library view...');
    await page.evaluate(() => window.showView('library'));
    await page.waitForTimeout(300);

    const shelfCheckBeforeReload = await page.evaluate((expectedTitle) => {
      const cards = Array.from(document.querySelectorAll('.mini-book'));
      const customCard = cards.find(c => c.innerText.includes(expectedTitle));
      const inBooksArray = books.some(b => b.title === expectedTitle);
      const inLocalStorage = (localStorage.getItem('wordloom-custom-books') || '').includes(expectedTitle);
      return {
        inBooksArray,
        inLocalStorage,
        cardFound: !!customCard,
        cardCount: cards.length
      };
    }, importedTitle);
    console.log('   Shelf check before reload:', shelfCheckBeforeReload);
    if (!shelfCheckBeforeReload.cardFound) {
      console.warn(`   ⚠️ DEFECT IDENTIFIED: Newly imported custom book "${importedTitle}" is in books array (${shelfCheckBeforeReload.inBooksArray}) and localStorage (${shelfCheckBeforeReload.inLocalStorage}), but renderBooks() was not called on import, so shelf does not reflect the book until reload!`);
    }

    // 5. Reload the page to test persistence across restart
    console.log('   Reloading page to test persistence across reload...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const shelfCheckAfterReload = await page.evaluate((expectedTitle) => {
      const cards = Array.from(document.querySelectorAll('.mini-book'));
      const customCard = cards.find(c => c.innerText.includes(expectedTitle));
      const inBooksArray = books.some(b => b.title === expectedTitle);
      const inLocalStorage = (localStorage.getItem('wordloom-custom-books') || '').includes(expectedTitle);
      return {
        inBooksArray,
        inLocalStorage,
        cardFound: !!customCard,
        cardText: customCard ? customCard.innerText.slice(0, 100) : null
      };
    }, importedTitle);
    console.log('   Shelf check after reload:', shelfCheckAfterReload);
    if (!shelfCheckAfterReload.inBooksArray || !shelfCheckAfterReload.cardFound) {
      throw new Error(`FAIL: Custom book "${importedTitle}" lost from shelf after page reload!`);
    }

    // 6. Open the persisted custom book in the reader
    console.log('   Opening custom book in reader after reload...');
    await page.evaluate((expectedTitle) => window.openReader(expectedTitle), importedTitle);
    await page.waitForTimeout(400);

    const readerStatusAfterReload = await page.evaluate(() => {
      const activeTitle = activeBook?.title;
      const statusText = document.querySelector('#reader-status')?.textContent;
      const paragraphs = Array.from(document.querySelectorAll('.reader-page p')).map(p => p.textContent);
      const isVisible = window.getComputedStyle(document.querySelector('#reading-view')).display !== 'none';
      return { activeTitle, statusText, paragraphCount: paragraphs.length, isVisible };
    });
    console.log('   Reader state after reload open:', readerStatusAfterReload);
    if (!readerStatusAfterReload.isVisible || !readerStatusAfterReload.activeTitle.includes(importedTitle)) {
      throw new Error(`FAIL: Could not open persisted custom book in reader after reload`);
    }

    results.customBooksLifecycle = {
      passed: shelfCheckAfterReload.cardFound && readerStatusAfterReload.isVisible,
      importedTitle,
      shelfBeforeReloadRendered: shelfCheckBeforeReload.cardFound,
      shelfAfterReloadRendered: shelfCheckAfterReload.cardFound,
      readerReopen: readerStatusAfterReload.isVisible
    };

    console.log('   ✓ Custom books lifecycle empirically verified (persistence across reload validated)!\n');
    await page.close();
  }

  // -------------------------------------------------------------------------
  // SUITE 4: EMPTY REVIEW DECK HANDLING & SAMPLE WORD GENERATION
  // -------------------------------------------------------------------------
  console.log('[SUITE 4] Testing Empty Review Deck Handling for All 3 Review Modes...');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

    // Pre-seed session with zero words
    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('wordloom-session', 'active');
      localStorage.setItem('wordloom-saved-words', '[]');
      localStorage.setItem('wordloom-vocabulary-records', '{}');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    // 1. Navigate to Review Hub
    await page.evaluate(() => window.showView('vocabulary'));
    await page.waitForTimeout(300);

    const hubEmptyState = await page.evaluate(() => {
      const emptyEl = document.querySelector('#review-empty-state');
      const stackEl = document.querySelector('#review-method-stack');
      const countEl = document.querySelector('#saved-word-count');
      const stackComputedDisplay = stackEl ? window.getComputedStyle(stackEl).display : null;
      const stackInlineDisplay = stackEl ? stackEl.style.display : null;
      return {
        emptyVisible: emptyEl ? window.getComputedStyle(emptyEl).display !== 'none' : false,
        stackComputedDisplay,
        stackInlineDisplay,
        countText: countEl ? countEl.textContent : null
      };
    });
    console.log('   Review Hub with 0 words:', hubEmptyState);
    if (!hubEmptyState.emptyVisible) {
      throw new Error('FAIL: #review-empty-state should be visible when 0 words saved');
    }
    const stackHiddenProperly = hubEmptyState.stackComputedDisplay === 'none';
    if (!stackHiddenProperly) {
      console.warn(`   ⚠️ DEFECT IDENTIFIED: CSS specificity conflict! showReviewStack() sets stack.style.display = 'none', but CSS rule at line 5576 '.review-method-stack { display: grid !important; }' overrides it! Both empty state and method stack render simultaneously!`);
    }

    // 2. Test direct invocation of Flashcards with 0 words
    console.log('   Testing direct invocation of Flashcards with 0 words...');
    const flashcardEmptyResult = await page.evaluate(() => {
      try {
        activeReviewTab = 'flashcard-stage';
        renderVocabulary();
        const stage = document.querySelector('#flashcard-stage');
        const emptyState = document.querySelector('#review-empty-state');
        return {
          threw: false,
          stageVisible: stage ? window.getComputedStyle(stage).display !== 'none' : false,
          emptyVisible: emptyState ? window.getComputedStyle(emptyState).display !== 'none' : false
        };
      } catch (e) {
        return { threw: true, error: e.message };
      }
    });
    console.log('   Flashcards 0 words handling:', flashcardEmptyResult);
    if (flashcardEmptyResult.threw || flashcardEmptyResult.stageVisible || !flashcardEmptyResult.emptyVisible) {
      throw new Error('FAIL: Flashcards did not safely fallback to empty state when 0 words exist');
    }
    console.log('   ✓ Flashcards falls back safely to empty state.');

    // 3. Test direct invocation of Match It with 0 words
    console.log('   Testing direct invocation of Match It with 0 words...');
    const matchEmptyResult = await page.evaluate(() => {
      try {
        activeReviewTab = 'match-it-app';
        renderVocabulary();
        const app = document.querySelector('#match-it-app');
        const emptyState = document.querySelector('#review-empty-state');
        return {
          threw: false,
          appVisible: app ? window.getComputedStyle(app).display !== 'none' : false,
          emptyVisible: emptyState ? window.getComputedStyle(emptyState).display !== 'none' : false
        };
      } catch (e) {
        return { threw: true, error: e.message };
      }
    });
    console.log('   Match It 0 words handling:', matchEmptyResult);
    if (matchEmptyResult.threw || matchEmptyResult.appVisible || !matchEmptyResult.emptyVisible) {
      throw new Error('FAIL: Match It did not safely fallback to empty state when 0 words exist');
    }
    console.log('   ✓ Match It falls back safely to empty state.');

    // 4. Test direct invocation of Type What You Hear with 0 words
    console.log('   Testing direct invocation of Type What You Hear with 0 words...');
    const ttwEmptyResult = await page.evaluate(() => {
      try {
        activeReviewTab = 'ttw-stage';
        renderVocabulary();
        const stage = document.querySelector('#ttw-stage');
        const noWordsEl = document.querySelector('#ttw-no-words');
        const sampleBtn = document.querySelector('#ttw-use-sample');
        return {
          threw: false,
          stageVisible: stage ? window.getComputedStyle(stage).display !== 'none' : false,
          noWordsVisible: noWordsEl ? noWordsEl.classList.contains('ttw-visible') : false,
          hasSampleBtn: !!sampleBtn
        };
      } catch (e) {
        return { threw: true, error: e.message };
      }
    });
    console.log('   Type What You Hear 0 words handling:', ttwEmptyResult);
    if (ttwEmptyResult.threw || !ttwEmptyResult.noWordsVisible || !ttwEmptyResult.hasSampleBtn) {
      throw new Error('FAIL: TTW did not show #ttw-no-words state or sample button when 0 words exist');
    }
    console.log('   ✓ TTW displays dedicated #ttw-no-words with sample practice button.');

    // 5. Test clicking #ttw-use-sample in TTW empty state
    console.log('   Clicking #ttw-use-sample in TTW empty state...');
    await page.click('#ttw-use-sample');
    await page.waitForTimeout(400);

    const ttwSampleStarted = await page.evaluate(() => {
      const stage = document.querySelector('#ttw-stage');
      const inputEl = document.querySelector('#ttw-input');
      const wordsCount = ttwState?.words?.length || 0;
      const isNoWordsHidden = !stage.classList.contains('ttw-showing-no-words');
      return { wordsCount, inputVisible: !!inputEl, isNoWordsHidden };
    });
    console.log('   TTW sample session started:', ttwSampleStarted);
    if (ttwSampleStarted.wordsCount === 0 || !ttwSampleStarted.isNoWordsHidden) {
      throw new Error('FAIL: TTW sample practice did not start cleanly from empty state');
    }
    console.log('   ✓ TTW sample practice starts cleanly on demand.');

    // 6. Test #review-load-sample from main Review Hub
    console.log('   Testing #review-load-sample from main Review Hub...');
    await page.evaluate(() => {
      savedWords.clear();
      vocabularyRecords = {};
      localStorage.setItem('wordloom-saved-words', '[]');
      localStorage.setItem('wordloom-vocabulary-records', '{}');
      activeReviewTab = null;
      renderVocabulary();
      window.showView('vocabulary');
    });
    await page.waitForTimeout(300);

    await page.click('#review-load-sample');
    await page.waitForTimeout(400);

    const hubSampleLoaded = await page.evaluate(() => {
      const emptyEl = document.querySelector('#review-empty-state');
      const stackEl = document.querySelector('#review-method-stack');
      const recordsCount = Object.keys(vocabularyRecords).length;
      const savedCount = savedWords.size;
      return {
        recordsCount,
        savedCount,
        emptyDisplay: emptyEl ? window.getComputedStyle(emptyEl).display : null,
        stackDisplay: stackEl ? window.getComputedStyle(stackEl).display : null
      };
    });
    console.log('   Hub sample loaded result:', hubSampleLoaded);
    if (hubSampleLoaded.recordsCount === 0 || hubSampleLoaded.emptyDisplay !== 'none') {
      throw new Error('FAIL: #review-load-sample did not populate sample deck and hide empty state');
    }
    console.log('   ✓ Hub sample deck loaded successfully, populating records and sample words.');

    results.emptyReviewDecks = {
      passed: true,
      hubEmptyState: hubEmptyState.emptyVisible,
      stackHiddenProperly,
      flashcardHandled: !flashcardEmptyResult.threw,
      matchHandled: !matchEmptyResult.threw,
      ttwHandled: ttwEmptyResult.noWordsVisible && ttwSampleStarted.wordsCount > 0,
      hubSampleLoaded: hubSampleLoaded.recordsCount > 0
    };

    console.log('   ✓ All 3 review modes handle 0 saved words gracefully with sample generation!\n');
    await page.close();
  }

  // Clean up temporary text file
  try { fs.unlinkSync(TEST_TXT_PATH); } catch (e) {}

  await browser.close();

  console.log('================================================================');
  console.log('               CHALLENGER 2 AUDIT SCORECARD                     ');
  console.log('================================================================');
  console.log(`  [${results.persistenceRoundTrip.passed ? 'PASS' : 'FAIL'}] 1. Cross-Session Storage Persistence & UI State Round-Trip`);
  console.log(`         - wordloom-mood DOM Restoration: ${results.persistenceRoundTrip.moodDomRestored ? 'PASS' : 'DEFECT (not applied to body on reload)'}`);
  console.log(`  [${results.corruptedStorage.passed ? 'PASS' : 'FAIL'}] 2. Corrupted Storage Injection & Graceful Recovery`);
  const crashedKeys = results.corruptedStorage.findings.filter(f => f.crashed).map(f => f.key);
  if (crashedKeys.length > 0) {
    console.log(`         - Crashed keys (Uncaught SyntaxError on boot): ${crashedKeys.join(', ')}`);
  }
  console.log(`  [${results.customBooksLifecycle.passed ? 'PASS' : 'FAIL'}] 3. Custom Books Import, Shelf, Reload & Reader Opening`);
  console.log(`         - Immediate Shelf Render on Ingestion: ${results.customBooksLifecycle.shelfBeforeReloadRendered ? 'PASS' : 'DEFECT (renderBooks() omitted on import)'}`);
  console.log(`  [${results.emptyReviewDecks.passed ? 'PASS' : 'FAIL'}] 4. Empty Review Deck Handling for Flashcards, Match It, & TTW`);
  console.log(`         - Stack hidden on empty state: ${results.emptyReviewDecks.stackHiddenProperly ? 'PASS' : 'DEFECT (CSS !important keeps stack visible)'}`);
  console.log('================================================================\n');

  // Output JSON for reporting
  fs.writeFileSync(path.resolve(__dirname, 'challenger2_results.json'), JSON.stringify(results, null, 2), 'utf8');

  // Exit with code 0 if all passed, 1 if defects found
  const overallSuccess = results.persistenceRoundTrip.passed &&
                         results.persistenceRoundTrip.moodDomRestored &&
                         results.corruptedStorage.passed &&
                         results.customBooksLifecycle.passed &&
                         results.customBooksLifecycle.shelfBeforeReloadRendered &&
                         results.emptyReviewDecks.passed &&
                         results.emptyReviewDecks.stackHiddenProperly;

  process.exit(overallSuccess ? 0 : 1);
})().catch(err => {
  console.error('\n❌ ADVERSARIAL HARNESS EXECUTION ERROR:', err);
  try { fs.unlinkSync(TEST_TXT_PATH); } catch (e) {}
  process.exit(1);
});
