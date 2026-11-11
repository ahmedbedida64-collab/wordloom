/**
 * verify_type_what_you_hear.js
 * Verification script for "Type What You Hear" review activity mode.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== VERIFYING "TYPE WHAT YOU HEAR" (3RD REVIEW GAME MODE) ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  await page.addInitScript(() => {
    localStorage.setItem('wordloom-welcome-complete', 'true');
    localStorage.setItem('wordloom-session', 'active');
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // [TEST 1] Review Hub 3 Game Modes
  console.log('[TEST 1] Checking 3 review modes in Review Hub (#vocabulary-view)...');
  await page.evaluate(() => window.showView('vocabulary'));
  await page.waitForTimeout(300);

  // Check empty state practice button
  const emptyStateVisible = await page.evaluate(() => {
    const empty = document.querySelector('#review-empty-state');
    return empty && window.getComputedStyle(empty).display !== 'none';
  });
  console.log('   Review empty state initially visible:', emptyStateVisible);

  // Click sample practice to populate sample deck
  await page.evaluate(() => {
    document.querySelector('#review-load-sample')?.click();
  });
  await page.waitForTimeout(300);

  const reviewModes = await page.evaluate(() => {
    const stack = document.querySelector('#review-method-stack');
    const cards = Array.from(stack?.querySelectorAll('.review-method-face') || []).map(c => ({
      reveal: c.dataset.reveal,
      mode: c.dataset.reviewMode,
      title: c.querySelector('strong')?.innerText.trim(),
      subtitle: c.querySelector('small')?.innerText.trim(),
      desc: c.querySelector('em')?.innerText.trim()
    }));
    return {
      stackVisible: stack && window.getComputedStyle(stack).display !== 'none',
      cards
    };
  });

  console.log('   Stack visible:', reviewModes.stackVisible);
  console.log('   Cards found:', reviewModes.cards);

  if (reviewModes.cards.length !== 3) {
    throw new Error(`Expected 3 review cards, found ${reviewModes.cards.length}`);
  }

  const ttwCard = reviewModes.cards.find(c => c.reveal === 'ttw-stage' || c.mode === 'type-to-hear');
  if (!ttwCard || !ttwCard.title.includes('Type What You Hear')) {
    throw new Error(`"Type What You Hear" card missing or invalid: ${JSON.stringify(ttwCard)}`);
  }
  console.log('   ✓ 3 review game modes verified!');

  // [TEST 2] Launching "Type What You Hear"
  console.log('\n[TEST 2] Launching "Type What You Hear" game...');
  await page.evaluate(() => {
    const btn = document.querySelector('.review-method-face[data-reveal="ttw-stage"]');
    btn?.click();
  });
  await page.waitForTimeout(400);

  const gameState = await page.evaluate(() => {
    const stage = document.querySelector('#ttw-stage');
    const paperCard = document.querySelector('.ttw-paper-card');
    const navRoot = document.querySelector('#react-nav-root');
    const eyebrow = document.querySelector('#ttw-eyebrow')?.innerText.trim();
    const emoji = document.querySelector('#ttw-emoji')?.innerText.trim();
    const input = document.querySelector('#ttw-input');
    const playBtn = document.querySelector('#ttw-play-btn');
    const speedToggle = document.querySelector('#ttw-speed-toggle');
    const hintBtn = document.querySelector('#ttw-hint');
    const writingCard = document.querySelector('.ttw-writing-card');
    const progressFill = document.querySelector('#ttw-progress-fill');
    const levelBadge = document.querySelector('#ttw-level-badge');
    const tiles = Array.from(document.querySelectorAll('#ttw-tiles .ttw-tile')).map(t => t.innerText.trim());

    return {
      stageVisible: stage && window.getComputedStyle(stage).display !== 'none',
      paperCardExists: !!paperCard,
      navHidden: navRoot?.classList.contains('hidden'),
      eyebrow,
      emoji,
      inputEmpty: input?.value === '',
      writingCardExists: !!writingCard,
      progressFillExists: !!progressFill,
      levelBadgeRemoved: levelBadge === null,
      playBtnExists: !!playBtn,
      speedToggleRemoved: speedToggle === null,
      hintBtnExists: !!hintBtn,
      tilesCount: tiles.length,
      tiles
    };
  });

  console.log('   Game launched state:', gameState);
  if (!gameState.stageVisible) throw new Error('ttw-stage is not visible after launch');
  if (!gameState.paperCardExists) throw new Error('.ttw-paper-card container is missing');
  if (!gameState.navHidden) throw new Error('Floating nav dock is not hidden in active game view');
  if (!gameState.levelBadgeRemoved) throw new Error('Level badge (#ttw-level-badge) must be removed from the game');
  if (gameState.tilesCount > 0) throw new Error('Letter tiles should not be present: user writes the word directly');
  if (!gameState.writingCardExists) throw new Error('Writing card (.ttw-writing-card) is missing');
  if (!gameState.playBtnExists) throw new Error('Audio play button is missing');
  if (!gameState.speedToggleRemoved) throw new Error('Speed toggle button was not removed from DOM');
  console.log('   ✓ Sharpless paper card, pure typing input, level-free HUD, and distraction-free mode verified!');

  // [TEST 3] Audio replay and natural pronunciation (no speed toggle)
  console.log('\n[TEST 3] Testing natural audio replay and acoustic seal animation...');
  const audioReplayState = await page.evaluate(() => {
    const playBtn = document.querySelector('#ttw-play-btn');
    const playLabel = document.querySelector('#ttw-play-label');
    const labelBefore = playLabel?.innerText.trim();
    playBtn?.click();
    const isSpeakingAfterClick = playBtn?.classList.contains('ttw-speaking');
    const labelDuringSpeech = playLabel?.innerText.trim();
    const speedToggle = document.querySelector('#ttw-speed-toggle');
    return {
      labelBefore,
      isSpeakingAfterClick,
      labelDuringSpeech,
      speedTogglePresent: !!speedToggle
    };
  });
  console.log('   Audio replay result:', audioReplayState);
  if (!audioReplayState.isSpeakingAfterClick) throw new Error('Play button did not receive ttw-speaking class on click');
  if (audioReplayState.speedTogglePresent) throw new Error('Speed toggle should not exist in the DOM');
  console.log('   ✓ Direct natural audio replay verified without slow/fast toggle!');

  // [TEST 3b] Full phrase playback in Type What You Hear
  console.log('\n[TEST 3b] Testing full phrase audio playback in Type What You Hear...');
  const phrasePlaybackState = await page.evaluate(() => {
    const phraseBtn = document.querySelector('#ttw-phrase-btn');
    const phraseLabel = document.querySelector('#ttw-phrase-label');
    const sentenceEl = document.querySelector('#ttw-sentence');
    const hasPhraseBtn = !!phraseBtn;
    const phraseBtnVisible = phraseBtn && window.getComputedStyle(phraseBtn).display !== 'none';
    const labelBefore = phraseLabel?.innerText.trim();

    phraseBtn?.click();
    const isPhraseSpeaking = phraseBtn?.classList.contains('ttw-speaking');
    const isSentenceSpeaking = sentenceEl?.classList.contains('ttw-sentence-speaking');
    const labelDuring = phraseLabel?.innerText.trim();

    return {
      hasPhraseBtn,
      phraseBtnVisible,
      labelBefore,
      isPhraseSpeaking,
      isSentenceSpeaking,
      labelDuring
    };
  });
  console.log('   Phrase playback result:', phrasePlaybackState);
  if (!phrasePlaybackState.hasPhraseBtn) throw new Error('#ttw-phrase-btn is missing from the DOM');
  if (!phrasePlaybackState.phraseBtnVisible) throw new Error('#ttw-phrase-btn should be visible when word has sentence');
  if (!phrasePlaybackState.isPhraseSpeaking) throw new Error('Phrase button did not receive ttw-speaking class on click');
  if (!phrasePlaybackState.isSentenceSpeaking) throw new Error('Sentence element did not receive ttw-sentence-speaking class on click');
  console.log('   ✓ Full phrase audio playback verified in Type What You Hear!');

  // [TEST 4] Case-insensitive typing & validation
  console.log('\n[TEST 4] Testing case-insensitive typing & correct validation...');
  const currentWord = await page.evaluate(() => window.ttwState?.words[window.ttwState.currentIndex]?.word);
  console.log('   Current word to spell:', currentWord);

  // Type in mixed case
  const mixedCase = currentWord.toUpperCase();
  await page.evaluate(word => {
    const input = document.querySelector('#ttw-input');
    input.value = word;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, mixedCase);
  await page.waitForTimeout(300);

  const checkResult = await page.evaluate(() => {
    const input = document.querySelector('#ttw-input');
    const continueBtn = document.querySelector('#ttw-continue');
    const feedback = document.querySelector('#ttw-feedback-msg')?.innerText.trim();
    const isFirstTry = window.ttwState?.words[window.ttwState.currentIndex]?.firstTryCorrect;
    return {
      isCorrectClass: input?.classList.contains('ttw-correct'),
      continueEnabled: continueBtn && !continueBtn.disabled,
      feedback,
      isFirstTry
    };
  });

  console.log('   Validation result:', checkResult);
  if (!checkResult.isCorrectClass) throw new Error('Input did not receive ttw-correct class on valid spelling');
  if (!checkResult.continueEnabled) throw new Error('Continue button was not enabled after correct spelling');
  if (!checkResult.isFirstTry) throw new Error('firstTryCorrect was not true on first unassisted attempt');
  console.log('   ✓ Case-insensitive validation and first-try tracking verified!');

  // Advance to word 2
  await page.evaluate(() => document.querySelector('#ttw-continue')?.click());
  await page.waitForTimeout(300);

  // [TEST 5] Testing progressive letter-by-letter hint & re-typing mastery on word 2
  console.log('\n[TEST 5] Testing letter-by-letter hint & re-typing to master word 2...');
  const word2 = await page.evaluate(() => window.ttwState?.words[window.ttwState.currentIndex]?.word);
  console.log('   Word 2:', word2);

  // Click hint button once: 1st letter revealed
  await page.evaluate(() => document.querySelector('#ttw-hint')?.click());
  await page.waitForTimeout(200);

  const step1 = await page.evaluate(() => {
    const reveal = document.querySelector('#ttw-word-reveal');
    const input = document.querySelector('#ttw-input');
    const continueBtn = document.querySelector('#ttw-continue');
    const hintBtn = document.querySelector('#ttw-hint');
    const revealedLetters = Array.from(reveal?.querySelectorAll('.ttw-hint-letter.revealed') || []).map(l => l.innerText.trim());
    return {
      revealVisible: reveal?.classList.contains('ttw-visible'),
      revealedLetters,
      hintBtnText: hintBtn?.innerText.trim(),
      inputDisabled: input?.disabled,
      inputVal: input?.value,
      continueDisabled: continueBtn?.disabled
    };
  });
  console.log('   Hint step 1 (1 letter revealed):', step1);
  if (!step1.revealVisible) throw new Error('Reveal was not visible after clicking hint');
  if (step1.revealedLetters.length !== 1 || step1.revealedLetters[0] !== word2[0]) {
    throw new Error(`Expected first revealed letter to be "${word2[0]}", got: ${JSON.stringify(step1.revealedLetters)}`);
  }
  if (step1.inputDisabled) throw new Error('Input must remain enabled for re-typing when hints are given');
  if (!step1.continueDisabled) throw new Error('Continue button must not be enabled until the user types the word');

  // Test incorrect typing: user makes a mistake
  await page.evaluate(() => {
    const input = document.querySelector('#ttw-input');
    input.value = 'wrongspelling';
    window.ttwCheckAnswer(true);
  });
  await page.waitForTimeout(200);

  const wrongCheck = await page.evaluate(() => {
    const input = document.querySelector('#ttw-input');
    const continueBtn = document.querySelector('#ttw-continue');
    return {
      inputDisabled: input?.disabled,
      continueDisabled: continueBtn?.disabled
    };
  });
  if (wrongCheck.inputDisabled) throw new Error('Input must stay unlocked on incorrect spelling to allow re-typing');
  if (!wrongCheck.continueDisabled) throw new Error('Continue must stay disabled on incorrect spelling');

  // Now user types the full correct word to master it
  await page.evaluate(w => {
    const input = document.querySelector('#ttw-input');
    input.value = w;
    window.ttwCheckAnswer(true);
  }, word2);
  await page.waitForTimeout(300);

  const masteredCheck = await page.evaluate(() => {
    const input = document.querySelector('#ttw-input');
    const continueBtn = document.querySelector('#ttw-continue');
    const curr = window.ttwState?.words[window.ttwState.currentIndex];
    return {
      isCorrectClass: input?.classList.contains('ttw-correct'),
      continueEnabled: continueBtn && !continueBtn.disabled,
      usedHint: curr?.usedHint,
      firstTryCorrect: curr?.firstTryCorrect
    };
  });
  console.log('   Mastered check:', masteredCheck);
  if (!masteredCheck.isCorrectClass) throw new Error('Input not marked correct after re-typing correct word');
  if (!masteredCheck.continueEnabled) throw new Error('Continue not enabled after mastering the word');
  if (!masteredCheck.usedHint || masteredCheck.firstTryCorrect) throw new Error('Used hint not tracked properly');
  console.log('   ✓ Progressive letter hint and re-typing mastery verified!');

  // [TEST 6] Finish remaining words and verify results summary
  console.log('\n[TEST 6] Advancing through rest of session to results summary...');
  while (await page.evaluate(() => window.ttwState?.currentIndex < window.ttwState?.words.length)) {
    const isDone = await page.evaluate(() => window.ttwState?.isFinished);
    if (isDone) break;

    // Fast-complete with correct answer or continue
    await page.evaluate(() => {
      if (document.querySelector('#ttw-continue:not(:disabled)')) {
        document.querySelector('#ttw-continue')?.click();
      } else {
        const curr = window.ttwState?.words[window.ttwState.currentIndex];
        if (curr) {
          const input = document.querySelector('#ttw-input');
          input.value = curr.word;
          window.ttwCheckAnswer(true);
          document.querySelector('#ttw-continue')?.click();
        }
      }
    });
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(500);

  const resultsSummary = await page.evaluate(() => {
    const results = document.querySelector('#ttw-results');
    const score = document.querySelector('#ttw-score')?.innerText.trim();
    const cards = Array.from(document.querySelectorAll('#ttw-grid .ttw-card')).map(c => ({
      word: c.querySelector('.ttw-card-word')?.innerText.trim(),
      meaning: c.querySelector('.ttw-card-meaning')?.innerText.trim(),
      replay: c.querySelector('.ttw-card-replay')?.innerText.trim()
    }));
    const tryAgainBtn = document.querySelector('#ttw-try-again');
    const backBtn = document.querySelector('#ttw-back-review');

    const getBtnStyle = el => {
      const s = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        borderWidth: s.borderTopWidth,
        borderColor: s.borderTopColor,
        background: s.backgroundColor,
        color: s.color,
        radius: s.borderRadius
      };
    };

    return {
      resultsVisible: results && window.getComputedStyle(results).display !== 'none',
      score,
      cardsCount: cards.length,
      cards,
      tryAgain: getBtnStyle(tryAgainBtn),
      backBtn: getBtnStyle(backBtn)
    };
  });

  console.log('   Results summary:', {
    visible: resultsSummary.resultsVisible,
    score: resultsSummary.score,
    cardsCount: resultsSummary.cardsCount,
    tryAgain: resultsSummary.tryAgain
  });

  if (!resultsSummary.resultsVisible) throw new Error('Results screen is not visible after finishing words');
  if (resultsSummary.cardsCount === 0) throw new Error('Results grid does not have word summary cards');
  if (resultsSummary.tryAgain.text.includes('←') || resultsSummary.tryAgain.text.includes('→')) {
    throw new Error('Buttons contain arrow glyphs!');
  }
  console.log('   ✓ Completion results screen verified!');

  // [TEST 7] Back to Review navigation
  console.log('\n[TEST 7] Testing navigation back to review hub...');
  await page.evaluate(() => document.querySelector('#ttw-back-review')?.click());
  await page.waitForTimeout(300);

  const hubState = await page.evaluate(() => {
    const stack = document.querySelector('#review-method-stack');
    const ttwStage = document.querySelector('#ttw-stage');
    const navRoot = document.querySelector('#react-nav-root');
    return {
      stackVisible: stack && window.getComputedStyle(stack).display !== 'none',
      stageHidden: !ttwStage || window.getComputedStyle(ttwStage).display === 'none',
      navVisible: !navRoot?.classList.contains('hidden')
    };
  });

  console.log('   Hub return state:', hubState);
  if (!hubState.stackVisible) throw new Error('Review stack is not visible after returning to review');
  if (!hubState.stageHidden) throw new Error('ttw-stage is still visible after returning to review');
  if (!hubState.navVisible) throw new Error('Floating nav dock is not visible after returning to review');
  console.log('   ✓ Return to Review Hub verified!');

  // [TEST 8] Flashcard phrase audio playback
  console.log('\n[TEST 8] Testing full phrase listening in Flashcards review mode...');
  await page.evaluate(() => {
    const fcBtn = document.querySelector('.review-method-face[data-reveal="flashcard-stage"]');
    fcBtn?.click();
  });
  await page.waitForTimeout(300);

  const fcPhraseState = await page.evaluate(() => {
    const stage = document.querySelector('#flashcard-stage');
    const phraseBtn = document.querySelector('.review-listen-phrase');
    const phraseText = document.querySelector('.flashcard-phrase');
    let speakCalledWith = null;
    const origSpeakText = window.speakText;
    window.speakText = (text) => {
      speakCalledWith = text;
      if (origSpeakText) origSpeakText(text);
    };

    phraseBtn?.click();
    const phraseCaptured = speakCalledWith;
    window.speakText = origSpeakText;

    return {
      stageVisible: stage && window.getComputedStyle(stage).display !== 'none',
      hasPhraseBtn: !!phraseBtn,
      phraseBtnText: phraseBtn?.innerText.trim(),
      hasPhraseText: !!phraseText,
      phraseCaptured
    };
  });
  console.log('   Flashcard phrase state:', fcPhraseState);
  if (!fcPhraseState.stageVisible) throw new Error('Flashcard stage is not visible');
  if (!fcPhraseState.hasPhraseBtn) throw new Error('Flashcard missing .review-listen-phrase button');
  if (!fcPhraseState.hasPhraseText) throw new Error('Flashcard missing .flashcard-phrase text');
  if (!fcPhraseState.phraseCaptured) throw new Error('Clicking hear phrase button did not invoke speech playback with sentence');
  console.log('   ✓ Full phrase listening verified in Flashcards review mode!');

  console.log('\n======================================================');
  console.log('ALL "TYPE WHAT YOU HEAR" GAME TESTS PASSED (100%)!');
  console.log('======================================================');

  await browser.close();
})().catch(err => {
  console.error('\n❌ FAILED:', err);
  process.exit(1);
});

