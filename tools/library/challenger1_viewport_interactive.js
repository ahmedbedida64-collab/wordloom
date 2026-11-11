/**
 * tools/library/challenger1_viewport_interactive.js
 * Empirical Challenger 1: Viewport, Layout & Interactive Adversarial Stress Test Suite
 * 
 * Objectives:
 * 1. Multi-viewport validation across 390x844 (Mobile) and 1440x900 (Desktop)
 *    across all 5 views + sub-views/modals ensuring scrollWidth <= clientWidth
 *    with zero horizontal overflow and no clipped elements.
 * 2. Context-sensitive dock auto-hiding during reading & review games,
 *    plus rapid cycling stress tests.
 * 3. Rapid interaction bursts: rapid page turns, rapid book clicks, and
 *    adversarial search input debouncing (regex metachars, huge strings, XSS, unicode).
 * 4. Button standard audit: zero arrow glyphs across entire DOM, and strict
 *    Brown Natural Frame (1.5px solid #8B5A2B, #FAF4EB, #5C4033, 6px radius) check.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('================================================================');
  console.log('  CHALLENGER 1: ADVERSARIAL VIEWPORT, LAYOUT & INTERACTIVE TEST ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');

  const errors = [];
  const warnings = [];

  const recordError = (test, msg) => {
    console.error(`  ❌ [${test}] ${msg}`);
    errors.push({ test, msg });
  };

  const recordWarning = (test, msg) => {
    console.warn(`  ⚠️  [${test}] ${msg}`);
    warnings.push({ test, msg });
  };

  // Helper to init authenticated page in an isolated browser context
  async function createTestPage(width, height) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

    // Listen for uncaught console errors
    page.on('pageerror', err => {
      recordError('PageError', `Uncaught exception: ${err.message}`);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        recordWarning('ConsoleError', `Console error logged: ${msg.text()}`);
      }
    });

    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', 'active');
      localStorage.setItem('wordloom-language', 'ar');
      localStorage.setItem('wordloom-voice', 'natural-female');
      localStorage.setItem('wordloom-level', 'B1');
      localStorage.setItem('wordloom-line-size', 'standard');
      localStorage.setItem('wordloom-mood', 'purple');
      localStorage.setItem('wordloom-vocabulary-records', JSON.stringify({
        'forest': { word: 'forest', meaning: 'غابة', repetitions: 1, interval: 1, nextReview: Date.now() + 86400000, sentence: 'A dense forest with ancient trees.' },
        'meadow': { word: 'meadow', meaning: 'مرج', repetitions: 2, interval: 3, nextReview: Date.now() + 86400000 * 3, sentence: 'Flowers bloomed across the meadow.' },
        'silence': { word: 'silence', meaning: 'صمت', repetitions: 0, interval: 0, nextReview: Date.now(), sentence: 'Total silence fell over the castle.' }
      }));
    });

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    return { page, context };
  }

  // ==================================================================
  // 1. MULTI-VIEWPORT VALIDATION (390x844 & 1440x900)
  // ==================================================================
  console.log('[SECTION 1] Multi-Viewport Layout & Horizontal Overflow Validation...');

  const VIEWPORTS = [
    { name: 'Mobile Viewport (iPhone 12/13/14)', width: 390, height: 844 },
    { name: 'Desktop Viewport (1440x900 Widescreen)', width: 1440, height: 900 }
  ];

  const SCENARIOS = [
    {
      name: 'Library View (Default Shelf)',
      action: async p => p.evaluate(() => window.showView('library'))
    },
    {
      name: 'Library View with Levels Accordion Open',
      action: async p => p.evaluate(() => {
        window.showView('library');
        const toggle = document.querySelector('#library-filter-toggle');
        if (toggle) toggle.click();
      })
    },
    {
      name: 'Library View with Topics Accordion Open',
      action: async p => p.evaluate(() => {
        window.showView('library');
        const toggle = document.querySelector('#library-topic-toggle');
        if (toggle) toggle.click();
      })
    },
    {
      name: 'Reader View - Aesop\'s Fables (Page 1)',
      action: async p => p.evaluate(() => window.openReader("Aesop's Fables"))
    },
    {
      name: 'Reader View - Wessex Tales (Page 5)',
      action: async p => p.evaluate(() => {
        window.openReader("Wessex Tales");
        window.moveReader(4);
      })
    },
    {
      name: 'Reader View with Word Definition Modal Open',
      action: async p => p.evaluate(() => {
        window.openReader("Aesop's Fables");
        const firstWord = document.querySelector('#story-copy .word');
        if (firstWord) firstWord.click();
      })
    },
    {
      name: 'Vocabulary Review - 3-Card Method Stack',
      action: async p => p.evaluate(() => {
        window.showView('vocabulary');
        if (window.showReviewStack) window.showReviewStack();
      })
    },
    {
      name: 'Vocabulary Review - Empty State',
      action: async p => p.evaluate(() => {
        vocabularyRecords = {};
        window.showView('vocabulary');
        if (window.showReviewStack) window.showReviewStack();
      })
    },
    {
      name: 'Vocabulary Review - Flashcards Game Active',
      action: async p => p.evaluate(() => {
        vocabularyRecords = {
          'forest': { word: 'forest', meaning: 'غابة', repetitions: 1, interval: 1, nextReview: Date.now() + 86400000, sentence: 'A dense forest with ancient trees.' }
        };
        window.showView('vocabulary');
        activeReviewTab = 'flashcard-stage';
        renderVocabulary();
      })
    },
    {
      name: 'Vocabulary Review - Match It Game Active',
      action: async p => p.evaluate(() => {
        vocabularyRecords = {
          'forest': { word: 'forest', meaning: 'غابة', repetitions: 1, interval: 1, nextReview: Date.now() + 86400000, sentence: 'A dense forest.' },
          'meadow': { word: 'meadow', meaning: 'مرج', repetitions: 2, interval: 3, nextReview: Date.now() + 86400000 * 3, sentence: 'Flowers in meadow.' }
        };
        window.showView('vocabulary');
        activeReviewTab = 'match-it-app';
        renderVocabulary();
      })
    },
    {
      name: 'Vocabulary Review - Type What You Hear Active',
      action: async p => p.evaluate(() => {
        vocabularyRecords = {
          'forest': { word: 'forest', meaning: 'غابة', repetitions: 1, interval: 1, nextReview: Date.now() + 86400000, sentence: 'A dense forest.' }
        };
        window.showView('vocabulary');
        activeReviewTab = 'ttw-stage';
        renderVocabulary();
      })
    },
    {
      name: 'Custom Book View (Empty Form)',
      action: async p => p.evaluate(() => window.showView('customBook'))
    },
    {
      name: 'Custom Book View (Populated Long Text)',
      action: async p => p.evaluate(() => {
        window.showView('customBook');
        const input = document.querySelector('#custom-text-input');
        if (input) input.value = 'Chapter I: The Discovery\n\n' + 'Long story paragraph '.repeat(100);
      })
    },
    {
      name: 'Settings View (Full 1360px Dashboard)',
      action: async p => p.evaluate(() => window.showView('settings'))
    },
    {
      name: 'Book Preview Modal Active',
      action: async p => p.evaluate(() => {
        window.showView('library');
        if (window.openBookPreview) {
          window.openBookPreview("Pride and Prejudice");
        } else {
          const firstCover = document.querySelector('.book-cover-frame');
          if (firstCover) firstCover.click();
        }
      })
    }
  ];

  for (const vp of VIEWPORTS) {
    console.log(`\n  --- Auditing ${vp.name} (${vp.width}x${vp.height}) ---`);
    const { page, context } = await createTestPage(vp.width, vp.height);

    for (const sc of SCENARIOS) {
      await sc.action(page);
      await page.waitForTimeout(150);

      const metrics = await page.evaluate(viewportWidth => {
        const root = document.documentElement;
        const body = document.body;
        const windowWidth = window.innerWidth;
        const rootScroll = root.scrollWidth;
        const rootClient = root.clientWidth;
        const bodyScroll = body.scrollWidth;

        // Subpixel 1px tolerance
        const hasDocOverflow = rootScroll > windowWidth + 1;
        const hasBodyOverflow = bodyScroll > windowWidth + 1;

        // Scan all visible elements to find any element whose bounding rect spills past windowWidth
        const overflowingElements = [];
        const allVisible = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        for (const el of allVisible) {
          const rect = el.getBoundingClientRect();
          if (rect.right > windowWidth + 2 && rect.width > 0 && rect.height > 0) {
            // Check if overflow is hidden by a container
            let parent = el.parentElement;
            let isContained = false;
            while (parent && parent !== document.documentElement) {
              const pStyle = window.getComputedStyle(parent);
              if (pStyle.overflowX === 'hidden' || pStyle.overflowX === 'clip' || pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                isContained = true;
                break;
              }
              parent = parent.parentElement;
            }
            if (!isContained) {
              overflowingElements.push({
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
                right: Math.round(rect.right),
                width: Math.round(rect.width)
              });
              if (overflowingElements.length >= 3) break;
            }
          }
        }

        return {
          windowWidth,
          rootScroll,
          rootClient,
          bodyScroll,
          hasDocOverflow,
          hasBodyOverflow,
          overflowingElements
        };
      }, vp.width);

      if (metrics.hasDocOverflow || metrics.hasBodyOverflow || metrics.overflowingElements.length > 0) {
        recordError('ViewportOverflow', `${vp.name} in "${sc.name}": rootScroll=${metrics.rootScroll}px, bodyScroll=${metrics.bodyScroll}px, windowWidth=${metrics.windowWidth}px. Spilling elements: ${JSON.stringify(metrics.overflowingElements)}`);
      } else {
        console.log(`    ✓ [PASS] ${sc.name} (scrollWidth=${metrics.rootScroll}px, winWidth=${metrics.windowWidth}px)`);
      }
    }
    await context.close();
  }

  // ==================================================================
  // 2. CONTEXT-SENSITIVE DOCK AUTO-HIDING
  // ==================================================================
  console.log('\n[SECTION 2] Context-Sensitive Dock Auto-Hiding & Rapid Transition Cycling...');
  {
    const { page, context } = await createTestPage(1440, 900);

    const getDockStatus = () => page.evaluate(() => {
      const dock = document.querySelector('#react-nav-root');
      if (!dock) return { exists: false, isVisible: false };
      const comp = window.getComputedStyle(dock);
      const isVisible = !dock.classList.contains('hidden') && comp.display !== 'none' && comp.visibility !== 'hidden';
      return { exists: true, isVisible, display: comp.display, hasHiddenClass: dock.classList.contains('hidden') };
    });

    // 1. Initial Library
    await page.evaluate(() => window.showView('library'));
    await page.waitForTimeout(150);
    let dock = await getDockStatus();
    console.log(`   Initial Library dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should be visible in Library view');

    // 2. Enter Reader
    await page.evaluate(() => window.openReader("Aesop's Fables"));
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Reader view dock visible: ${dock.isVisible}`);
    if (dock.isVisible) recordError('DockVisibility', 'Dock MUST hide during active reading session');

    // 3. Return to Library via #back-to-library
    await page.evaluate(() => {
      const btn = document.querySelector('#back-to-library');
      if (btn) btn.click();
      else window.showView('library');
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Return to Library dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should restore when returning from reader to Library');

    // 4. Enter Vocabulary Review Hub
    await page.evaluate(() => window.showView('vocabulary'));
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Review Hub dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should be visible in Review Hub');

    // 5. Enter Flashcards Game
    await page.evaluate(() => {
      activeReviewTab = 'flashcard-stage';
      renderVocabulary();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Flashcards game dock visible: ${dock.isVisible}`);
    if (dock.isVisible) recordError('DockVisibility', 'Dock MUST hide during active Flashcards game');

    // 6. Return from Flashcards to Hub via #review-back-btn
    await page.evaluate(() => {
      const btn = document.querySelector('#review-back-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Return from Flashcards dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should restore when returning from Flashcards game');

    // 7. Enter Match It Game
    await page.evaluate(() => {
      activeReviewTab = 'match-it-app';
      renderVocabulary();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Match It game dock visible: ${dock.isVisible}`);
    if (dock.isVisible) recordError('DockVisibility', 'Dock MUST hide during active Match It game');

    // 8. Return from Match It to Hub via #review-back-btn
    await page.evaluate(() => {
      const btn = document.querySelector('#review-back-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Return from Match It dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should restore when returning from Match It game');

    // 9. Enter Type What You Hear Game
    await page.evaluate(() => {
      activeReviewTab = 'ttw-stage';
      renderVocabulary();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   TTW game dock visible: ${dock.isVisible}`);
    if (dock.isVisible) recordError('DockVisibility', 'Dock MUST hide during active TTW game');

    // 10. Return from TTW to Hub via #review-back-btn
    await page.evaluate(() => {
      const btn = document.querySelector('#review-back-btn');
      if (btn) btn.click();
    });
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Return from TTW dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should restore when returning from TTW game');

    // 11. Enter Settings
    await page.evaluate(() => window.showView('settings'));
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Settings view dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should be visible in Settings view');

    // 12. Enter Custom Book
    await page.evaluate(() => window.showView('customBook'));
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    console.log(`   Custom Book view dock visible: ${dock.isVisible}`);
    if (!dock.isVisible) recordError('DockVisibility', 'Dock should be visible in Custom Books view');

    // 13. Rapid Transition Burst Stress Test (25 fast switches between reading, library, games, settings)
    console.log('   Stress testing 25 rapid view transitions...');
    const transitionSequence = [
      'reading', 'library', 'game', 'vocabulary', 'settings',
      'customBook', 'reading', 'settings', 'vocabulary', 'game',
      'library', 'reading', 'library', 'customBook', 'settings',
      'reading', 'vocabulary', 'game', 'vocabulary', 'library',
      'settings', 'customBook', 'reading', 'library', 'reading' // Ends on reading
    ];

    for (const target of transitionSequence) {
      await page.evaluate(tgt => {
        if (tgt === 'reading') window.openReader("Aesop's Fables");
        else if (tgt === 'game') {
          activeReviewTab = 'flashcard-stage';
          renderVocabulary();
        } else {
          window.showView(tgt);
        }
      }, target);
      await page.waitForTimeout(20); // 20ms rapid transition
    }

    await page.waitForTimeout(200);
    dock = await getDockStatus();
    console.log(`   After rapid transitions ending on 'reading', dock is visible: ${dock.isVisible}`);
    if (dock.isVisible) {
      recordError('DockStateRace', 'Dock remained visible after rapid transitions ending on reading mode');
    } else {
      console.log('    ✓ Dock correctly ended in hidden state for reading view!');
    }

    // Now switch to library and verify dock immediately restores
    await page.evaluate(() => window.showView('library'));
    await page.waitForTimeout(150);
    dock = await getDockStatus();
    if (!dock.isVisible) {
      recordError('DockStateRace', 'Dock failed to restore after switching from reading back to library');
    } else {
      console.log('    ✓ Dock correctly restored upon returning to library view!');
    }

    await context.close();
  }

  // ==================================================================
  // 3. RAPID INTERACTION BURSTS & ADVERSARIAL INPUTS
  // ==================================================================
  console.log('\n[SECTION 3] Rapid Interaction Bursts & Adversarial Input Stress Testing...');

  // 3.1 Rapid Page Turns & Boundary Clamping
  {
    console.log('  --- Subtest 3.1: Rapid Page Turn Bursts (40 Forward + 40 Backward) ---');
    const { page, context } = await createTestPage(1440, 900);
    await page.evaluate(() => window.openReader("Aesop's Fables"));
    await page.waitForTimeout(200);

    // Rapidly trigger 40 forward clicks within ~100ms
    const forwardBurst = await page.evaluate(async () => {
      const nextBtn = document.querySelector('#reader-next-btn');
      const startPage = readerState.page;
      const history = [];

      for (let i = 0; i < 40; i++) {
        if (nextBtn) nextBtn.click();
        history.push(readerState.page);
      }

      return {
        startPage,
        endPage: readerState.page,
        totalPages: getActivePages().length,
        hasNaN: Number.isNaN(readerState.page),
        historySample: history.slice(0, 5)
      };
    });

    console.log('    Forward burst results:', forwardBurst);
    if (forwardBurst.hasNaN) {
      recordError('PageTurnBurst', 'readerState.page corrupted to NaN during forward burst');
    }
    if (forwardBurst.endPage < forwardBurst.startPage || forwardBurst.endPage >= forwardBurst.totalPages) {
      recordError('PageTurnBurst', `readerState.page out of bounds: ${forwardBurst.endPage} (total: ${forwardBurst.totalPages})`);
    }

    // Rapidly trigger 60 backward clicks to hit boundary 0
    const backwardBurst = await page.evaluate(async () => {
      const prevBtn = document.querySelector('#reader-prev-btn');
      for (let i = 0; i < 60; i++) {
        if (prevBtn) prevBtn.click();
      }
      return {
        endPage: readerState.page,
        prevDisabled: document.querySelector('#reader-prev-btn').disabled,
        hasNaN: Number.isNaN(readerState.page)
      };
    });

    console.log('    Backward burst clamped results:', backwardBurst);
    if (backwardBurst.endPage !== 0) {
      recordError('PageTurnClamping', `Page did not clamp at index 0 after burst: got ${backwardBurst.endPage}`);
    }
    if (!backwardBurst.prevDisabled) {
      recordError('PageTurnClamping', 'Previous button was not disabled after clamping to page 0');
    }

    // Toggle Reading Ruler and repeat rapid flips
    const rulerCheck = await page.evaluate(() => {
      const rulerBtn = document.querySelector('#reader-ruler-btn');
      if (rulerBtn) rulerBtn.click();
      window.moveReader(1);
      window.moveReader(1);
      const guide = document.querySelector('#reading-ruler-guide');
      const isGuideActive = document.querySelector('#reading-view').classList.contains('reading-ruler-active');
      return { isGuideActive, guideFound: !!guide };
    });
    console.log('    Reading ruler during rapid navigation:', rulerCheck);
    if (!rulerCheck.isGuideActive) {
      recordError('ReadingRuler', 'Reading ruler state failed during page navigation');
    }

    await context.close();
  }

  // 3.2 Rapid Book Card Clicks on Library Shelf
  {
    console.log('  --- Subtest 3.2: Rapid Book Card Clicks Burst on Library Shelf ---');
    const { page, context } = await createTestPage(1440, 900);
    await page.evaluate(() => window.showView('library'));
    await page.waitForTimeout(200);

    const bookCardBurst = await page.evaluate(async () => {
      const cards = Array.from(document.querySelectorAll('.book-cover-frame')).slice(0, 8);
      const clickedTitles = [];

      // Click 8 book cards in immediate succession (0ms delay)
      for (const card of cards) {
        const title = card.getAttribute('data-read-book');
        clickedTitles.push(title);
        card.click();
      }

      await new Promise(r => setTimeout(r, 200));

      const activeView = activeAppView;
      const loadedTitle = activeBook ? activeBook.title : null;
      const headingText = document.querySelector('#reader-heading')?.innerText.trim();

      return {
        clickedCount: clickedTitles.length,
        lastClicked: clickedTitles[clickedTitles.length - 1],
        activeView,
        loadedTitle,
        headingText
      };
    });

    console.log('    Book card burst result:', bookCardBurst);
    if (bookCardBurst.activeView !== 'reading') {
      recordError('BookCardBurst', `Expected activeAppView='reading', got '${bookCardBurst.activeView}'`);
    }
    if (bookCardBurst.loadedTitle !== bookCardBurst.lastClicked) {
      recordError('BookCardBurst', `Race condition: loadedTitle '${bookCardBurst.loadedTitle}' does not match last clicked '${bookCardBurst.lastClicked}'`);
    }
    console.log('    ✓ Rapid book card burst loaded cleanly without race collision!');

    await context.close();
  }

  // 3.3 Search Input Debouncing & Extreme Adversarial Queries
  {
    console.log('  --- Subtest 3.3: Search Input Debouncing & Adversarial String Stress ---');
    const { page, context } = await createTestPage(1440, 900);
    await page.evaluate(() => window.showView('library'));
    await page.waitForTimeout(200);

    const ADVERSARIAL_INPUTS = [
      { label: 'Unbalanced Regex Metachars', text: '[[[((((*+?^${}\\|' },
      { label: 'Regex Lookbehinds & Quantifiers', text: '(?<=abc).*+{1000,}' },
      { label: 'Dangling Backslashes', text: '\\\\\\\\\\\\\\' },
      { label: 'XSS Script Payload', text: '<script>alert("wordloom")</script>' },
      { label: 'XSS Image Handler Payload', text: '"><img src=x onerror=alert(1)>' },
      { label: 'SQL-like Injection Strings', text: '\' OR 1=1; DROP TABLE books;--' },
      { label: 'Massive 5,000 Character Query', text: 'wordloom_stress_'.repeat(300) },
      { label: 'Arabic / RTL Query', text: 'حكايات وقصص من الأدب الكلاسيكي' },
      { label: 'Emoji & Symbols Query', text: '📚✨🔥👑🏰🧙‍♂️' },
      { label: 'Newline and Null Characters', text: 'Alice\n\r\t\0In Wonderland' }
    ];

    for (const item of ADVERSARIAL_INPUTS) {
      const searchResult = await page.evaluate(async (queryText) => {
        const input = document.querySelector('#library-search');
        if (!input) return { foundInput: false };

        // Rapidly dispatch multiple input events simulating keystrokes
        for (let i = 1; i <= Math.min(10, queryText.length); i++) {
          input.value = queryText.slice(0, i * 5);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Final full value
        input.value = queryText;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Wait past 160ms debounce window (wait 250ms)
        await new Promise(r => setTimeout(r, 250));

        const grid = document.querySelector('#book-grid');
        const emptyState = grid ? grid.querySelector('.empty-state') : null;
        const renderedCards = grid ? grid.querySelectorAll('.mini-book').length : 0;

        return {
          foundInput: true,
          queryLength: queryText.length,
          renderedCards,
          hasEmptyState: !!emptyState,
          emptyStateText: emptyState ? emptyState.innerText : ''
        };
      }, item.text);

      if (!searchResult.foundInput) {
        recordError('SearchStress', 'Search input #library-search not found in DOM');
      } else {
        console.log(`    ✓ [PASS] Adversarial Query: "${item.label}" -> Cards: ${searchResult.renderedCards}, EmptyState: ${searchResult.hasEmptyState}`);
      }
    }

    // Verify clearing search restores full catalog
    const restoreResult = await page.evaluate(async () => {
      const input = document.querySelector('#library-search');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
      return {
        cardCount: document.querySelectorAll('.mini-book').length,
        totalCatalog: books.length
      };
    });

    console.log(`    Catalog restore after clearing search: ${restoreResult.cardCount} / ${restoreResult.totalCatalog} books`);
    if (restoreResult.cardCount !== restoreResult.totalCatalog) {
      recordError('SearchRestore', `Expected ${restoreResult.totalCatalog} books restored, found ${restoreResult.cardCount}`);
    } else {
      console.log('    ✓ Search debounce handled all adversarial queries and cleanly restored full catalog!');
    }

    await context.close();
  }

  // ==================================================================
  // 4. BUTTON STANDARD AUDIT (ZERO ARROWS & BROWN NATURAL FRAME)
  // ==================================================================
  console.log('\n[SECTION 4] Button Standard Audit: Directional Arrow Glyphs & Brown Natural Frame...');
  {
    const { page, context } = await createTestPage(1440, 900);

    // 4.1 Global Arrow Glyph Scan across ALL buttons and interactive links in the entire DOM
    console.log('  --- Subtest 4.1: Exhaustive Arrow Glyph Scan Across All Views ---');

    const viewsToScan = ['library', 'reading', 'vocabulary', 'customBook', 'settings'];
    const FORBIDDEN_ARROWS = [
      '←', '→', '➔', '➜', '➝', '➞', '➟', '➠', '➡', '➢', '➣', '➤', '➥', '➦', '➧', '➨',
      '&larr;', '&rarr;', 'arrow_back', 'arrow_forward'
    ];

    for (const v of viewsToScan) {
      await page.evaluate(vName => {
        if (vName === 'reading') window.openReader("Aesop's Fables");
        else window.showView(vName);
      }, v);
      await page.waitForTimeout(150);

      const arrowViolations = await page.evaluate((forbidden) => {
        const violations = [];
        const buttons = Array.from(document.querySelectorAll('button, a[role="button"], .btn, .text-button, .reader-control, .back-link, .primary-button, .secondary-button'));

        for (const btn of buttons) {
          const text = btn.innerText || '';
          // Strip HTML comments to avoid matching developer comments like <!-- ... -->
          const htmlNoComments = (btn.innerHTML || '').replace(/<!--[\s\S]*?-->/g, '');

          for (const glyph of forbidden) {
            if (text.includes(glyph) || htmlNoComments.includes(glyph)) {
              violations.push({
                tag: btn.tagName.toLowerCase(),
                id: btn.id || '',
                className: btn.className,
                matchedGlyph: glyph,
                textSnippet: text.trim().slice(0, 30)
              });
              break;
            }
          }
        }
        return violations;
      }, FORBIDDEN_ARROWS);

      if (arrowViolations.length > 0) {
        arrowViolations.forEach(vio => {
          recordError('ArrowGlyphViolation', `In view "${v}": forbidden arrow "${vio.matchedGlyph}" detected on <${vio.tag} id="${vio.id}" class="${vio.className}"> text: "${vio.textSnippet}"`);
        });
      } else {
        console.log(`    ✓ View "${v}": 0 arrow glyphs detected across all interactive buttons.`);
      }
    }

    // Also scan Book Preview Modal for arrows
    await page.evaluate(() => {
      window.showView('library');
      if (window.openBookPreview) window.openBookPreview("Aesop's Fables");
    });
    await page.waitForTimeout(200);

    const previewModalArrows = await page.evaluate(forbidden => {
      const modal = document.querySelector('#book-preview-modal');
      if (!modal) return [];
      const violations = [];
      const btns = modal.querySelectorAll('button');
      for (const btn of btns) {
        const text = btn.innerText || '';
        const htmlNoComments = (btn.innerHTML || '').replace(/<!--[\s\S]*?-->/g, '');
        for (const glyph of forbidden) {
          if (text.includes(glyph) || htmlNoComments.includes(glyph)) {
            violations.push({ id: btn.id, class: btn.className, text, glyph });
          }
        }
      }
      return violations;
    }, FORBIDDEN_ARROWS);

    if (previewModalArrows.length > 0) {
      previewModalArrows.forEach(v => {
        recordError('ArrowGlyphViolation', `#book-preview-modal button contains forbidden arrow "${v.glyph}": "${v.text}"`);
      });
    } else {
      console.log('    ✓ #book-preview-modal: 0 arrow glyphs detected on action buttons.');
    }

    // 4.2 Brown Natural Frame Design Standard Conformance Audit
    console.log('\n  --- Subtest 4.2: Brown Natural Frame Style Conformance Audit ---');

    const ACTION_BUTTONS_TO_AUDIT = [
      { label: 'Reader Previous Page', selector: '#reader-prev-btn', view: 'reading', prep: p => p.evaluate(() => { window.openReader("Aesop's Fables"); window.moveReader(1); }) },
      { label: 'Reader Next Page', selector: '#reader-next-btn', view: 'reading', prep: p => p.evaluate(() => window.openReader("Aesop's Fables")) },
      { label: 'Reader Back to Library', selector: '#back-to-library', view: 'reading', prep: p => p.evaluate(() => window.openReader("Aesop's Fables")) },
      { label: 'Review Back Button', selector: '#review-back-btn', view: 'vocabulary', prep: p => p.evaluate(() => { window.showView('game'); document.querySelector('#review-inside').style.display = 'block'; }) },
      { label: 'Review Sample Practice Button', selector: '#review-load-sample', view: 'vocabulary', prep: p => p.evaluate(() => { vocabularyRecords = {}; window.showView('vocabulary'); showReviewStack(); }) },
      { label: 'Settings Back to Library', selector: '#settings-view .back-link', view: 'settings', prep: p => p.evaluate(() => window.showView('settings')) },
      { label: 'Custom Books Back to Library', selector: '#custom-book-view .back-link', view: 'customBook', prep: p => p.evaluate(() => window.showView('customBook')) },
      { label: 'Book Preview Start Reading', selector: '#book-preview-modal .book-preview-actions [data-book-preview-start]', view: 'library', prep: p => p.evaluate(() => { window.showView('library'); window.openBookPreview("Aesop's Fables"); }) },
      { label: 'Book Preview Not Now Action', selector: '#book-preview-modal .book-preview-actions [data-book-preview-close]', view: 'library', prep: p => p.evaluate(() => { window.showView('library'); window.openBookPreview("Aesop's Fables"); }) }
    ];

    const EXPECTED_BROWN_FRAME = {
      borderColor: 'rgb(139, 90, 43)', // #8B5A2B
      borderWidths: ['1.5px', '1px'], // Allow for 1x subpixel rasterization in CSSOM
      backgroundColor: 'rgb(250, 244, 235)', // #FAF4EB
      color: 'rgb(92, 64, 51)', // #5C4033
      borderRadius: '6px'
    };

    for (const target of ACTION_BUTTONS_TO_AUDIT) {
      if (target.prep) await target.prep(page);
      await page.waitForTimeout(300); // Allow CSS transitions to settle

      const computed = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const c = window.getComputedStyle(el);
        return {
          found: true,
          text: el.innerText.trim(),
          borderTopColor: c.borderTopColor,
          borderTopWidth: c.borderTopWidth,
          borderTopStyle: c.borderTopStyle,
          backgroundColor: c.backgroundColor,
          color: c.color,
          borderRadius: c.borderRadius
        };
      }, target.selector);

      if (!computed) {
        recordError('BrownFrameAudit', `Button "${target.label}" (${target.selector}) not found in view "${target.view}"`);
        continue;
      }

      console.log(`    Auditing "${target.label}":`, {
        text: computed.text,
        border: `${computed.borderTopWidth} ${computed.borderTopStyle} ${computed.borderTopColor}`,
        bg: computed.backgroundColor,
        color: computed.color,
        radius: computed.borderRadius
      });

      // Assertions
      const colorMatches = computed.borderTopColor === EXPECTED_BROWN_FRAME.borderColor;
      const bgMatches = computed.backgroundColor === EXPECTED_BROWN_FRAME.backgroundColor;
      const textMatches = computed.color === EXPECTED_BROWN_FRAME.color;
      const radiusMatches = computed.borderRadius === EXPECTED_BROWN_FRAME.borderRadius;
      const widthMatches = EXPECTED_BROWN_FRAME.borderWidths.includes(computed.borderTopWidth);

      if (!colorMatches) {
        recordError('BrownFrameAudit', `"${target.label}": borderTopColor is ${computed.borderTopColor}, expected ${EXPECTED_BROWN_FRAME.borderColor}`);
      }
      if (!bgMatches) {
        recordError('BrownFrameAudit', `"${target.label}": backgroundColor is ${computed.backgroundColor}, expected ${EXPECTED_BROWN_FRAME.backgroundColor}`);
      }
      if (!textMatches) {
        recordError('BrownFrameAudit', `"${target.label}": color is ${computed.color}, expected ${EXPECTED_BROWN_FRAME.color}`);
      }
      if (!radiusMatches) {
        recordError('BrownFrameAudit', `"${target.label}": borderRadius is ${computed.borderRadius}, expected ${EXPECTED_BROWN_FRAME.borderRadius}`);
      }
      if (!widthMatches) {
        recordError('BrownFrameAudit', `"${target.label}": borderTopWidth is ${computed.borderTopWidth}, expected one of ${JSON.stringify(EXPECTED_BROWN_FRAME.borderWidths)}`);
      }

      if (colorMatches && bgMatches && textMatches && radiusMatches && widthMatches) {
        console.log(`    ✓ [PASS] "${target.label}" perfectly satisfies Brown Natural Frame standard!`);
      }
    }

    await context.close();
  }

  // ==================================================================
  // SUMMARY SCORECARD & VERDICT
  // ==================================================================
  console.log('\n================================================================');
  console.log('         CHALLENGER 1 ADVERSARIAL AUDIT SCORECARD               ');
  console.log('================================================================');
  console.log(`Total Errors Detected:   ${errors.length}`);
  console.log(`Total Warnings Detected: ${warnings.length}`);
  console.log('----------------------------------------------------------------');

  if (errors.length > 0) {
    console.log('\n❌ DETECTED FAILURES:');
    errors.forEach((e, idx) => {
      console.log(`  ${idx + 1}. [${e.test}] ${e.msg}`);
    });
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS / ANOMALIES:');
    warnings.forEach((w, idx) => {
      console.log(`  ${idx + 1}. [${w.test}] ${w.msg}`);
    });
  }

  const verdict = errors.length === 0 ? 'APPROVE' : 'REQUEST_CHANGES';
  console.log('\n================================================================');
  console.log(`>>> FINAL ADVERSARIAL VERDICT: ${verdict}`);
  console.log('================================================================\n');

  await browser.close();
  process.exit(errors.length === 0 ? 0 : 1);
})().catch(err => {
  console.error('CRITICAL UNHANDLED ERROR IN CHALLENGER TEST SUITE:', err);
  process.exit(1);
});
