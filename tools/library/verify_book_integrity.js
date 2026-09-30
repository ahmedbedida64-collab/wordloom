/**
 * verify_book_integrity.js
 * Usage: node verify_book_integrity.js <path_to_book.json>
 * Exits 0 if all checks pass, non-zero on any failure.
 */
const fs = require('fs');
const { computeMetrics } = require('./compute_metrics.js');

const bookPath = process.argv[2];
if (!bookPath) { console.error('Usage: node verify_book_integrity.js <book.json>'); process.exit(1); }

const book = JSON.parse(fs.readFileSync(bookPath, 'utf8'));
const errors = [];

const chapters = book.chapters || [];
const totalText = chapters.flatMap(c => c.paragraphs || []).join(' ');
const { word_count, level_measured } = computeMetrics(totalText);
const pageCount = chapters.length;

// Check 1: Schema fields
const required = ['title','author','level','topic','cover','progress','source','length','kind','description','photo','chapters'];
required.forEach(f => { if (book[f] === undefined) errors.push(`MISSING_FIELD: ${f}`); });

// Check 2: Page count 20-100
if (pageCount < 20 || pageCount > 100) errors.push(`PAGE_COUNT_OOB: ${pageCount} (must be 20-100)`);

// Check 3: No empty chapters
chapters.forEach((ch, i) => {
  if (!ch.paragraphs || ch.paragraphs.length === 0) errors.push(`EMPTY_CHAPTER: index ${i}`);
});

// Check 4: No truncation patterns
const lastPara = (chapters[chapters.length-1]?.paragraphs || []).slice(-1)[0] || '';
if (/\.\.\.|continued\]|unfinished/i.test(lastPara)) errors.push('TRUNCATION_DETECTED');

// Check 5: Word count in range (2420-12100)
if (word_count < 2420 || word_count > 12100) errors.push(`WORD_COUNT_OOB: ${word_count} (must be 2420-12100)`);

// Check 6: Title present
if (!book.title || book.title.trim() === '') errors.push('BLANK_TITLE');

if (errors.length === 0) {
  console.log(`PASS | ${book.title} | pages:${pageCount} | words:${word_count} | level_measured:${level_measured}`);
  process.exit(0);
} else {
  console.error(`FAIL | ${book.title||bookPath}`);
  errors.forEach(e => console.error('  >', e));
  process.exit(1);
}
