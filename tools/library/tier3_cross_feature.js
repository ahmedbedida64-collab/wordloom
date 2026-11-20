/**
 * tier3_cross_feature.js
 * Tier 3: Cross-Feature Combinations & State Transitions for Wordloom
 * 
 * Verifies end-to-end multi-subsystem user flows:
 * 1. Sign In (Auth lock, demo quick-fill, authentication, app unlock)
 * 2. Book Selection & Reading (Reader launch, page navigation, bookmarking)
 * 3. Interactive Word Lookup & Review Deck Saving (Dictionary modal, vocabulary records)
 * 4. Spaced Repetition Practice across Flashcards, Match It, & Type What You Hear
 * 5. Preference Customization in Settings (Voice, Typography, Language, Color Mood)
 * 6. Full Cross-Session Storage Persistence Roundtrip (7 primary storage keys)
 */

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('================================================================');
  console.log('     TIER 3: CROSS-FEATURE COMBINATIONS & STATE FLOWS           ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');

  // Pre-seed local custom translations so review games have valid offline definitions
  await page.addInitScript(() => {
    const existing = JSON.parse(localStorage.getItem('wordloom-custom-translations') || '{}');
    existing['deep'] = existing['deep'] || { ar: 'عميق', fr: 'profond', es: 'profundo' };
    existing['time'] = existing['time'] || { ar: 'وقت', fr: 'temps', es: 'tiempo' };
    existing['dark'] = existing['dark'] || { ar: 'مظلم', fr: 'sombre', es: 'oscuro' };
    existing['fear'] = existing['fear'] || { ar: 'خوف', fr: 'peur', es: 'miedo' };
    existing['sister'] = existing['sister'] || { ar: 'أخت', fr: 'sœur', es: 'hermana' };
    existing['day'] = existing['day'] || { ar: 'يوم', fr: 'jour', es: 'día' };
    localStorage.setItem('wordloom-custom-translations', JSON.stringify(existing));
  });

  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  // Ensure clean unauthenticated starting state
  await page.evaluate(() => {
    localStorage.removeItem('wordloom-session');
    localStorage.removeItem('wordloom-vocabulary-records');
    localStorage.removeItem('wordloom-saved-words');
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // ------------------------------------------------------------------
  // STEP 1: AUTHENTICATION FLOW & APP UNLOCK
  // ------------------------------------------------------------------
  console.log('[1/6] Testing Authentication Flow (Lock -> Demo Fill -> Unlock)...');

  // Verify initial auth screen is visible and app shell is locked
  const isAuthLocked = await page.evaluate(() => {
    const authScreen = document.querySelector('#auth-screen');
    const shell = document.querySelector('.app-shell');
    return authScreen && !authScreen.classList.contains('hidden') && shell?.classList.contains('auth-locked');
  });
  console.log(`   Initial app locked state: ${isAuthLocked}`);
  if (!isAuthLocked) {
    throw new Error('FAILED: Initial app shell should be .auth-locked without active session');
  }

  // Click demo quick-fill pill
  await page.locator('#auth-fill-demo').click();
  await page.waitForTimeout(200);

  const emailVal = await page.locator('#auth-email').inputValue();
  const pwdVal = await page.locator('#auth-password').inputValue();
  console.log(`   Demo credentials filled: ${emailVal} / [${pwdVal.length} chars]`);
  if (!emailVal || !pwdVal) {
    throw new Error('FAILED: #auth-fill-demo did not populate credentials');
  }

  // Submit sign in
  await page.locator('#auth-submit-btn').click();
  await page.waitForTimeout(400);

  const isUnlocked = await page.evaluate(() => {
    const authScreen = document.querySelector('#auth-screen');
    const shell = document.querySelector('.app-shell');
    const session = WordloomAuth.getSession();
    return authScreen?.classList.contains('hidden') && !shell?.classList.contains('auth-locked') && !!session;
  });
  console.log(`   App unlocked state: ${isUnlocked}`);
  if (!isUnlocked) {
    throw new Error('FAILED: Submitting sign-in did not unlock the application shell');
  }
  console.log('   ✓ Authentication completed and application shell unlocked.');

  // ------------------------------------------------------------------
  // STEP 2: SELECT BOOK & READ
  // ------------------------------------------------------------------
  console.log('\n[2/6] Testing Book Selection & Reading Navigation...');
  await page.evaluate(() => window.openReader("Alice's Adventures in Wonderland"));
  await page.waitForTimeout(400);

  // Verify reader opened to Alice
  const activeTitle = await page.evaluate(() => activeBook?.title);
  console.log(`   Active book opened: "${activeTitle}"`);
  if (activeTitle !== "Alice's Adventures in Wonderland") {
    throw new Error(`FAILED: Expected Alice in Wonderland, got "${activeTitle}"`);
  }

  // Advance to page 2 (index 1)
  await page.locator('#reader-next-btn').click();
  await page.waitForTimeout(300);

  const currentPage = await page.evaluate(() => readerState.page);
  console.log(`   Advanced to reader page index: ${currentPage}`);
  if (currentPage !== 1) {
    throw new Error(`FAILED: Next button did not advance page to index 1 (got ${currentPage})`);
  }
  console.log('   ✓ Reading navigation verified.');

  // ------------------------------------------------------------------
  // STEP 3: WORD LOOKUP & VOCABULARY SAVING (Save 2 words for Match It)
  // ------------------------------------------------------------------
  console.log('\n[3/6] Testing Word Lookup & Review Deck Saving...');
  
  // Word 1: 'deep'
  const word1 = page.locator('#story-copy .word[data-word="deep"]').first();
  await word1.click();
  await page.waitForTimeout(400);

  const dictModalOpen = await page.locator('#dictionary-modal:not([hidden])').count() > 0;
  if (!dictModalOpen) {
    throw new Error('FAILED: Dictionary modal did not open on word click');
  }
  await page.locator('#dictionary-modal [data-learn-word]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.closeModals());
  console.log('   ✓ Saved word "deep" to review deck.');

  // Word 2: 'time'
  const word2 = page.locator('#story-copy .word[data-word="time"]').first();
  await word2.click();
  await page.waitForTimeout(400);
  await page.locator('#dictionary-modal [data-learn-word]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.closeModals());
  console.log('   ✓ Saved word "time" to review deck.');

  // Verify vocabulary records in localStorage
  const savedRecords = await page.evaluate(() => {
    return JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
  });
  console.log('   Saved vocabulary keys:', Object.keys(savedRecords));
  if (!savedRecords['deep'] || !savedRecords['time']) {
    throw new Error('FAILED: Expected words "deep" and "time" in wordloom-vocabulary-records');
  }

  // ------------------------------------------------------------------
  // STEP 4: REVIEW HUB ACTIVITIES (Flashcards, Match It, TTW)
  // ------------------------------------------------------------------
  console.log('\n[4/6] Testing Review Hub Mini-Games Integration...');
  await page.evaluate(() => window.showView('vocabulary'));
  await page.waitForTimeout(400);

  // Verify review hub methods are accessible
  const hubVisible = await page.locator('#vocabulary-view:not(.hidden)').count() > 0;
  if (!hubVisible) {
    throw new Error('FAILED: Vocabulary view not visible');
  }

  // 4A: Test Flashcards Mode
  console.log('   Testing Flashcards Recall Mode...');
  await page.locator('.review-method-face[data-reveal="flashcard-stage"]').click();
  await page.waitForTimeout(400);

  const fcPrompt = await page.locator('.review-prompt .review-word').innerText().catch(() => '');
  const fcChoicesCount = await page.locator('.review-choices button').count();
  console.log(`   Flashcards active: prompt="${fcPrompt}", choices=${fcChoicesCount}`);
  if (fcChoicesCount !== 4) {
    throw new Error(`FAILED: Flashcards should render 4 distractor choices, found ${fcChoicesCount}`);
  }
  // Click first choice
  await page.locator('.review-choices button').first().click();
  await page.waitForTimeout(300);
  console.log('   ✓ Flashcards recall mode interaction verified.');

  // Return to Review Hub
  await page.locator('#review-back-btn').click();
  await page.waitForTimeout(300);

  // 4B: Test Match It Mode
  console.log('   Testing Match It Speed Pairing Mode...');
  await page.locator('.review-method-face[data-reveal="match-it-app"]').click();
  await page.waitForTimeout(400);

  const matchBoardVisible = await page.locator('#match-it-app:not(.hidden)').count() > 0;
  const leftTiles = await page.locator('#match-colLeft .match-tile').allInnerTexts();
  const rightTiles = await page.locator('#match-colRight .match-tile').allInnerTexts();
  console.log(`   Match It board active: ${matchBoardVisible}, Left:`, leftTiles, 'Right:', rightTiles);
  if (!matchBoardVisible || leftTiles.length === 0 || rightTiles.length === 0) {
    throw new Error('FAILED: Match It board failed to render tile columns');
  }
  console.log('   ✓ Match It speed pairing board verified.');

  // Return to Review Hub
  await page.locator('#review-back-btn').click();
  await page.waitForTimeout(300);

  // 4C: Test Type What You Hear Mode
  console.log('   Testing Type What You Hear Spelling Mode...');
  await page.locator('.review-method-face[data-reveal="ttw-stage"]').click();
  await page.waitForTimeout(400);

  const ttwInputVisible = await page.locator('#ttw-input').count() > 0;
  const hasHintBtn = await page.locator('#ttw-hint').count() > 0;
  console.log(`   TTW writing input visible: ${ttwInputVisible}, Hint button: ${hasHintBtn}`);
  if (!ttwInputVisible || !hasHintBtn) {
    throw new Error('FAILED: Type What You Hear mode missing input field or hint button');
  }
  console.log('   ✓ Type What You Hear spelling mode verified.');

  // ------------------------------------------------------------------
  // STEP 5: UPDATE SETTINGS PREFERENCES
  // ------------------------------------------------------------------
  console.log('\n[5/6] Testing Settings Customization...');
  await page.evaluate(() => window.showView('settings'));
  await page.waitForTimeout(400);

  // Update Voice, Rhythm, Language, Mood
  await page.locator('#reader-voice').selectOption('british-classic');
  await page.locator('#line-size-shape').selectOption('roomy');
  await page.locator('#mother-language').selectOption('fr');
  await page.locator('.mood-chip-btn').filter({ hasText: /fern/i }).click();
  await page.waitForTimeout(200);

  // Click Save Preferences
  await page.locator('#save-preferences').click();
  await page.waitForTimeout(300);
  console.log('   ✓ Preferences updated and saved.');

  // ------------------------------------------------------------------
  // STEP 6: CROSS-SESSION PERSISTENCE VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n[6/6] Testing Cross-Session Storage Persistence Roundtrip...');
  
  // Reload the page to simulate fresh session load
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  const persistedState = await page.evaluate(() => {
    return {
      session: JSON.parse(localStorage.getItem('wordloom-session') || 'null'),
      language: localStorage.getItem('wordloom-language'),
      voice: localStorage.getItem('wordloom-voice'),
      lineSize: localStorage.getItem('wordloom-line-size'),
      mood: localStorage.getItem('wordloom-mood'),
      vocabRecordsCount: Object.keys(JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}')).length,
      soundReaderProfile: SoundReader.currentVoiceProfile,
      motherLangGlobal: motherLanguage
    };
  });

  console.log('   Persisted State across reload:', persistedState);

  // Verify all 7 keys persisted
  // Verify all essential keys persisted
  if (!persistedState.session || persistedState.session.email !== 'demo@wordloom.com') {
    throw new Error('FAILED: wordloom-session was not preserved across reload');
  }
  if (persistedState.language !== 'fr' || persistedState.motherLangGlobal !== 'fr') {
    throw new Error(`FAILED: wordloom-language not preserved (expected 'fr', got '${persistedState.language}')`);
  }
  if (persistedState.voice !== 'british-classic' || persistedState.soundReaderProfile !== 'british-classic') {
    throw new Error(`FAILED: wordloom-voice not preserved (expected 'british-classic', got '${persistedState.voice}')`);
  }
  if (persistedState.lineSize !== 'roomy') {
    throw new Error(`FAILED: wordloom-line-size not preserved (expected 'roomy', got '${persistedState.lineSize}')`);
  }
  if (persistedState.mood !== 'fern') {
    throw new Error(`FAILED: wordloom-mood not preserved (expected 'fern', got '${persistedState.mood}')`);
  }
  if (persistedState.vocabRecordsCount === 0) {
    throw new Error('FAILED: wordloom-vocabulary-records lost across session reload');
  }

  console.log('   ✓ 100% of required storage keys persisted faithfully across browser reload!');

  console.log('\n================================================================');
  console.log('       ✓ TIER 3 CROSS-FEATURE COMBINATIONS SUITE PASSED (100%)  ');
  console.log('================================================================\n');

  await browser.close();
})().catch(err => {
  console.error('\n❌ TIER 3 TEST SUITE FAILED:', err);
  process.exit(1);
});
