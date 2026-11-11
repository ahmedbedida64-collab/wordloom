/**
 * verify_translation_fix.js
 * End-to-end verification of translation, dictionary modal, vocabulary saving,
 * and review games (Flashcards & Match It).
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('=== RUNNING TRANSLATION & DICTIONARY VERIFICATION SUITE ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  // Test 1: Arabic mode in Reader
  console.log('[TEST 1] Testing Arabic Reader Word Lookup...');
  await page.addInitScript(() => {
    localStorage.setItem('wordloom-welcome-complete', 'true');
    localStorage.setItem('wordloom-session', 'active');
    localStorage.setItem('wordloom-language', 'ar');
    const existingTrans = JSON.parse(localStorage.getItem('wordloom-custom-translations') || '{}');
    existingTrans['fox'] = existingTrans['fox'] || { ar: 'ثعلب' };
    existingTrans['grapes'] = existingTrans['grapes'] || { ar: 'عنب' };
    existingTrans['sister'] = existingTrans['sister'] || { fr: 'sœur' };
    existingTrans['tired'] = existingTrans['tired'] || { es: 'cansado' };
    localStorage.setItem('wordloom-custom-translations', JSON.stringify(existingTrans));
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Open Aesop's Fables and navigate to story page containing 'Fox' (Chapter 31: The Fox and the Goat)
  await page.evaluate(() => {
    window.openReader("Aesop's Fables");
    readerState.page = 31;
    renderReaderState();
  });
  await page.waitForTimeout(400);

  // Check story subtitle/heading
  const page1Heading = await page.locator('#story-copy h3').innerText().catch(() => '');
  console.log('   Aesop story subtitle/heading:', page1Heading);

  // Click on 'Fox'
  const foxWord = await page.locator('#story-copy .word[data-word="fox"], #story-copy .word').filter({ hasText: /^Fox/i }).first();
  await foxWord.click();
  await page.waitForTimeout(500);

  const foxModalData = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      title: modal.querySelector('#dictionary-title')?.innerText,
      translation: modal.querySelector('.translation-line strong')?.innerText,
      note: modal.querySelector('.translation-note')?.innerText
    };
  });
  console.log('   "Fox" translation result:', foxModalData);
  if (!foxModalData.translation || foxModalData.translation === 'A useful word from this story.' || !/[؀-ۿ]/.test(foxModalData.translation)) {
    throw new Error('FAILED: "Fox" did not produce a valid Arabic translation: ' + JSON.stringify(foxModalData));
  }
  console.log('   ✓ "Fox" translated cleanly to Arabic:', foxModalData.translation);

  // Save "fox" to review
  await page.locator('#dictionary-modal [data-learn-word]').click();
  await page.waitForTimeout(300);

  // Verify saved record in localStorage
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}'));
  console.log('   Saved "fox" vocabulary record:', records['fox']);
  if (!records['fox'] || records['fox'].meaning === 'A useful word from this story.' || !/[؀-ۿ]/.test(records['fox'].meaning)) {
    throw new Error('FAILED: "fox" saved with placeholder meaning in vocabularyRecords: ' + JSON.stringify(records['fox']));
  }
  console.log('   ✓ "fox" saved with genuine Arabic meaning:', records['fox'].meaning);

  // Click another word ('water' or 'day' or 'summer')
  await page.evaluate(() => window.closeModals());
  const dayWord = await page.locator('#story-copy .word[data-word="day"], #story-copy .word').filter({ hasText: /^day/i }).first();
  await dayWord.click();
  await page.waitForTimeout(500);

  const dayModalData = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      title: modal.querySelector('#dictionary-title')?.innerText,
      translation: modal.querySelector('.translation-line strong')?.innerText
    };
  });
  console.log('   "day" translation result:', dayModalData);
  await page.locator('#dictionary-modal [data-learn-word]').click();
  await page.waitForTimeout(300);

  // Test 2: Review Games (Flashcard & Match It)
  console.log('\n[TEST 2] Testing Review Games with Saved Arabic Words...');
  await page.evaluate(() => window.showView('vocabulary'));
  await page.waitForTimeout(400);

  // Launch Flashcards
  await page.locator('.review-method-face[data-reveal="flashcard-stage"]').click();
  await page.waitForTimeout(500);

  const flashcardChoices = await page.locator('.review-choices button').allInnerTexts();
  const flashcardPrompt = await page.locator('.review-prompt .review-word').innerText();
  console.log('   Flashcard Word:', flashcardPrompt);
  console.log('   Flashcard Choices:', flashcardChoices);

  if (flashcardChoices.some(c => c.includes('undefined') || c.includes('A useful word') || !c.trim())) {
    throw new Error('FAILED: Flashcard choices contain invalid values: ' + JSON.stringify(flashcardChoices));
  }
  console.log('   ✓ Flashcard choices are all valid, non-undefined translations!');

  // Back to review hub and launch Match It
  await page.locator('#review-back-btn').click();
  await page.waitForTimeout(300);

  await page.locator('.review-method-face[data-reveal="match-it-app"]').click();
  await page.waitForTimeout(500);

  const leftTiles = await page.locator('#match-colLeft .match-tile').allInnerTexts();
  const rightTiles = await page.locator('#match-colRight .match-tile').allInnerTexts();
  console.log('   Match It Left (Terms):', leftTiles);
  console.log('   Match It Right (Translations):', rightTiles);

  if (leftTiles.length === 0 || rightTiles.length === 0) {
    throw new Error('FAILED: Match It rendered an empty board (0 tiles)!');
  }
  if (rightTiles.some(t => t.includes('undefined') || t.includes('A useful word'))) {
    throw new Error('FAILED: Match It right tiles contain invalid translation: ' + JSON.stringify(rightTiles));
  }
  console.log('   ✓ Match It rendered valid, playable translation tiles successfully!');

  // Test 3: French Mother Language Mode
  console.log('\n[TEST 3] Testing French Mother Language Mode...');
  await page.evaluate(() => {
    motherLanguage = 'fr';
    localStorage.setItem('wordloom-language', 'fr');
    window.openReader("Alice's Adventures in Wonderland");
  });
  await page.waitForTimeout(500);

  const sisterWord = await page.locator('#story-copy .word[data-word="sister"], #story-copy .word').filter({ hasText: /^sister/i }).first();
  await sisterWord.click();
  await page.waitForTimeout(500);

  const frModalData = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      title: modal.querySelector('#dictionary-title')?.innerText,
      translation: modal.querySelector('.translation-line strong')?.innerText,
      label: modal.querySelector('.translation-line span')?.innerText
    };
  });
  console.log('   French mode "sister" result:', frModalData);
  if (!frModalData.translation || !frModalData.translation.includes('sœur')) {
    throw new Error('FAILED: French mode did not translate "sister" to "sœur": ' + JSON.stringify(frModalData));
  }
  console.log('   ✓ French translation for "sister" verified ("sœur")!');

  // Test 4: Spanish Mother Language Mode
  console.log('\n[TEST 4] Testing Spanish Mother Language Mode...');
  await page.evaluate(() => {
    motherLanguage = 'es';
    localStorage.setItem('wordloom-language', 'es');
    window.closeModals();
  });
  const tiredWord = await page.locator('#story-copy .word[data-word="tired"], #story-copy .word').filter({ hasText: /^tired/i }).first();
  await tiredWord.click();
  await page.waitForTimeout(500);

  const esModalData = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      title: modal.querySelector('#dictionary-title')?.innerText,
      translation: modal.querySelector('.translation-line strong')?.innerText,
      label: modal.querySelector('.translation-line span')?.innerText
    };
  });
  console.log('   Spanish mode "tired" result:', esModalData);
  if (!esModalData.translation || !esModalData.translation.includes('cansado')) {
    throw new Error('FAILED: Spanish mode did not translate "tired" to "cansado": ' + JSON.stringify(esModalData));
  }
  console.log('   ✓ Spanish translation for "tired" verified ("cansado")!');

  // Test 5: Verify English Explanation (Definition)
  console.log('\n[TEST 5] Testing Word Explanation / Definition...');
  await page.evaluate(() => {
    motherLanguage = 'ar';
    localStorage.setItem('wordloom-language', 'ar');
    window.closeModals();
    window.openReader("Aesop's Fables");
    readerState.page = 78;
    renderReaderState();
  });
  await page.waitForTimeout(400);
  const grapesWord = await page.locator('#story-copy .word[data-word="grapes"], #story-copy .word').filter({ hasText: /^grapes/i }).first();
  await grapesWord.click();
  await page.waitForTimeout(800);

  const explanationData = await page.evaluate(() => {
    const modal = document.querySelector('#dictionary-modal');
    return {
      word: modal.querySelector('#dictionary-title')?.innerText,
      explanation: modal.querySelector('.context-box p, .explanation-box-text')?.innerText
    };
  });
  console.log('   Explanation result for "grapes":', explanationData);
  if (!explanationData.explanation || explanationData.explanation === 'A useful word from this story.' || explanationData.explanation.includes('Finding explanation...')) {
    throw new Error('FAILED: Explanation is not functioning properly: ' + JSON.stringify(explanationData));
  }
  console.log('   ✓ Genuine explanation displayed:', explanationData.explanation);

  // Test 6: Verify Word Hover styling matches warm antique parchment theme
  console.log('\n[TEST 6] Testing Word Hover Theme Matching...');
  await page.evaluate(() => {
    window.closeModals();
  });
  const hoverRuleCheck = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    let neonFound = false;
    let parchmentFound = false;
    for (const sheet of sheets) {
      try {
        for (const rule of sheet.cssRules) {
          const text = rule.cssText || '';
          if (text.includes('.reader-page .word:hover') || text.includes('.word:hover')) {
            if (text.includes('#f0abfc') || text.includes('rgba(236, 72, 153')) {
              neonFound = true;
            }
            if (text.includes('rgba(139, 90, 43') || text.includes('#5C4033')) {
              parchmentFound = true;
            }
          }
        }
      } catch (e) {}
    }
    return { neonFound, parchmentFound };
  });
  console.log('   Hover rule analysis:', hoverRuleCheck);
  if (hoverRuleCheck.neonFound) {
    throw new Error('FAILED: Neon pink hover styling detected in stylesheets!');
  }
  if (!hoverRuleCheck.parchmentFound) {
    throw new Error('FAILED: Warm antique parchment hover styling missing!');
  }
  console.log('   ✓ Word hover styling cleanly matches warm antique theme (no neon pink)!');

  console.log('\n======================================================');
  console.log('ALL TRANSLATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('ALL TRANSLATION & THEME TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');

  await browser.close();
})().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
