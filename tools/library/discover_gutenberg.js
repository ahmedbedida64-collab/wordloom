/**
 * Phase 2: Gutenberg Discovery Script
 * Uses Gutendex API (gutendex.com) — official PG JSON catalog
 * Rate limit: 1 req/2s. User-Agent set. Caches pages locally.
 * Writes: docs/library/CRAWL_LEDGER.jsonl, docs/library/candidates.csv
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = 'docs/library/cache';
const LEDGER = 'docs/library/CRAWL_LEDGER.jsonl';
const CANDIDATES_CSV = 'docs/library/candidates.csv';
const DELAY_MS = 2100; // >2s between requests

// Word limits from Gate 1 decisions
const MIN_WORDS = 2420;
const MAX_WORDS = 12100;

// Topic keyword mapping for Gutenberg bookshelves/subjects
const TOPIC_KEYWORDS = {
  life:       ['family','childhood','coming of age','personal','daily life','domestic','autobiography','memoir','love stories'],
  travel:     ['travel','adventure','exploration','journey','sea','voyage','island','wilderness'],
  science:    ['science','natural history','nature','animals','biology','geography','astronomy'],
  history:    ['history','historical','war','ancient','medieval','revolution','biography'],
  culture:    ['culture','art','music','folklore','fairy tales','fables','mythology','legend'],
  technology: ['technology','invention','industry','engineering','progress','machinery'],
  business:   ['business','commerce','economics','trade','finance','work']
};

// Level keyword hints from bookshelves (rough, will be refined by metrics in Phase 3)
const LEVEL_HINTS = {
  A1: ['children','early reader','picture book','primer','easy','beginner'],
  A2: ['children','juvenile','young','simple','fable','fairy tale'],
  B1: ['adventure','short stories','general fiction','popular'],
  B2: ['fiction','novel excerpt','classic','essay'],
  C1: ['philosophy','literary','satire','political','criticism']
};

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: { 'User-Agent': 'WordloomLibraryBuilder/1.0 (educational; contact: library-rebuild)' }
    };
    https.get(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON parse: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function appendLedger(entry) {
  fs.appendFileSync(LEDGER, JSON.stringify({ ...entry, ts: new Date().toISOString() }) + '\n');
}

function guessLevel(book) {
  const subjects = (book.subjects || []).concat(book.bookshelves || []).map(s => s.toLowerCase());
  for (const [lvl, keywords] of Object.entries(LEVEL_HINTS)) {
    if (keywords.some(k => subjects.some(s => s.includes(k)))) return lvl;
  }
  return 'B1'; // default
}

function guessTopic(book) {
  const subjects = (book.subjects || []).concat(book.bookshelves || []).map(s => s.toLowerCase());
  const title = (book.title || '').toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(k => subjects.some(s => s.includes(k)) || title.includes(k))) return topic;
  }
  return 'culture'; // fallback
}

function getAuthorDeathYear(book) {
  const agents = book.agents || book.authors || [];
  if (!agents.length) return null;
  const agent = agents[0];
  // birth_year/death_year or birth/death fields vary
  const death = agent.death_year || agent.death || null;
  if (!death) return null;
  const y = parseInt(String(death).replace(/\D/g,'').slice(0,4));
  return isNaN(y) ? null : y;
}

async function run() {
  const candidates = [];
  const stats = { discovered: 0, fetched: 0, skipped: { too_short: 0, too_long: 0, no_english_text: 0, recent_author: 0, unknown_death: 0, adaptation: 0, error: 0 } };

  // CSV header
  fs.writeFileSync(CANDIDATES_CSV,
    'id,title,author,death_year,word_count_est,pages_est,level_hint,topic_hint,licence,source_url,download_url\n'
  );

  let nextUrl = 'https://gutendex.com/books/?languages=en&mime_type=text%2Fplain&page=1';
  let pagesFetched = 0;
  const MAX_PAGES = 30; // ~600 books — enough to populate 96 slots; extend if gaps remain

  while (nextUrl && pagesFetched < MAX_PAGES) {
    const cacheFile = path.join(CACHE_DIR, `gut_page_${pagesFetched+1}.json`);
    let result;
    
    if (fs.existsSync(cacheFile)) {
      result = { status: 200, body: JSON.parse(fs.readFileSync(cacheFile, 'utf8')) };
    } else {
      await sleep(DELAY_MS);
      try {
        result = await fetchJson(nextUrl);
        if (result.status === 200) fs.writeFileSync(cacheFile, JSON.stringify(result.body));
        appendLedger({ type: 'page_fetch', url: nextUrl, status: result.status });
      } catch(e) {
        appendLedger({ type: 'page_fetch', url: nextUrl, status: 'error', reason: e.message });
        stats.skipped.error++;
        break;
      }
    }

    if (result.status !== 200) {
      appendLedger({ type: 'page_fetch', url: nextUrl, status: result.status, reason: 'non-200' });
      break;
    }

    pagesFetched++;
    const books = result.body.results || [];
    stats.discovered += books.length;
    nextUrl = result.body.next;

    for (const book of books) {
      stats.fetched++;

      // Death year check
      const deathYear = getAuthorDeathYear(book);
      if (deathYear === null) {
        stats.skipped.unknown_death++;
        appendLedger({ type: 'candidate_skip', id: book.id, reason: 'unknown_death', title: book.title });
        continue;
      }
      if (deathYear > 1955) {
        stats.skipped.recent_author++;
        appendLedger({ type: 'candidate_skip', id: book.id, reason: 'recent_author', death_year: deathYear, title: book.title });
        continue;
      }

      // Find plain text download URL
      const formats = book.formats || {};
      const txtUrl = formats['text/plain; charset=utf-8'] || formats['text/plain; charset=us-ascii'] || formats['text/plain'] || null;
      if (!txtUrl) {
        stats.skipped.no_english_text++;
        appendLedger({ type: 'candidate_skip', id: book.id, reason: 'no_plain_text', title: book.title });
        continue;
      }

      // Estimate word count from download_count (rough proxy for now; exact in Phase 3)
      // Use median: PG texts average ~65k words. We'll use media_type size if available.
      // For now we record all passing death-year check and filter precisely in Phase 3.
      // Rough filter: skip obvious novels (download_count not a proxy — skip nothing here).

      const levelHint = guessLevel(book);
      const topicHint = guessTopic(book);
      const authorName = (book.authors || book.agents || [{}])[0]?.name || 'Unknown';

      const row = [
        book.id,
        '"' + (book.title||'').replace(/"/g,'""') + '"',
        '"' + authorName.replace(/"/g,'""') + '"',
        deathYear,
        '', // word_count filled in Phase 3
        '', // pages_est filled in Phase 3
        levelHint,
        topicHint,
        'Public Domain',
        `https://www.gutenberg.org/ebooks/${book.id}`,
        txtUrl
      ].join(',');

      fs.appendFileSync(CANDIDATES_CSV, row + '\n');
      candidates.push({ id: book.id, title: book.title, author: authorName, death_year: deathYear, level_hint: levelHint, topic_hint: topicHint, txt_url: txtUrl });
    }

    process.stdout.write(`Page ${pagesFetched}/${MAX_PAGES} fetched. Running total candidates: ${candidates.length}\r`);
  }

  // Final stats
  stats.candidates_passed_filter = candidates.length;
  fs.writeFileSync('docs/library/PROGRESS.json', JSON.stringify({
    phase: 2,
    discovered: stats.discovered,
    fetched: stats.fetched,
    candidates_passed: candidates.length,
    skipped: stats.skipped,
    pages_fetched: pagesFetched,
    updated_at: new Date().toISOString()
  }, null, 2));

  console.log('\n\n=== PHASE 2 DISCOVERY STATS ===');
  console.log('Pages fetched:', pagesFetched);
  console.log('Books discovered:', stats.discovered);
  console.log('Books evaluated:', stats.fetched);
  console.log('Candidates written to CSV:', candidates.length);
  console.log('Skipped (unknown death year):', stats.skipped.unknown_death);
  console.log('Skipped (recent author >1955):', stats.skipped.recent_author);
  console.log('Skipped (no plain text):', stats.skipped.no_english_text);
  console.log('Skipped (error):', stats.skipped.error);
  console.log('Coverage: discovered =', stats.discovered, '| fetched+skipped =', stats.fetched);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
