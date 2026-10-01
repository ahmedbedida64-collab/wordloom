#!/usr/bin/env node
/**
 * tools/run_all_tests.js
 * Unified automated test runner for Wordloom.
 * 
 * Executes:
 * 1. Brown Natural Frame Button & Arrow Verification (verify_brown_frame_buttons.js)
 * 2. Reader Content & Metadata Integrity across 21 books (verify_browser_reader.js)
 * 3. Modern Authentication & Custom Books E2E (verify_recreated_auth_and_custom_books.js)
 * 4. Full-Screen Settings Page Layout & Dimensions (screenshot_settings_fullscreen.js)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  {
    name: 'Brown Natural Frame Buttons & Arrow Removal',
    file: 'tools/library/verify_brown_frame_buttons.js',
    description: 'Verifies back & forward button styling, colors (#8B5A2B/#FAF4EB), and absence of arrows.'
  },
  {
    name: 'Browser Reader & 21-Book Catalog Integrity',
    file: 'tools/library/verify_browser_reader.js',
    description: 'Verifies 21 books, opening paragraphs, page limits, topic shelves, and cover art files.'
  },
  {
    name: '21st-Auth System & Custom Books',
    file: 'tools/library/verify_recreated_auth_and_custom_books.js',
    description: 'Verifies login, registration, password toggle, SSO, guest access, and custom books.'
  },
  {
    name: 'Full-Screen Settings Layout & Viewports',
    file: 'tools/library/screenshot_settings_fullscreen.js',
    description: 'Validates full-screen 1360px layout, dashboard grid, and responsive wrapping.'
  }
];

console.log('================================================================');
console.log('              WORDLOOM UNIFIED TEST RUNNER                      ');
console.log('================================================================\n');

const results = [];
let allPassed = true;

const startTime = Date.now();

for (let i = 0; i < SUITES.length; i++) {
  const suite = SUITES[i];
  console.log(`[${i + 1}/${SUITES.length}] RUNNING: ${suite.name}`);
  console.log(`      File: ${suite.file}`);
  console.log(`      Desc: ${suite.description}`);
  
  const suiteStart = Date.now();
  const scriptPath = path.resolve(__dirname, '..', suite.file);
  
  const res = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });
  
  const duration = ((Date.now() - suiteStart) / 1000).toFixed(2);
  const passed = res.status === 0;
  if (!passed) allPassed = false;
  
  results.push({
    name: suite.name,
    passed,
    exitCode: res.status,
    duration: `${duration}s`
  });
  
  console.log(`\n>>> RESULT: ${passed ? '✓ PASSED' : '✗ FAILED'} (${duration}s)\n`);
  console.log('----------------------------------------------------------------\n');
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('================================================================');
console.log('                     TEST SUMMARY SCORECARD                     ');
console.log('================================================================');
results.forEach(r => {
  const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
  const namePadded = r.name.padEnd(46, ' ');
  console.log(`  [${symbol}]  ${namePadded}  (${r.duration})`);
});
console.log('================================================================');
console.log(`Total duration: ${totalDuration}s`);
console.log(`Status: ${allPassed ? 'ALL TEST SUITES PASSED (100%)' : 'SOME TESTS FAILED'}`);
console.log('================================================================\n');

process.exit(allPassed ? 0 : 1);
