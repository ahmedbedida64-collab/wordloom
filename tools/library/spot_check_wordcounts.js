const https = require('https');
const fs = require('fs');

// Key candidates to spot-check word counts on
const SPOT_CHECK = [
  { id: 19994, title: "Aesop's Fables", url: 'https://www.gutenberg.org/files/19994/19994-0.txt' },
  { id: 11,    title: "Alice in Wonderland", url: 'https://www.gutenberg.org/files/11/11-0.txt' },
  { id: 46,    title: "A Christmas Carol", url: 'https://www.gutenberg.org/files/46/46-0.txt' },
  { id: 43,    title: "Dr Jekyll and Mr Hyde", url: 'https://www.gutenberg.org/files/43/43-0.txt' },
  { id: 35,    title: "The Time Machine", url: 'https://www.gutenberg.org/files/35/35-0.txt' },
  { id: 1952,  title: "The Yellow Wallpaper", url: 'https://www.gutenberg.org/files/1952/1952-0.txt' },
  { id: 5200,  title: "The Metamorphosis", url: 'https://www.gutenberg.org/files/5200/5200-0.txt' },
  { id: 244,   title: "A Study in Scarlet", url: 'https://www.gutenberg.org/files/244/244-0.txt' },
];

const CACHE = 'docs/library/cache';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'WordloomLibraryBuilder/1.0' } }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stripBoilerplate(text) {
  // Remove Gutenberg header/footer
  const startMarkers = ['*** START OF THE PROJECT GUTENBERG', '*** START OF THIS PROJECT GUTENBERG', '*END*THE SMALL PRINT'];
  const endMarkers   = ['*** END OF THE PROJECT GUTENBERG', '*** END OF THIS PROJECT GUTENBERG', 'End of Project Gutenberg'];
  let start = 0, end = text.length;
  for (const m of startMarkers) {
    const idx = text.indexOf(m);
    if (idx !== -1) { start = text.indexOf('\n', idx) + 1; break; }
  }
  for (const m of endMarkers) {
    const idx = text.lastIndexOf(m);
    if (idx !== -1) { end = idx; break; }
  }
  return text.slice(start, end).trim();
}

async function run() {
  console.log('id | title | raw_words | clean_words | pages_est | in_range');
  console.log('---|-------|-----------|-------------|-----------|--------');
  for (const book of SPOT_CHECK) {
    const cacheFile = `${CACHE}/text_${book.id}.txt`;
    let raw;
    if (fs.existsSync(cacheFile)) {
      raw = fs.readFileSync(cacheFile, 'utf8');
    } else {
      await sleep(2100);
      try { raw = await fetchText(book.url); fs.writeFileSync(cacheFile, raw); }
      catch(e) { console.log(`${book.id} | ${book.title} | ERROR: ${e.message}`); continue; }
    }
    const clean = stripBoilerplate(raw);
    const rawWords = raw.split(/\s+/).filter(w=>w).length;
    const cleanWords = clean.split(/\s+/).filter(w=>w).length;
    const pagesEst = Math.round(cleanWords / 121);
    const inRange = cleanWords >= 2420 && cleanWords <= 12100 ? 'YES' : (cleanWords < 2420 ? 'TOO_SHORT' : 'TOO_LONG');
    console.log(`${book.id} | ${book.title.slice(0,30).padEnd(30)} | ${rawWords} | ${cleanWords} | ${pagesEst} | ${inRange}`);
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
