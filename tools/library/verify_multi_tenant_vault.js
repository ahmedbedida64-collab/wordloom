#!/usr/bin/env node
/**
 * tools/library/verify_multi_tenant_vault.js
 * Verification suite for:
 * 1. Multi-Tenant User Vault data isolation (zero data leakage across accounts)
 * 2. SM-2 Spaced Repetition Engine (ease factors, intervals, due today queue)
 * 3. JSON Backup & Restore pipeline
 * 4. WordloomDB IndexedDB custom book persistence
 * 5. Multilingual offline dictionary engine
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const FILE_URL = 'file://' + path.resolve(__dirname, '../../index.html');

async function run() {
  console.log('================================================================');
  console.log('  VERIFYING MULTI-TENANT VAULT, SM-2 SRS & DATA PERSISTENCE     ');
  console.log('================================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // ------------------------------------------------------------------
  // TEST 1: SM-2 Spaced Repetition Engine Math & Calculations
  // ------------------------------------------------------------------
  console.log('[TEST 1] Verifying SRSEngine SM-2 Algorithm & Due Queue...');
  const srsResults = await page.evaluate(() => {
    const srs = window.SRSEngine;
    if (!srs) return { error: 'SRSEngine not found on window' };

    const initial = { word: 'testword', repetitions: 0, interval: 0, easeFactor: 2.5 };
    
    // Test 1: Good rating
    const afterGood = srs.calculateNextReview(initial, 'Good');
    // Test 2: Easy rating
    const afterEasy = srs.calculateNextReview(afterGood, 'Easy');
    // Test 3: Again rating (reset)
    const afterAgain = srs.calculateNextReview(afterEasy, 'Again');
    // Test 4: Hard rating
    const afterHard = srs.calculateNextReview(afterGood, 'Hard');

    // Test Due words
    const testRecords = {
      w1: { word: 'w1', nextReview: Date.now() - 10000 }, // overdue
      w2: { word: 'w2', nextReview: Date.now() + 86400000 }, // future
      w3: { word: 'w3', nextReview: 0 } // due immediately
    };
    const due = srs.getDueWords(testRecords);

    return {
      afterGood,
      afterEasy,
      afterAgain,
      afterHard,
      dueCount: due.length,
      dueWords: due.map(d => d.word)
    };
  });

  if (srsResults.error) throw new Error(srsResults.error);
  if (srsResults.afterGood.repetitions !== 1 || srsResults.afterGood.interval < 1) {
    throw new Error('FAIL: SRSEngine Good rating calculation incorrect: ' + JSON.stringify(srsResults.afterGood));
  }
  if (srsResults.afterAgain.repetitions !== 0 || srsResults.afterAgain.interval !== 1) {
    throw new Error('FAIL: SRSEngine Again rating did not reset repetitions: ' + JSON.stringify(srsResults.afterAgain));
  }
  if (srsResults.dueCount !== 2 || !srsResults.dueWords.includes('w1') || !srsResults.dueWords.includes('w3')) {
    throw new Error('FAIL: SRSEngine due words calculation incorrect: ' + JSON.stringify(srsResults));
  }
  console.log('   ✓ SRSEngine SM-2 calculations and Due Today queue verified.');

  // ------------------------------------------------------------------
  // TEST 2: Multi-Tenant Data Isolation Across User Sessions
  // ------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying Multi-Tenant Data Isolation (Zero Data Leakage)...');
  
  // Login as User A (demo@wordloom.com)
  await page.evaluate(() => {
    localStorage.clear();
    window.WordloomAuth.init();
    window.WordloomAuth.login('demo@wordloom.com', 'wordloom123');
    // Save word for User A
    window.saveWordToVocabulary('serendipity', 'A fortunate discovery by chance.');
  });
  await page.waitForTimeout(300);

  const userAWords = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return Object.keys(records);
  });
  if (!userAWords.includes('serendipity')) {
    throw new Error('FAIL: User A word was not saved');
  }
  console.log('   ✓ User A saved "serendipity".');

  // Sign out User A
  await page.evaluate(() => window.WordloomAuth.signOut());
  await page.waitForTimeout(300);

  const signedOutWords = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return Object.keys(records);
  });
  if (signedOutWords.length > 0) {
    throw new Error('FAIL: Active localStorage keys were not cleared on signOut: ' + JSON.stringify(signedOutWords));
  }
  console.log('   ✓ Active session data cleared upon sign-out.');

  // Login as User B (ahmed@wordloom.com)
  await page.evaluate(() => {
    window.WordloomAuth.login('ahmed@wordloom.com', 'wordloom123');
  });
  await page.waitForTimeout(300);

  const userBInitialWords = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return Object.keys(records);
  });
  if (userBInitialWords.includes('serendipity')) {
    throw new Error('CRITICAL FAIL: Multi-tenant data leakage! User B sees User A words: ' + JSON.stringify(userBInitialWords));
  }
  console.log('   ✓ User B starts with clean state (zero data leakage from User A).');

  // User B saves their own word
  await page.evaluate(() => {
    window.saveWordToVocabulary('ephemeral', 'Lasting for a very short time.');
  });
  await page.waitForTimeout(300);

  // Sign out User B
  await page.evaluate(() => window.WordloomAuth.signOut());
  await page.waitForTimeout(300);

  // Log back in as User A
  await page.evaluate(() => {
    window.WordloomAuth.login('demo@wordloom.com', 'wordloom123');
  });
  await page.waitForTimeout(300);

  const userARestoredWords = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return Object.keys(records);
  });
  if (!userARestoredWords.includes('serendipity')) {
    throw new Error('FAIL: User A data was lost on user switch: ' + JSON.stringify(userARestoredWords));
  }
  if (userARestoredWords.includes('ephemeral')) {
    throw new Error('CRITICAL FAIL: User B data leaked into User A account: ' + JSON.stringify(userARestoredWords));
  }
  console.log('   ✓ User A restored with "serendipity" intact and zero words from User B.');

  // Log back in as User B
  await page.evaluate(() => {
    window.WordloomAuth.signOut();
    window.WordloomAuth.login('ahmed@wordloom.com', 'wordloom123');
  });
  await page.waitForTimeout(300);

  const userBRestoredWords = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return Object.keys(records);
  });
  if (!userBRestoredWords.includes('ephemeral')) {
    throw new Error('FAIL: User B data was lost on user switch: ' + JSON.stringify(userBRestoredWords));
  }
  if (userBRestoredWords.includes('serendipity')) {
    throw new Error('CRITICAL FAIL: User A data leaked into User B account: ' + JSON.stringify(userBRestoredWords));
  }
  console.log('   ✓ User B restored with "ephemeral" intact and zero words from User A.');

  // ------------------------------------------------------------------
  // TEST 3: Backup Export and Restore Roundtrip
  // ------------------------------------------------------------------
  console.log('\n[TEST 3] Verifying Backup Export and Import Roundtrip...');
  const backupIntegrity = await page.evaluate(() => {
    const backup = window.exportUserData();
    if (!backup || !backup.vocabularyRecords || !backup.settings) {
      return { ok: false, error: 'exportUserData returned invalid structure' };
    }
    // Modify current state
    localStorage.removeItem('wordloom-vocabulary-records');
    
    // Import backup
    const success = window.importUserData(backup);
    const restored = JSON.parse(localStorage.getItem('wordloom-vocabulary-records') || '{}');
    return {
      ok: success && !!restored['ephemeral'],
      restoredKeys: Object.keys(restored)
    };
  });

  if (!backupIntegrity.ok) {
    throw new Error('FAIL: Backup roundtrip failed: ' + JSON.stringify(backupIntegrity));
  }
  console.log('   ✓ Backup export and restore roundtrip verified.');

  // ------------------------------------------------------------------
  // TEST 4: WordloomDB IndexedDB Custom Book Persistence
  // ------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying WordloomDB IndexedDB Custom Book Engine...');
  const idbResult = await page.evaluate(async () => {
    if (!window.WordloomDB) return { ok: false, error: 'WordloomDB not defined' };
    const customTestBook = {
      title: 'Voyage Beyond The Stars',
      author: 'Test Explorer',
      level: 'B2',
      topic: 'science',
      length: '5 pages',
      chapters: [{ title: 'Voyage Beyond The Stars', subtitle: 'Part 1', paragraphs: ['Exploring deep space and distant constellations.'] }]
    };
    await window.WordloomDB.saveCustomBook(customTestBook);
    const stored = await window.WordloomDB.getAllCustomBooks();
    const found = stored.some(b => b.title === 'Voyage Beyond The Stars');
    return { ok: found, count: stored.length };
  });

  if (!idbResult.ok) {
    throw new Error('FAIL: IndexedDB custom book persistence failed: ' + JSON.stringify(idbResult));
  }
  console.log('   ✓ WordloomDB IndexedDB stores and retrieves custom literature.');

  // ------------------------------------------------------------------
  // TEST 5: Multilingual Core Dictionary
  // ------------------------------------------------------------------
  console.log('\n[TEST 5] Verifying Multilingual Offline Dictionary...');
  const multiDictResult = await page.evaluate(() => {
    const md = window.MULTILINGUAL_DICTIONARY;
    if (!md) return { ok: false, error: 'MULTILINGUAL_DICTIONARY not found' };
    const hasSpanish = md.es && md.es.morning && md.es.sea;
    const hasFrench = md.fr && md.fr.morning && md.fr.sea;
    const hasTurkish = md.tr && md.tr.morning && md.tr.sea;
    return {
      ok: Boolean(hasSpanish && hasFrench && hasTurkish),
      es: md.es?.morning?.[0],
      fr: md.fr?.morning?.[0],
      tr: md.tr?.morning?.[0]
    };
  });

  if (!multiDictResult.ok) {
    throw new Error('FAIL: Multilingual dictionary incomplete: ' + JSON.stringify(multiDictResult));
  }
  console.log(`   ✓ Offline translations verified: ES="${multiDictResult.es}", FR="${multiDictResult.fr}", TR="${multiDictResult.tr}".`);

  await browser.close();
  console.log('\n================================================================');
  console.log('  ALL MULTI-TENANT & PERSISTENCE VERIFICATIONS PASSED (100%)    ');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('\nFAILED WITH ERROR:\n', err);
  process.exit(1);
});
