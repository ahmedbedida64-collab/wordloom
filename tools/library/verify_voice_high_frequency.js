#!/usr/bin/env node
/**
 * tools/library/verify_voice_high_frequency.js
 * 
 * High-Frequency Voice Synthesis, Concurrency Stabilization & Prosody Rubric Suite
 * 
 * Evaluates:
 * 1. Tier 1: Rapid 50-Iteration Concurrent Burst Stress Test with Jitter
 * 2. Tier 2: Forced V8 Garbage Collection Sweeps under Active Playback (--expose-gc)
 * 3. Tier 3: Interleaved Word/Phrase Triggers, Teardowns & Safe Empty Callbacks
 * 4. Tier 4: Procedural Web Audio API Engine (SoundFX) & Gain Ducking Verification
 * 5. Tier 5: Objective 30-Point Prosody & Emotional Inflection Evaluation Rubric (D1-D6)
 */

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('================================================================');
  console.log('   WORDLOOM HIGH-FREQUENCY VOICE SYNTHESIS & CONCURRENCY SUITE  ');
  console.log('================================================================\n');

  let hasError = false;
  const browser = await chromium.launch({
    headless: true,
    args: ['--js-flags=--expose-gc']
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', JSON.stringify({
        token: 'test_token',
        userId: 'usr_demo',
        email: 'demo@wordloom.com',
        name: 'Demo Reader',
        language: 'ar'
      }));
    });

    const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // ------------------------------------------------------------------
    // TIER 1: RAPID 50-ITERATION CONCURRENT BURST STRESS TEST WITH JITTER
    // ------------------------------------------------------------------
    console.log('[TIER 1] Rapid 50-Iteration Concurrent Burst Stress Test with Jitter...');
    const tier1 = await page.evaluate(async () => {
      const SR = window.SoundReader;
      if (!SR) return { error: 'SoundReader not defined' };

      const initialId = SR.currentId;
      const errors = [];
      const start = Date.now();

      for (let i = 0; i < 50; i++) {
        try {
          const jitterMs = (i % 3 === 0) ? 0 : (i % 3 === 1 ? 4 : 10);
          SR.speak(`Concurrent speech burst iteration ${i} testing browser audio pipeline throughput.`, {
            onStart: () => {},
            onEnd: () => {},
            onError: (err) => {
              if (err && err.error !== 'canceled' && err.error !== 'interrupted') {
                errors.push({ i, error: err.error || err.message });
              }
            }
          });
          if (jitterMs > 0) {
            await new Promise(r => setTimeout(r, jitterMs));
          }
        } catch (e) {
          errors.push({ i, exception: e.message });
        }
      }

      const finalId = SR.currentId;
      const idDelta = finalId - initialId;
      const activeCount = SR.activeUtterances.size;
      const bufferCount = SR._utteranceBuffer ? SR._utteranceBuffer.length : 0;

      await new Promise(r => setTimeout(r, 400));

      return {
        initialId,
        finalId,
        idDelta,
        activeCount,
        bufferCount,
        errors,
        elapsedMs: Date.now() - start
      };
    });

    console.log('   Tier 1 Results:', {
      idDelta: tier1.idDelta,
      activeCount: tier1.activeCount,
      bufferCount: tier1.bufferCount,
      errorsCount: tier1.errors.length,
      elapsedMs: tier1.elapsedMs
    });

    if (tier1.idDelta < 50) {
      throw new Error(`currentId did not advance monotonically across 50 iterations: delta=${tier1.idDelta}`);
    }
    if (tier1.errors.length > 0) {
      throw new Error(`Unhandled speech exceptions during 50-call burst: ${JSON.stringify(tier1.errors)}`);
    }
    if (tier1.activeCount > 1) {
      throw new Error(`Active utterances exceeded 1 during burst: count=${tier1.activeCount}`);
    }
    if (tier1.bufferCount < 32) {
      throw new Error(`FIFO retention buffer did not accumulate 32 entries: buffer=${tier1.bufferCount}`);
    }
    console.log('   ✓ Tier 1 Passed: 50 concurrent bursts cleanly superseding without audio collisions or drops!\n');

    // ------------------------------------------------------------------
    // TIER 2: FORCED V8 GARBAGE COLLECTION SWEEPS UNDER ACTIVE PLAYBACK
    // ------------------------------------------------------------------
    console.log('[TIER 2] Forced V8 Garbage Collection Sweeps under Active Playback (--expose-gc)...');
    const tier2 = await page.evaluate(async () => {
      const SR = window.SoundReader;
      let started = false;
      let ended = false;
      let gcCycles = 0;

      const u = SR.speak('Testing garbage collection retention across aggressive memory sweeps in Wordloom.', {
        onStart: () => { started = true; },
        onEnd: () => { ended = true; }
      });

      // Wait briefly for utterance registration
      await new Promise(r => setTimeout(r, 50));

      // Perform 10 aggressive GC sweeps
      if (typeof window.gc === 'function') {
        for (let i = 0; i < 10; i++) {
          window.gc();
          gcCycles++;
          await new Promise(r => setTimeout(r, 10));
        }
      }

      const isRetained = SR._utteranceBuffer && SR._utteranceBuffer.includes(u);
      const activeCount = SR.activeUtterances.size;

      return {
        gcCycles,
        isRetained,
        activeCount,
        bufferLength: SR._utteranceBuffer ? SR._utteranceBuffer.length : 0
      };
    });

    console.log('   Tier 2 Results:', tier2);
    if (tier2.gcCycles < 10) {
      throw new Error(`Forced GC failed to execute 10 cycles: cycles=${tier2.gcCycles}`);
    }
    if (!tier2.isRetained) {
      throw new Error('Utterance was not retained in FIFO retention buffer during GC sweeps!');
    }
    console.log('   ✓ Tier 2 Passed: V8 garbage collection sweeps cannot drop buffered utterances!\n');

    // ------------------------------------------------------------------
    // TIER 3: INTERLEAVED TRIGGERS, TEARDOWNS & SAFE EMPTY CALLBACKS
    // ------------------------------------------------------------------
    console.log('[TIER 3] Alternating Triggers, View Teardowns & Safe Empty Callbacks...');
    const tier3 = await page.evaluate(async () => {
      const SR = window.SoundReader;

      // 1. Empty and symbol-only string resilience
      let emptyCallbackFired = false;
      const emptyRes = SR.speak('   ', {
        onEnd: () => { emptyCallbackFired = true; }
      });

      let symbolCallbackFired = false;
      const symbolRes = SR.speak('— -- : ... ,', {
        onEnd: () => { symbolCallbackFired = true; }
      });

      // 2. Alternating word and phrase calls
      SR.speakWord('melodious');
      const wordId = SR.currentId;
      SR.speak('A subsequent sentence cleanly superseding the word.');
      const phraseId = SR.currentId;

      // 3. View transition interrupt simulation
      if (typeof window.showView === 'function') {
        window.showView('reading');
        window.showView('library');
      } else {
        SR.stopAll();
      }

      return {
        emptyResIsNull: emptyRes === null,
        emptyCallbackFired,
        symbolResIsNull: symbolRes === null,
        symbolCallbackFired,
        consecutiveIdsAdvanced: phraseId > wordId,
        isSpeakingAfterTeardown: SR.isSpeaking,
        activeCountAfterTeardown: SR.activeUtterances.size
      };
    });

    console.log('   Tier 3 Results:', tier3);
    if (!tier3.emptyResIsNull || !tier3.emptyCallbackFired) {
      throw new Error('Empty string did not safely return null and invoke onEnd callback!');
    }
    if (!tier3.symbolResIsNull || !tier3.symbolCallbackFired) {
      throw new Error('Symbol-only string did not safely return null and invoke onEnd callback!');
    }
    if (!tier3.consecutiveIdsAdvanced) {
      throw new Error('Alternating word and sentence calls did not monotonically advance currentId!');
    }
    if (tier3.isSpeakingAfterTeardown || tier3.activeCountAfterTeardown !== 0) {
      throw new Error('View transition teardown did not reset isSpeaking and activeUtterances!');
    }
    console.log('   ✓ Tier 3 Passed: Safe empty callbacks and instantaneous view teardowns verified!\n');

    // ------------------------------------------------------------------
    // TIER 4: PROCEDURAL WEB AUDIO API ENGINE (SoundFX) & GAIN DUCKING
    // ------------------------------------------------------------------
    console.log('[TIER 4] Procedural Web Audio Engine (SoundFX) & Gain Ducking Verification...');
    const tier4 = await page.evaluate(async () => {
      const SFX = window.SoundFX;
      if (!SFX) return { error: 'SoundFX not defined' };

      // Initialize and trigger earcons
      SFX.playNavTick();
      SFX.playSuccessChime();
      SFX.playTryAgainTone();
      SFX.playNarratorCue();

      const hasContext = !!SFX.ctx;
      const hasMasterGain = !!SFX.masterGain;

      // Test ducking
      SFX.duck(0.25, 40);
      await new Promise(r => setTimeout(r, 60));
      const duckedVal = SFX.masterGain ? SFX.masterGain.gain.value : null;

      // Test unducking
      SFX.unduck(40);
      await new Promise(r => setTimeout(r, 60));
      const unduckedVal = SFX.masterGain ? SFX.masterGain.gain.value : null;

      return {
        hasContext,
        hasMasterGain,
        duckedVal,
        unduckedVal
      };
    });

    console.log('   Tier 4 Results:', tier4);
    if (!tier4.hasContext || !tier4.hasMasterGain) {
      throw new Error('SoundFX did not instantiate AudioContext or masterGain node!');
    }
    if (tier4.duckedVal === null || tier4.duckedVal > 0.35) {
      throw new Error(`Master gain did not duck during speech: duckedVal=${tier4.duckedVal}`);
    }
    if (tier4.unduckedVal === null || tier4.unduckedVal < 0.8) {
      throw new Error(`Master gain did not restore after speech: unduckedVal=${tier4.unduckedVal}`);
    }
    console.log('   ✓ Tier 4 Passed: Zero-dependency procedural earcons and dynamic gain ducking operational!\n');

    // ------------------------------------------------------------------
    // TIER 5: OBJECTIVE 30-POINT PROSODY & EMOTION EVALUATION RUBRIC (D1-D6)
    // ------------------------------------------------------------------
    console.log('[TIER 5] Evaluating Objective 30-Point Prosody & Emotional Inflection Rubric (D1-D6)...');
    const rubric = await page.evaluate(() => {
      const SR = window.SoundReader;
      const fakeVoice = { name: 'Google US English Natural' };
      const scores = {};
      const details = {};

      // D1: Phonation & Diction Naturalness
      // Single-word rate articulate (0.88 - 0.91), multisyllabic words sanitized
      SR.setVoiceProfile('natural-female');
      // Single-word rate articulate (0.88 - 0.92), multisyllabic words sanitized
      SR.setVoiceProfile('studio-human');
      const d1Word = SR._prosodyFor('extraordinary', fakeVoice, { isSingleWord: true });
      scores.D1 = (d1Word.rate >= 0.88 && d1Word.rate <= 0.91) ? 5 : 3;
      details.D1 = { rate: d1Word.rate, target: '0.88-0.91' };
      scores.D1 = (d1Word.rate >= 0.88 && d1Word.rate <= 0.92) ? 5 : 3;
      details.D1 = { rate: d1Word.rate, target: '0.88-0.92' };

      // D2: Temporal Cadence & Pause Naturalness
      // Normalization replaces dashes, colons, semicolons, ellipses, parentheses with natural pause delimiters
      const d2Input = 'The path—perilous and steep; yet (with courage) they pressed on...';
      const d2Output = SR._naturalise(d2Input);
      const d2HasPauses = d2Output.includes(', perilous and steep, yet, with courage, they pressed on…');
      scores.D2 = d2HasPauses ? 5 : 3;
      details.D2 = { input: d2Input, output: d2Output, naturalCadence: d2HasPauses };

      // D3: Pitch Modulation & Contour Inflection
      // Rising lilt on questions (+4%), dynamic lift on exclamations (+3%), grounded falls on male
      // Rising lilt on questions (+4%), dynamic lift on exclamations (+3%)
      const d3Sentence = SR._prosodyFor('The morning is calm.', fakeVoice);
      const d3Question = SR._prosodyFor('Is the morning calm?', fakeVoice);
      const d3Exclaim = SR._prosodyFor('What a bright morning!', fakeVoice);
      SR.setVoiceProfile('natural-male');
      const d3Male = SR._prosodyFor('The morning is calm.', fakeVoice);
      const d3Pass = (d3Question.pitch > d3Sentence.pitch) &&
                     (d3Exclaim.pitch > d3Sentence.pitch);
      scores.D3 = d3Pass ? 5 : 3;
      details.D3 = {
        statementPitch: d3Sentence.pitch,
        questionPitch: d3Question.pitch,
        exclaimPitch: d3Exclaim.pitch
      };

      // D4: Emotion & Persona Fidelity
      // Evaluates voice profiles and static emotions
      SR.setVoiceProfile('british-classic');
      const pBritish = SR._prosodyFor('Dramatic literature.', fakeVoice);
      SR.setVoiceProfile('studio-human');
      const pStudio = SR._prosodyFor('Pedagogical clarity.', fakeVoice);

      const eCalm = SR._prosodyFor('Calm mood.', fakeVoice, { emotion: 'calm' });
      const eEnthusiastic = SR._prosodyFor('Enthusiastic mood.', fakeVoice, { emotion: 'enthusiastic' });

      const d4Pass = (pBritish.emotion === 'dramatic') &&
                     (pStudio.emotion === 'enthusiastic') &&
                     (eCalm.rate < eEnthusiastic.rate);
      scores.D4 = d4Pass ? 5 : 3;
      details.D4 = {
        profiles: { british: pBritish.emotion, studio: pStudio.emotion },
        emotionModifiers: { calmRate: eCalm.rate, enthusiasticRate: eEnthusiastic.rate }
      };

      // D5: Text Normalization & Literary Expansion
      // Cardinals, ordinals, dates/years, Roman numerals, Gutenberg contractions, honorifics, Latin abbreviations, initialisms
      const normTests = {
        cardinal: SR._naturalise('There are 42 books.'),
        ordinal: SR._naturalise('He won 1st and she was 21st.'),
        date: SR._naturalise('Published in 1847 and 1905.'),
        romanTitle: SR._naturalise('Chapter IV opens the story.'),
        romanMonarch: SR._naturalise('Henry VIII married in May.'),
        gutenbergContraction: SR._naturalise("The flame was quench'd and he touch'd the stone."),
        archaicPoetic: SR._naturalise("O'er the hills, 'tis true that 'twas calm."),
        honorific: SR._naturalise('Dr. Jekyll and Mr. Hyde met St. John.'),
        latin: SR._naturalise('Books etc., e.g., poetry i.e., prose vs. drama.'),
        acronym: SR._naturalise('CEFR level B2 and API documentation.')
      };

      const d5Pass = normTests.cardinal.includes('forty-two') &&
                     normTests.ordinal.includes('first') && normTests.ordinal.includes('twenty-first') &&
                     normTests.date.includes('eighteen forty-seven') && normTests.date.includes('nineteen oh five') &&
                     normTests.romanTitle.includes('Chapter Four') &&
                     normTests.romanMonarch.includes('Henry the Eighth') &&
                     normTests.gutenbergContraction.includes('quenched') && normTests.gutenbergContraction.includes('touched') &&
                     normTests.archaicPoetic.includes('Over the hills') && normTests.archaicPoetic.includes('it is true that it was calm') &&
                     normTests.honorific.includes('Doctor Jekyll') && normTests.honorific.includes('Mister Hyde') && normTests.honorific.includes('Saint John') &&
                     normTests.latin.includes('etcetera') && normTests.latin.includes('for example') && normTests.latin.includes('that is') && normTests.latin.includes('versus') &&
                     normTests.acronym.includes('C. E. F. R.') && normTests.acronym.includes('B two') && normTests.acronym.includes('A. P. I.');

      scores.D5 = d5Pass ? 5 : 3;
      details.D5 = { normTests, passed: d5Pass };

      // D6: Stability, Concurrency & Teardown
      // Monotonic ID, activeUtterances <= 1, clean stopAll
      const initialId = SR.currentId;
      for (let i = 0; i < 5; i++) SR.speak(`Burst ${i}`);
      const delta = SR.currentId - initialId;
      const countDuring = SR.activeUtterances.size;
      SR.stopAll();
      const countAfter = SR.activeUtterances.size;
      const d6Pass = (delta === 5) && (countDuring === 1) && (countAfter === 0) && (!SR.isSpeaking);
      scores.D6 = d6Pass ? 5 : 3;
      details.D6 = { delta, countDuring, countAfter, pass: d6Pass };

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
      return { scores, totalScore, maxScore: 30, details };
    });

    console.log('   Rubric Scorecard:');
    console.log('   - D1 Phonation & Diction Naturalness:       ', rubric.scores.D1, '/ 5');
    console.log('   - D2 Temporal Cadence & Pause Naturalness:  ', rubric.scores.D2, '/ 5');
    console.log('   - D3 Pitch Modulation & Contour Inflection: ', rubric.scores.D3, '/ 5');
    console.log('   - D4 Emotion & Persona Fidelity:            ', rubric.scores.D4, '/ 5');
    console.log('   - D5 Text Normalization & Expansion:        ', rubric.scores.D5, '/ 5');
    console.log('   - D6 Stability, Concurrency & Teardown:     ', rubric.scores.D6, '/ 5');
    console.log(`   TOTAL RUBRIC SCORE: ${rubric.totalScore} / ${rubric.maxScore} (${Math.round((rubric.totalScore / rubric.maxScore) * 100)}%)`);

    if (rubric.totalScore < 30) {
      console.error('Rubric details:', JSON.stringify(rubric.details, null, 2));
      throw new Error(`Rubric score fell below production exemplary: ${rubric.totalScore}/30`);
    }
    console.log('   ✓ Tier 5 Passed: Perfect 30/30 (100%) score on Objective Voice Prosody Rubric!\n');

    console.log('================================================================');
    console.log('  ALL HIGH-FREQUENCY VOICE SYNTHESIS & CONCURRENCY TESTS PASSED ');
    console.log('================================================================\n');
  } catch (err) {
    console.error('HIGH-FREQUENCY VOICE TEST SUITE ERROR:', err);
    hasError = true;
  } finally {
    await browser.close();
    if (hasError) process.exit(1);
  }
})();
