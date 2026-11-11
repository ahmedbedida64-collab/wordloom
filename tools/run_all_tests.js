#!/usr/bin/env node
/**
 * tools/run_all_tests.js
 * Unified automated test runner for Wordloom.
 * 
 * Executes the complete 4-tier verification matrix:
 * 1. Brown Natural Frame Button & Arrow Verification (verify_brown_frame_buttons.js)
 * 2. Reader Content & Metadata Integrity across 21 books (verify_browser_reader.js)
 * 3. Modern Authentication & Custom Books E2E (verify_recreated_auth_and_custom_books.js)
 * 4. Full-Screen Settings Page Layout & Dimensions (screenshot_settings_fullscreen.js)
 * 5. Type What You Hear Review Mode (verify_type_what_you_hear.js)
 * 6. Reader Voice Profiles & Audio Preview (verify_voice_profiles.js)
 * 7. Multilingual Translation & Dictionary Engine (verify_translation_fix.js)
 * 8. Tier 1: Feature Coverage & Application Shell Integrity (tier1_feature_coverage.js)
 * 9. Tier 2: Boundary, Corner Cases & Design Guardrails (tier2_boundary_corner.js)
 * 10. Tier 3: Cross-Feature Combinations & State Transitions (tier3_cross_feature.js)
 * 11. Tier 4: Real-World Scenarios, Multi-Viewport & Offline (tier4_real_world.js)
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
  },
  {
    name: 'Type What You Hear Review Mode',
    file: 'tools/library/verify_type_what_you_hear.js',
    description: 'Verifies 3rd review activity mode: audio synthesis, pure typing input, validation, hints, and scoring.'
  },
  {
    name: 'Reader Voice Profiles & Audio Preview',
    file: 'tools/library/verify_voice_profiles.js',
    description: 'Verifies 4 narrator voice archetypes, preview audio testing, Brown Natural Frame button, and cross-session persistence.'
  },
  {
    name: 'Multilingual Translation & Dictionary Engine',
    file: 'tools/library/verify_translation_fix.js',
    description: 'Verifies multilingual dictionary popup (AR/FR/ES), definition display, and review game integration.'
  },
  {
    name: 'Tier 1: Feature Coverage & App Shell Integrity',
    file: 'tools/library/tier1_feature_coverage.js',
    description: 'Verifies all 5 views, catalog shelf filters, audio engine, auth lock/unlock, and custom book controls.'
  },
  {
    name: 'Tier 2: Boundary, Corner Cases & Design Guardrails',
    file: 'tools/library/tier2_boundary_corner.js',
    description: 'Verifies limits, empty review decks, rapid page turns, regex searches, corrupted JSON recovery, and button design standards.'
  },
  {
    name: 'Tier 3: Cross-Feature Combinations & State Flows',
    file: 'tools/library/tier3_cross_feature.js',
    description: 'Verifies end-to-end learner journey: auth -> reading -> word lookup -> save to review -> 3 mini-games -> settings -> persistence.'
  },
  {
    name: 'Tier 4: Real-World Scenarios, Multi-Viewport & Offline',
    file: 'tools/library/tier4_real_world.js',
    description: 'Verifies mobile (390x844) & desktop (1440x900) zero overflow, dock auto-hiding, and sw.js offline caching.'
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
  const namePadded = r.name.padEnd(52, ' ');
  console.log(`  [${symbol}]  ${namePadded}  (${r.duration})`);
});
console.log('================================================================');
console.log(`Total duration: ${totalDuration}s`);
console.log(`Status: ${allPassed ? 'ALL TEST SUITES PASSED (100%)' : 'SOME TESTS FAILED'}`);
console.log('================================================================\n');

process.exit(allPassed ? 0 : 1);
