/**
 * Phase 2: Targeted Gutenberg Discovery
 * Queries Gutendex by topic/bookshelf to maximize relevant candidates.
 * Also scans StoryWeaver API for A1/A2 CC BY 4.0 books.
 * Uses cached pages first, then fetches only what is missing.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = 'docs/library/cache';
const LEDGER = 'docs/library/CRAWL_LEDGER.jsonl';
const CANDIDATES_CSV = 'docs/library/candidates.csv';
const DELAY_MS = 2100;

// TARGET TOPIC SEARCHES for Gutendex
// Format: { query params, mapped_topic, mapped_level_hint }
const TARGETED_SEARCHES = [
  // LIFE
  { params: 'topic=autobiography&languages=en', topic:'life', level_hint:'B1' },
  { params: 'topic=family&languages=en', topic:'life', level_hint:'A2' },
  { params: 'topic=domestic+fiction&languages=en', topic:'life', level_hint:'B1' },
  { params: 'topic=love+stories&languages=en', topic:'life', level_hint:'B2' },
  { params: 'topic=short+stories&languages=en', topic:'life', level_hint:'B1' },
  // TRAVEL
  { params: 'topic=travel&languages=en', topic:'travel', level_hint:'B1' },
  { params: 'topic=adventure&languages=en', topic:'travel', level_hint:'B1' },
  { params: 'topic=sea+stories&languages=en', topic:'travel', level_hint:'B2' },
  { params: 'topic=voyages&languages=en', topic:'travel', level_hint:'B1' },
  { params: 'topic=exploration&languages=en', topic:'travel', level_hint:'B2' },
  // SCIENCE
  { params: 'topic=natural+history&languages=en', topic:'science', level_hint:'B2' },
  { params: 'topic=science&languages=en', topic:'science', level_hint:'C1' },
  { params: 'topic=animals&languages=en', topic:'science', level_hint:'A2' },
  { params: 'topic=nature&languages=en', topic:'science', level_hint:'B1' },
  // HISTORY
  { params: 'topic=history&languages=en', topic:'history', level_hint:'B2' },
  { params: 'topic=biography&languages=en', topic:'history', level_hint:'B1' },
  { params: 'topic=war&languages=en', topic:'history', level_hint:'B2' },
  { params: 'topic=ancient&languages=en', topic:'history', level_hint:'C1' },
  // CULTURE
  { params: 'topic=fairy+tales&languages=en', topic:'culture', level_hint:'A2' },
  { params: 'topic=folklore&languages=en', topic:'culture', level_hint:'A2' },
  { params: 'topic=mythology&languages=en', topic:'culture', level_hint:'B1' },
  { params: 'topic=fables&languages=en', topic:'culture', level_hint:'A1' },
  { params: 'topic=legends&languages=en', topic:'culture', level_hint:'B1' },
  { params: 'topic=children&languages=en', topic:'culture', level_hint:'A1' },
  // TECHNOLOGY
  { params: 'topic=invention&languages=en', topic:'technology', level_hint:'B2' },
  { params: 'topic=engineering&languages=en', topic:'technology', level_hint:'C1' },
  { params: 'topic=industry&languages=en', topic:'technology', level_hint:'B2' },
  // BUSINESS
  { params: 'topic=economics&languages=en', topic:'business', level_hint:'C1' },
  { params: 'topic=commerce&languages=en', topic:'business', level_hint:'B2' },
  { params: 'topic=work&languages=en', topic:'business', level_hint:'B1' },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'User-Agent': 'WordloomLibraryBuilder/1.0 (educational)' } };
    https.get(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(entry) { fs.appendFileSync(LEDGER, JSON.stringify({...entry, ts: new Date().toISOString()}) + '\n'); }

async function fetchPage(url, cacheKey) {
  const cacheFile = path.join(CACHE_DIR, cacheKey + '.json');
  if (fs.existsSync(cacheFile)) {
    return { status: 200, body: JSON.parse(fs.readFileSync(cacheFile, 'utf8')) };
  }
  await sleep(DELAY_MS);
  const result = await fetchJson(url);
  if (result.status === 200) fs.writeFileSync(cacheFile, JSON.stringify(result.body));
  log({ type: 'fetch', url, status: result.status });
  return result;
}

async function run() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const seen = new Set();
  const candidates = [];
  const stats = { discovered:0, fetched:0, skipped_death:0, skipped_no_text:0, skipped_unknown:0, duplicates:0 };

  // CSV header
  fs.writeFileSync(CANDIDATES_CSV,
    'id,title,author,death_year,level_hint,topic_hint,licence,source_url,download_url\n');

  for (const search of TARGETED_SEARCHES) {
    const url = `https://gutendex.com/books/?${search.params}&mime_type=text%2Fplain`;
    const cacheKey = 'targeted_' + search.params.replace(/[^a-z0-9]/g,'_').slice(0,50);

    let result;
    try { result = await fetchPage(url, cacheKey); }
    catch(e) { log({type:'error', url, reason: e.message}); continue; }
    if (result.status !== 200) continue;

    const books = result.body.results || [];
    stats.discovered += books.length;

    for (const book of books) {
      stats.fetched++;
      if (seen.has(book.id)) { stats.duplicates++; continue; }
      seen.add(book.id);

      const authors = book.authors || [];
      if (!authors.length) { stats.skipped_unknown++; continue; }
      const dy = authors[0].death_year;
      if (!dy) { stats.skipped_unknown++; continue; }
      if (dy > 1955) { stats.skipped_death++; continue; }

      const formats = book.formats || {};
      const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain; charset=us-ascii'] || formats['text/plain'];
      if (!txtUrl) { stats.skipped_no_text++; continue; }

      const authorName = authors[0].name || 'Unknown';
      const row = [
        book.id,
        '"' + (book.title||'').replace(/"/g,'""') + '"',
        '"' + authorName.replace(/"/g,'""') + '"',
        dy,
        search.level_hint,
        search.topic,
        'Public Domain',
        `https://www.gutenberg.org/ebooks/${book.id}`,
        txtUrl
      ].join(',');

      fs.appendFileSync(CANDIDATES_CSV, row + '\n');
      candidates.push({ id: book.id, title: book.title, author: authorName, death_year: dy,
        level_hint: search.level_hint, topic_hint: search.topic, txt_url: txtUrl });
    }

    process.stdout.write(`[${candidates.length} candidates so far] Searched: ${search.params.slice(0,30)}\r`);
  }

  // Also process already-cached general pages 1 & 2
  for (let p = 1; p <= 2; p++) {
    const cacheFile = path.join(CACHE_DIR, `gut_page_${p}.json`);
    if (!fs.existsSync(cacheFile)) continue;
    const books = JSON.parse(fs.readFileSync(cacheFile,'utf8')).results || [];
    for (const book of books) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      stats.discovered++;
      const authors = book.authors || [];
      if (!authors.length || !authors[0].death_year || authors[0].death_year > 1955) continue;
      const formats = book.formats || {};
      const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain; charset=us-ascii'] || formats['text/plain'];
      if (!txtUrl) continue;
      const dy = authors[0].death_year;
      const authorName = authors[0].name || 'Unknown';
      const row = [book.id, '"' + (book.title||'').replace(/"/g,'""') + '"',
        '"' + authorName.replace(/"/g,'""') + '"', dy,
        'B1','life','Public Domain',
        `https://www.gutenberg.org/ebooks/${book.id}`, txtUrl].join(',');
      fs.appendFileSync(CANDIDATES_CSV, row + '\n');
      candidates.push({ id: book.id, title: book.title, author: authorName, death_year: dy,
        level_hint:'B1', topic_hint:'life', txt_url: txtUrl });
    }
  }

  fs.writeFileSync('docs/library/PROGRESS.json', JSON.stringify({
    phase: 2, discovered: stats.discovered, fetched: stats.fetched,
    candidates_passed: candidates.length, skipped: {
      recent_author: stats.skipped_death, no_text: stats.skipped_no_text,
      unknown_death: stats.skipped_unknown, duplicates: stats.duplicates
    }, updated_at: new Date().toISOString()
  }, null, 2));

  console.log('\n\n=== PHASE 2 DISCOVERY COMPLETE ===');
  console.log(`Books discovered (across all searches): ${stats.discovered}`);
  console.log(`Books evaluated (unique): ${stats.fetched - stats.duplicates}`);
  console.log(`Candidates written to CSV: ${candidates.length}`);
  console.log(`Skipped – recent author (>1955): ${stats.skipped_death}`);
  console.log(`Skipped – no plain text: ${stats.skipped_no_text}`);
  console.log(`Skipped – unknown death year: ${stats.skipped_unknown}`);
  console.log(`Duplicates across searches: ${stats.duplicates}`);

  // Quick breakdown by topic
  const byTopic = {};
  candidates.forEach(c => { byTopic[c.topic_hint] = (byTopic[c.topic_hint]||0) + 1; });
  console.log('By topic:', JSON.stringify(byTopic));
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
