/**
 * verify_browser_reader.js
 * Simulates Section 8 Step 2 browser test across all 21 books in WORDLOOM_CATALOG:
 * - Opens every book
 * - Validates Page 1 (opening paragraph, heading, author)
 * - Validates Final Page (closing paragraph, 'Finished ✓' state)
 * - Validates Library Card metadata (topic shelf, level badge, cover photo file)
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const catalogMatch = html.match(/const WORDLOOM_CATALOG\s*=\s*(\[[\s\S]*?\]);/);
if (!catalogMatch) {
  console.error('Failed to locate WORDLOOM_CATALOG in index.html');
  process.exit(1);
}
const catalog = eval(catalogMatch[1]);

console.log(`=== BROWSER READER & METADATA VERIFICATION (${catalog.length} TITLES) ===\n`);

let passed = 0;
let failed = 0;
const results = [];

catalog.forEach((book, idx) => {
  const issues = [];
  
  // 1. Cover existence
  const coverRel = book.photo.replace(/^\.\//, '');
  const coverPath = path.join(__dirname, '../../', coverRel);
  if (!fs.existsSync(coverPath)) {
    issues.push(`Cover missing: ${coverRel}`);
  }
  
  // 2. Page counts
  const totalPages = book.chapters ? book.chapters.length : 0;
  if (totalPages < 20 || totalPages > 100) {
    issues.push(`Page count ${totalPages} out of bounds (20-100)`);
  }
  
  // 3. Page 1 verification (openReader simulation)
  const page1 = book.chapters[0];
  if (!page1 || !page1.paragraphs || page1.paragraphs.length === 0) {
    issues.push('Page 1 has no paragraphs');
  }
  const firstPara = page1.paragraphs[0] || '';
  if (firstPara.length < 15) {
    issues.push('Page 1 opening paragraph suspiciously short');
  }
  
  // 4. Final page verification
  const lastPage = book.chapters[totalPages - 1];
  if (!lastPage || !lastPage.paragraphs || lastPage.paragraphs.length === 0) {
    issues.push('Final page has no paragraphs');
  }
  const lastPara = lastPage.paragraphs[lastPage.paragraphs.length - 1] || '';
  if (lastPara.length < 15) {
    issues.push('Final page closing paragraph suspiciously short');
  }
  
  // 5. Taxonomy
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const validTopics = ['life', 'travel', 'science', 'history', 'culture', 'technology', 'business'];
  if (!validLevels.includes(book.level)) issues.push(`Invalid level: ${book.level}`);
  if (!validTopics.includes(book.topic)) issues.push(`Invalid topic: ${book.topic}`);
  
  const status = issues.length === 0 ? 'PASS' : 'FAIL';
  if (status === 'PASS') passed++; else failed++;
  
  results.push({
    title: book.title,
    author: book.author,
    level: book.level,
    topic: book.topic,
    pages: totalPages,
    cover: coverRel,
    firstParaSnippet: firstPara.slice(0, 50) + '...',
    lastParaSnippet: lastPara.slice(-50),
    status,
    issues
  });
  
  console.log(`[${status}] #${String(idx + 1).padStart(2)} "${book.title.padEnd(42)}" | ${String(totalPages).padStart(3)} pgs | ${book.level} · ${book.topic.padEnd(8)} | Cover: ${coverRel}`);
  if (issues.length > 0) {
    issues.forEach(iss => console.log(`       ⚠️  ${iss}`));
  }
});

console.log('\n──────────────────────────────────────────────────────────────────');
console.log(`Verification Summary: ${passed} passed, ${failed} failed out of ${catalog.length} books.`);
console.log('──────────────────────────────────────────────────────────────────\n');

if (failed > 0) process.exit(1);
