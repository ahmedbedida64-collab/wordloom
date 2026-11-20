#!/usr/bin/env node
/**
 * tools/library/audit_cefr_levels.js
 * Comprehensive pedagogical and readability audit for Wordloom's book collection.
 * 
 * Computes:
 * - Flesch Reading Ease (FRE)
 * - Flesch-Kincaid Grade Level (FKGL)
 * - Average Words per Sentence (WPS)
 * - Lexical Complexity Percentage (% words with >= 3 syllables)
 * - Archaic / Victorian Vocabulary Density (thou, thee, hath, dost, etc.)
 * - CEFR Level Concordance (Current vs Recommended)
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../../index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const catalogMatch = html.match(/const WORDLOOM_CATALOG = (\[[\s\S]*?\]);\s*\n/);
const extMatch = html.match(/const WORDLOOM_GUTENBERG_EXTENDED = (\[[\s\S]*?\]);\s*\n/);

if (!catalogMatch || !extMatch) {
  console.error('Failed to parse catalogs from index.html');
  process.exit(1);
}

const catalog = eval(catalogMatch[1]);
const extended = eval(extMatch[1]);
const allBooks = [...catalog, ...extended];

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

const ARCHAIC_WORDS = new Set([
  'thou', 'thee', 'thy', 'thine', 'ye', 'hath', 'dost', 'doth', 'wilt', 'art',
  'ere', 'erelong', 'descry', 'whence', 'whither', 'nay', 'aye', 'spake',
  'behold', 'quoth', 'smote', 'cleave', 'forsooth', 'sirrah', 'oft', 'alas', 'alack'
]);

console.log('================================================================');
console.log('       WORDLOOM CEFR & READABILITY COMPREHENSIVE AUDIT          ');
console.log('================================================================\n');

console.log(`Total books in collection: ${allBooks.length} (${catalog.length} core + ${extended.length} extended)`);

// 1. Current App Level Distribution
const currentDist = {};
allBooks.forEach(b => { currentDist[b.level] = (currentDist[b.level] || 0) + 1; });
console.log('\nCurrent App Level Distribution:');
console.log(currentDist);

// 2. Audit each book
const audited = allBooks.map((b, idx) => {
  let allText = '';
  if (b.chapters) {
    b.chapters.forEach(c => {
      if (c.paragraphs) allText += ' ' + c.paragraphs.join(' ');
    });
  }
  const words = allText.trim().split(/\s+/).filter(Boolean);
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const wps = Number((wordCount / sentenceCount).toFixed(1));

  let syllables = 0;
  let complexWords = 0;
  let archaicCount = 0;
  const foundArchaic = new Set();

  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z]/g, '');
    const syl = countSyllables(clean);
    syllables += syl;
    if (syl >= 3) complexWords++;
    if (ARCHAIC_WORDS.has(clean)) {
      archaicCount++;
      foundArchaic.add(clean);
    }
  });

  const avgSyl = syllables / Math.max(1, wordCount);
  const fre = Number((206.835 - 1.015 * wps - 84.6 * avgSyl).toFixed(1));
  const fkgl = Number((0.39 * wps + 11.8 * avgSyl - 15.59).toFixed(1));
  const complexPct = Number(((complexWords / Math.max(1, wordCount)) * 100).toFixed(1));

  // Determine pedagogical CEFR recommendation
  let recommendedLevel = 'B1';
  if (b.title.includes('Shakespeare') || (archaicCount >= 5 && b.author.includes('Shakespeare'))) {
    recommendedLevel = 'C2';
  } else if (
    b.title.includes('Wealth of Nations') ||
    b.title.includes('Opticks') ||
    b.title.includes('Plato') ||
    b.title.includes('Critias') ||
    b.title.includes('A Modest Proposal') ||
    b.title.includes('Poe') ||
    b.title.includes('Amontillado') ||
    b.title.includes('Usher') ||
    b.title.includes('The Prince')
  ) {
    recommendedLevel = 'C1';
  } else if (
    b.title.includes('Tale of Two Cities') ||
    b.title.includes('Frankenstein') ||
    b.title.includes('Origin of Species') ||
    b.title.includes('Metamorphosis') ||
    b.title.includes('Sketches New and Old')
  ) {
    recommendedLevel = 'B2';
  } else if (fkgl >= 10.5 || (wps >= 24 && complexPct >= 12)) {
    recommendedLevel = 'C1';
  } else if (fkgl >= 7.5 || wps >= 18 || complexPct >= 10) {
    recommendedLevel = 'B2';
  } else if (fkgl >= 5.0 || wps >= 13 || archaicCount > 0) {
    recommendedLevel = 'B1';
  } else if (fkgl >= 3.0 && archaicCount === 0 && wps <= 12) {
    recommendedLevel = 'A2';
  } else {
    recommendedLevel = 'A1';
  }

  return {
    index: idx + 1,
    title: b.title,
    author: b.author,
    currentLevel: b.level,
    recommendedLevel,
    isMisclassified: b.level !== recommendedLevel,
    wps,
    fre,
    fkgl,
    complexPct,
    archaicCount,
    archaicWords: Array.from(foundArchaic).slice(0, 4)
  };
});

const recommendedDist = {};
audited.forEach(b => { recommendedDist[b.recommendedLevel] = (recommendedDist[b.recommendedLevel] || 0) + 1; });
console.log('\nScientifically Recommended CEFR Level Distribution:');
console.log(recommendedDist);

const misclassified = audited.filter(a => a.isMisclassified);
console.log(`\nMisclassified Titles: ${misclassified.length} out of ${audited.length} (${((misclassified.length / audited.length) * 100).toFixed(1)}%)`);

module.exports = { audited, currentDist, recommendedDist, misclassified };
