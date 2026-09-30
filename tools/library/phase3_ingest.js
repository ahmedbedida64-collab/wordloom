/**
 * PHASE 3: INGEST, INTEGRITY, LEVELS, TOPICS
 * Produces complete book JSON records in /docs/library/books_staging/
 * All texts from Project Gutenberg (public domain, author death <= 1955)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { computeMetrics } = require('./compute_metrics.js');

const CACHE  = 'docs/library/cache';
const OUT    = 'docs/library/books_staging';
const PROV   = 'docs/library/provenance.json';
const LEDGER = 'docs/library/CRAWL_LEDGER.jsonl';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function log(e) { fs.appendFileSync(LEDGER, JSON.stringify({...e, ts: new Date().toISOString()})+'\n'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function fetchText(url) {
  return new Promise((resolve,reject)=>{
    const opts = { headers:{ 'User-Agent':'WordloomLibraryBuilder/1.0 (educational)' } };
    https.get(url, opts, res=>{
      if([301,302].includes(res.statusCode))
        return fetchText(res.headers.location).then(resolve).catch(reject);
      if(res.statusCode!==200){ reject(new Error('HTTP '+res.statusCode)); return; }
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error',reject);
  });
}

async function getOrFetch(url, cacheKey) {
  const f = path.join(CACHE, cacheKey+'.txt');
  if(fs.existsSync(f)) return fs.readFileSync(f,'utf8');
  await sleep(2200);
  const text = await fetchText(url);
  fs.writeFileSync(f, text);
  log({type:'download', url, cache:cacheKey});
  return text;
}

function stripBoilerplate(text) {
  const startRe = /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  const endRe   = /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  let s=0, e=text.length;
  const sm = startRe.exec(text);
  if(sm){ s = text.indexOf('\n', sm.index)+1; }
  const em = endRe.exec(text);
  if(em){ e = em.index; }
  return text.slice(s,e).trim();
}

function chunkIntoChapters(text, targetWords=121) {
  // Clean single newlines within paragraphs, keep double-newline boundaries
  const normalized = text.replace(/\r\n/g,'\n').replace(/([^\n])\n(?!\n)/g,'$1 ').trim();
  const paragraphs = normalized.split(/\n{2,}/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>10);
  const chapters=[];
  let cur=[], curWords=0;
  for(const p of paragraphs){
    const pw = p.split(/\s+/).length;
    if(curWords+pw > targetWords*1.5 && cur.length>0){
      chapters.push({ title:'', subtitle:'', paragraphs:[...cur] });
      cur=[]; curWords=0;
    }
    cur.push(p); curWords+=pw;
  }
  if(cur.length>0) chapters.push({ title:'', subtitle:'', paragraphs:[...cur] });
  return chapters;
}

// Extract a slice of a compilation that hits 2420-12100 words
function sliceCompilation(stories, minWords=2420, maxWords=12100) {
  let selected=[], total=0;
  for(const s of stories){
    const w = s.text.split(/\s+/).length;
    if(total+w > maxWords) break;
    selected.push(s); total+=w;
    if(total>=minWords && selected.length>=20) break;
  }
  return { selected, total };
}

function buildRecord(opts) {
  const { title, author, level, topic, description, pgId, clean, chapters, kind='story' } = opts;
  const { word_count, level_measured, flesch_kincaid_grade, avg_sentence_length } = computeMetrics(clean);
  const pageCount = chapters.length;
  const lengthLabel = word_count < 5000 ? 'Short' : word_count < 9000 ? 'Medium' : 'Long';
  return {
    book: {
      title, author, level, topic,
      cover: 'cover-amber',
      progress: 0,
      source: `Project Gutenberg #${pgId}`,
      length: `${lengthLabel} · ${word_count.toLocaleString()} words`,
      kind,
      description,
      photo: '',   // filled in Phase 4
      chapters
    },
    meta: { word_count, page_count: pageCount, level_measured, flesch_kincaid_grade, avg_sentence_length, pgId }
  };
}

function saveBook(slug, record) {
  fs.writeFileSync(path.join(OUT, slug+'.json'), JSON.stringify(record, null, 2));
}

// ─── BOOK DEFINITIONS ────────────────────────────────────────────────────────
// Each entry: pgId, url, level, topic, kind, description
// For compilations: type:'compilation', stories:[{title,text}]

const TARGETS = [

  // ── INDIVIDUAL SHORT WORKS (confirmed or likely in range) ──────────────────

  { slug:'yellow_wallpaper', pgId:1952, level:'B2', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/1952/1952-0.txt',
    title:'The Yellow Wallpaper', author:'Charlotte Perkins Gilman',
    description:'A woman confined to a room slowly loses her mind — a landmark feminist story.' },

  { slug:'secret_sharer', pgId:23362, level:'B2', topic:'travel', kind:'story',
    url:'https://www.gutenberg.org/files/23362/23362-0.txt',
    title:'The Secret Sharer', author:'Joseph Conrad',
    description:'A sea captain harbours a mysterious fugitive and questions his own identity.' },

  { slug:'bartleby', pgId:11231, level:'B2', topic:'business', kind:'story',
    url:'https://www.gutenberg.org/files/11231/11231-0.txt',
    title:'Bartleby, the Scrivener', author:'Herman Melville',
    description:'A Wall Street lawyer is baffled by a clerk who simply prefers not to.' },

  { slug:'the_awakening', pgId:160, level:'B2', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/160/160-0.txt',
    title:'The Awakening', author:'Kate Chopin',
    description:'A married woman in 1890s New Orleans awakens to her own desires and freedom.' },

  { slug:'turn_of_screw', pgId:2060, level:'C1', topic:'culture', kind:'story',
    url:'https://www.gutenberg.org/files/2060/2060-0.txt',
    title:'The Turn of the Screw', author:'Henry James',
    description:'A governess becomes convinced that two children are haunted by malevolent ghosts.' },

  { slug:'ethan_frome', pgId:4517, level:'B2', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/4517/4517-0.txt',
    title:'Ethan Frome', author:'Edith Wharton',
    description:'A farmer in a bleak New England winter is trapped between duty and forbidden love.' },

  { slug:'daisy_miller', pgId:40, level:'B2', topic:'travel', kind:'story',
    url:'https://www.gutenberg.org/files/40/40-0.txt',
    title:'Daisy Miller', author:'Henry James',
    description:'An innocent American girl charms and scandalises European society in Rome.' },

  { slug:'man_would_be_king', pgId:8164, level:'B2', topic:'travel', kind:'story',
    url:'https://www.gutenberg.org/files/8164/8164-0.txt',
    title:'The Man Who Would Be King', author:'Rudyard Kipling',
    description:'Two adventurers set out to rule a remote kingdom deep in Afghanistan.' },

  // ── COMPILATIONS (Gate 1 approved) ────────────────────────────────────────

  { slug:'aesop_fables', pgId:21, level:'A1', topic:'culture', kind:'fable',
    url:'https://www.gutenberg.org/files/21/21-0.txt',
    type:'split_by_blank_title',
    title:"Aesop's Fables", author:'Aesop (transl. George F. Townsend)',
    description:'Timeless moral tales featuring animals and human characters in simple, vivid language.' },

  { slug:'grimm_tales', pgId:2591, level:'A2', topic:'culture', kind:'fairy tale',
    url:'https://www.gutenberg.org/files/2591/2591-0.txt',
    type:'split_by_blank_title',
    title:"Grimm's Selected Fairy Tales", author:'Brothers Grimm (transl. Margaret Hunt)',
    description:'Beloved European fairy tales of magic, courage, and transformation.' },

  { slug:'poe_stories', pgId:2148, level:'B2', topic:'culture', kind:'story',
    url:'https://www.gutenberg.org/files/2148/2148-0.txt',
    type:'split_by_blank_title',
    title:'Selected Stories by Edgar Allan Poe', author:'Edgar Allan Poe',
    description:'Masterpieces of gothic horror and mystery that invented the short story form.' },

  { slug:'ohenry_stories', pgId:2776, level:'B1', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/2776/2776-0.txt',
    type:'split_by_blank_title',
    title:'Selected Stories by O. Henry', author:'O. Henry',
    description:'Witty, warm tales of everyday New York life with unexpected twist endings.' },

  { slug:'chekhov_stories', pgId:1695, level:'B1', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/1695/1695-0.txt',
    type:'split_by_blank_title',
    title:'Selected Stories by Anton Chekhov', author:'Anton Chekhov',
    description:'Quiet, precise portraits of Russian daily life that shaped modern short fiction.' },

  { slug:'maupassant_stories', pgId:3090, level:'B1', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/3090/3090-0.txt',
    type:'split_by_blank_title',
    title:'Selected Stories by Guy de Maupassant', author:'Guy de Maupassant',
    description:'Sharp, ironic tales of French society, ambition, and human weakness.' },

  { slug:'kipling_plain_tales', pgId:1974, level:'B1', topic:'travel', kind:'story',
    url:'https://www.gutenberg.org/files/1974/1974-0.txt',
    type:'split_by_blank_title',
    title:'Plain Tales from the Hills', author:'Rudyard Kipling',
    description:'Vivid short stories of colonial India, soldiers, and unexpected encounters.' },

  { slug:'twain_sketches', pgId:3173, level:'A2', topic:'life', kind:'story',
    url:'https://www.gutenberg.org/files/3173/3173-0.txt',
    type:'split_by_blank_title',
    title:'Selected Sketches by Mark Twain', author:'Mark Twain',
    description:'Humorous short pieces capturing the absurdities of American frontier life.' },

];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const provenance = [];
  const results = { passed:[], failed:[] };

  for(const target of TARGETS){
    process.stdout.write(`\n[FETCH] ${target.title}...`);
    let raw;
    try {
      raw = await getOrFetch(target.url, `text_${target.pgId}`);
    } catch(e){
      console.log(` ERROR: ${e.message}`);
      results.failed.push({ slug:target.slug, reason:'fetch_error:'+e.message });
      log({type:'ingest_fail', slug:target.slug, reason:e.message});
      continue;
    }

    const clean = stripBoilerplate(raw);
    const cleanWords = clean.split(/\s+/).filter(w=>w).length;
    console.log(` ${cleanWords} words`);

    // For compilations, split into stories, slice to range
    let finalText = clean;
    let chapterOverride = null;

    if(target.type === 'split_by_blank_title'){
      // Split by lines that look like all-caps story titles or blank-line+title patterns
      const storyBlocks = clean.split(/\n{3,}/).map(b=>b.trim()).filter(b=>b.length>50);
      // Group into "stories" by taking blocks that start with a short all-caps/title-case line
      const stories = [];
      let curTitle='', curParts=[];
      for(const block of storyBlocks){
        const firstLine = block.split('\n')[0].trim();
        const looksLikeTitle = firstLine.length<80 && firstLine.length>3 &&
          (firstLine === firstLine.toUpperCase() || /^[A-Z][A-Za-z\s,.'"-]+$/.test(firstLine));
        if(looksLikeTitle && curParts.length>0){
          stories.push({ title:curTitle, text:curParts.join('\n\n') });
          curTitle=firstLine; curParts=[];
        } else {
          if(!curTitle) curTitle=firstLine;
          curParts.push(block);
        }
      }
      if(curParts.length>0) stories.push({ title:curTitle, text:curParts.join('\n\n') });

      // Slice to hit 2420-12100 words
      const { selected, total } = sliceCompilation(stories);
      if(selected.length<5){
        console.log(`  SKIP: only ${selected.length} stories extracted (${total} words)`);
        results.failed.push({ slug:target.slug, reason:`too_few_stories:${selected.length}` });
        continue;
      }
      finalText = selected.map(s=>s.title+'\n\n'+s.text).join('\n\n\n');
      // Each story becomes chapters
      chapterOverride = [];
      for(const story of selected){
        const storyChapters = chunkIntoChapters(story.text, 121);
        storyChapters[0].title = story.title;
        chapterOverride.push(...storyChapters);
      }
    }

    const finalWords = finalText.split(/\s+/).filter(w=>w).length;

    if(finalWords < 2420){
      console.log(`  SKIP TOO_SHORT: ${finalWords} words`);
      results.failed.push({ slug:target.slug, reason:`too_short:${finalWords}` });
      log({type:'ingest_skip', slug:target.slug, reason:'too_short', words:finalWords});
      continue;
    }
    if(finalWords > 12100 && !chapterOverride){
      console.log(`  SKIP TOO_LONG: ${finalWords} words`);
      results.failed.push({ slug:target.slug, reason:`too_long:${finalWords}` });
      log({type:'ingest_skip', slug:target.slug, reason:'too_long', words:finalWords});
      continue;
    }

    // Chunk into chapters
    const chapters = chapterOverride || chunkIntoChapters(finalText, 121);
    if(chapters.length < 20){
      console.log(`  SKIP FEW_PAGES: ${chapters.length} pages (need 20-100)`);
      results.failed.push({ slug:target.slug, reason:`too_few_pages:${chapters.length}` });
      continue;
    }
    // Trim to 100 if over
    const trimmed = chapters.slice(0,100);

    const record = buildRecord({
      title:target.title, author:target.author,
      level:target.level, topic:target.topic,
      description:target.description, pgId:target.pgId,
      clean:finalText, chapters:trimmed, kind:target.kind
    });

    // Integrity checks
    const errs=[];
    if(trimmed.length<20||trimmed.length>100) errs.push(`PAGE_COUNT_OOB:${trimmed.length}`);
    if(record.meta.word_count<2420||record.meta.word_count>12100) errs.push(`WORD_OOB:${record.meta.word_count}`);
    const lastPara = (trimmed.slice(-1)[0]?.paragraphs||[]).slice(-1)[0]||'';
    if(/\.\.\.|continued\]/.test(lastPara)) errs.push('TRUNCATION');

    if(errs.length>0){
      console.log(`  INTEGRITY FAIL: ${errs.join(', ')}`);
      results.failed.push({ slug:target.slug, reason:errs.join(',') });
    } else {
      saveBook(target.slug, record);
      results.passed.push({ slug:target.slug, title:target.title,
        words:record.meta.word_count, pages:trimmed.length,
        level:target.level, level_measured:record.meta.level_measured,
        topic:target.topic, fk:record.meta.flesch_kincaid_grade });
      provenance.push({ slug:target.slug, pgId:target.pgId, title:target.title,
        author:target.author, source_url:`https://www.gutenberg.org/ebooks/${target.pgId}`,
        download_url:target.url, retrieved_at:new Date().toISOString(),
        licence:'Public Domain (Project Gutenberg)',
        word_count:record.meta.word_count, pages:trimmed.length });
      console.log(`  PASS: ${trimmed.length} pages, ${record.meta.word_count} words, level_measured=${record.meta.level_measured}`);
    }
  }

  fs.writeFileSync(PROV, JSON.stringify(provenance, null, 2));

  console.log('\n\n═══════════════════════════════════════');
  console.log('PHASE 3 INGEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Books total:  ${TARGETS.length}`);
  console.log(`PASSED:       ${results.passed.length}`);
  console.log(`FAILED/SKIP:  ${results.failed.length}`);
  console.log('\nPASSED books:');
  results.passed.forEach(b=>
    console.log(`  ✅ ${b.slug.padEnd(25)} pages=${b.pages} words=${b.words} level=${b.level}(${b.level_measured}) topic=${b.topic} FK=${b.fk}`)
  );
  console.log('\nFAILED/SKIPPED:');
  results.failed.forEach(b=>console.log(`  ❌ ${b.slug.padEnd(25)} ${b.reason}`));

  // Coverage table
  console.log('\nCOVERAGE (level × topic):');
  const cells={};
  results.passed.forEach(b=>{ const k=`${b.level}-${b.topic}`; cells[k]=(cells[k]||0)+1; });
  Object.entries(cells).sort().forEach(([k,v])=>console.log(`  ${k}: ${v}`));
}

main().catch(e=>{ console.error('FATAL:',e); process.exit(1); });
