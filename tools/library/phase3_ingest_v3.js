/**
 * PHASE 3 INGEST v3 — Key fixes:
 *  1. sliceToRange: no early stop at minW (collect up to maxW)
 *  2. Aesop: filter items > 500 words (preface/intro masquerading as fables)
 *  3. Page-count check uses chapters.length (after chunking), not sel.length
 *  4. Fixed/alternative PG URLs for 404s
 */
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { computeMetrics } = require('./compute_metrics.js');

const CACHE  = 'docs/library/cache';
const OUT    = 'docs/library/books_staging';
const PROV   = 'docs/library/provenance.json';
const LEDGER = 'docs/library/CRAWL_LEDGER.jsonl';
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});

function log(e){fs.appendFileSync(LEDGER,JSON.stringify({...e,ts:new Date().toISOString()})+'\n');}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function fetchText(url){
  return new Promise((resolve,reject)=>{
    https.get(url,{headers:{'User-Agent':'WordloomLibraryBuilder/1.0 (educational)'}},res=>{
      if([301,302].includes(res.statusCode)) return fetchText(res.headers.location).then(resolve).catch(reject);
      if(res.statusCode!==200){reject(new Error('HTTP '+res.statusCode));return;}
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error',reject);
  });
}

async function getOrFetch(url, key){
  const f=path.join(CACHE,key+'.txt');
  if(fs.existsSync(f)) return fs.readFileSync(f,'utf8');
  await sleep(2200);
  const text=await fetchText(url);
  fs.writeFileSync(f,text); log({type:'download',url,key});
  return text;
}

// Try a primary then fallback URL
async function fetchWithFallback(primary, fallback, key){
  const f=path.join(CACHE,key+'.txt');
  if(fs.existsSync(f)) return fs.readFileSync(f,'utf8');
  for(const url of [primary,fallback].filter(Boolean)){
    try{
      await sleep(2200);
      const text=await fetchText(url);
      fs.writeFileSync(f,text); log({type:'download',url,key});
      return text;
    }catch(e){ log({type:'fetch_fail',url,err:e.message}); }
  }
  throw new Error('all_urls_failed');
}

function stripBoilerplate(raw){
  const text=raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const sm=text.match(/\*\*\* START OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i);
  const em=text.match(/\*\*\* END OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i);
  const s=sm ? text.indexOf('\n',sm.index)+1 : 0;
  const e=em ? text.lastIndexOf('\n',em.index) : text.length;
  return text.slice(s,e).trim();
}

function chunkIntoChapters(text, target=121){
  const norm=text.replace(/([^\n])\n(?!\n)/g,'$1 ').trim();
  const paras=norm.split(/\n{2,}/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>10);
  const chs=[]; let cur=[],cw=0;
  for(const p of paras){
    const pw=p.split(/\s+/).length;
    if(cw+pw>target*1.6&&cur.length>0){chs.push({title:'',subtitle:'',paragraphs:[...cur]});cur=[];cw=0;}
    cur.push(p); cw+=pw;
  }
  if(cur.length>0) chs.push({title:'',subtitle:'',paragraphs:[...cur]});
  return chs;
}

// ── KEY FIX 1: no early stop at minW ────────────────────────────────────────
function sliceToRange(stories, maxW=12100, maxItemWords=Infinity){
  let sel=[],total=0;
  for(const s of stories){
    const w=s.text.split(/\s+/).filter(Boolean).length;
    if(w>maxItemWords) continue;   // skip oversized items (e.g. intros)
    if(total+w>maxW) break;        // stop before exceeding ceiling
    sel.push(s); total+=w;
    // NO early stop at minW — collect as many as fit
  }
  return {sel,total};
}

// ── Aesop splitter: title-case standalone lines between blank lines ───────
function splitAesopFables(clean){
  const lines=clean.split('\n');
  const fables=[]; let title='', body=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i].trim();
    const prev=(lines[i-1]||'').trim(), next=(lines[i+1]||'').trim();
    const isTitle=l.length>=5&&l.length<=80&&prev===''&&next===''&&
      !l.match(/^(PREFACE|LIFE OF|CONTENTS|INTRODUCTION|PART|CHAPTER|TABLE)/i)&&
      (/^[A-Z]/.test(l)||l===l.toUpperCase());
    if(isTitle){
      if(title&&body.join('').trim().split(/\s+/).length>20)
        fables.push({title,text:body.join('\n').trim()});
      title=l; body=[];
    } else { body.push(lines[i]); }
  }
  if(title&&body.join('').trim().split(/\s+/).length>20)
    fables.push({title,text:body.join('\n').trim()});
  return fables;
}

// ── Generic title-based splitter ─────────────────────────────────────────
function splitByTitles(clean){
  const lines=clean.split('\n');
  const stories=[]; let title='', body=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i].trim();
    const prev=(lines[i-1]||'').trim(), next=(lines[i+1]||'').trim();
    const isTitle=l.length>=4&&l.length<=90&&prev===''&&next===''&&
      !l.match(/^(THE END|CONTENTS|PREFACE|INTRODUCTION|CHAPTER|PART|BOOK\b|END OF|FOOTNOTE|APPENDIX|GLOSSARY)/i)&&
      (/^[A-Z\d]/.test(l));
    if(isTitle){
      if(title&&body.join('').trim().split(/\s+/).length>80)
        stories.push({title,text:body.join('\n').trim()});
      title=l; body=[];
    } else { body.push(lines[i]); }
  }
  if(title&&body.join('').trim().split(/\s+/).length>80)
    stories.push({title,text:body.join('\n').trim()});
  return stories;
}

function buildRecord(opts){
  const {title,author,level,topic,description,pgId,clean,chapters,kind='story'}=opts;
  const {word_count,level_measured,flesch_kincaid_grade,avg_sentence_length}=computeMetrics(clean);
  const lbl=word_count<5000?'Short':word_count<9000?'Medium':'Long';
  return {
    book:{title,author,level,topic,cover:'cover-amber',progress:0,
      source:`Project Gutenberg #${pgId}`,
      length:`${lbl} · ${word_count.toLocaleString()} words`,
      kind,description,photo:'',chapters},
    meta:{word_count,page_count:chapters.length,level_measured,flesch_kincaid_grade,pgId}
  };
}

function saveBook(slug,record){
  fs.writeFileSync(path.join(OUT,slug+'.json'),JSON.stringify(record,null,2));
}

// ─── TARGETS ─────────────────────────────────────────────────────────────────
const TARGETS=[
  // ── Individual short works ─────────────────────────────────────────────
  {slug:'yellow_wallpaper',pgId:1952,level:'B2',topic:'life',kind:'story',
   primary:'https://www.gutenberg.org/files/1952/1952-0.txt',
   title:'The Yellow Wallpaper',author:'Charlotte Perkins Gilman',
   description:'A woman confined to a room slowly loses her mind — a landmark feminist story.'},

  {slug:'secret_sharer',pgId:23362,level:'B2',topic:'travel',kind:'story',
   primary:'https://www.gutenberg.org/files/23362/23362-0.txt',
   title:'The Secret Sharer',author:'Joseph Conrad',
   description:'A sea captain harbours a mysterious fugitive and confronts his own identity.'},

  {slug:'canterville_ghost',pgId:14522,level:'B1',topic:'culture',kind:'story',
   primary:'https://www.gutenberg.org/files/14522/14522-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/14522/pg14522.txt',
   title:'The Canterville Ghost',author:'Oscar Wilde',
   description:'An American family moves into a haunted English manor and refuses to be frightened.'},

  {slug:'beast_in_jungle',pgId:1093,level:'C1',topic:'life',kind:'story',
   primary:'https://www.gutenberg.org/files/1093/1093.txt',
   fallback:'https://www.gutenberg.org/cache/epub/1093/pg1093.txt',
   title:'The Beast in the Jungle',author:'Henry James',
   description:'A man spends his entire life waiting for a singular fate — too late to grasp what he missed.'},

  {slug:'great_god_pan',pgId:389,level:'C1',topic:'culture',kind:'story',
   primary:'https://www.gutenberg.org/files/389/389-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/389/pg389.txt',
   title:'The Great God Pan',author:'Arthur Machen',
   description:'A disturbing gothic horror story about forbidden science and supernatural terror.'},

  {slug:'time_machine',pgId:35,level:'B2',topic:'science',kind:'story',
   primary:'https://www.gutenberg.org/files/35/35-0.txt',
   // Too long ~32k but we'll check and skip gracefully
   title:'The Time Machine',author:'H. G. Wells',
   description:'An inventor travels to the far future and discovers the shocking fate of humanity.'},

  {slug:'war_worlds_short',pgId:36,level:'B2',topic:'science',kind:'story',
   primary:'https://www.gutenberg.org/files/36/36-0.txt',
   title:'The War of the Worlds',author:'H. G. Wells',
   description:'Martians invade Earth with devastating tripod war-machines in this gripping classic.'},

  {slug:'invisible_man',pgId:5230,level:'B2',topic:'science',kind:'story',
   primary:'https://www.gutenberg.org/files/5230/5230-8.txt',
   fallback:'https://www.gutenberg.org/cache/epub/5230/pg5230.txt',
   title:'The Invisible Man',author:'H. G. Wells',
   description:'A scientist discovers how to become invisible — only to find it is a curse, not a gift.'},

  // ── Compilations (fixed sliceToRange) ─────────────────────────────────
  {slug:'aesop_fables',pgId:21,level:'A1',topic:'culture',kind:'fable',
   type:'aesop',
   primary:'https://www.gutenberg.org/files/21/21-0.txt',
   title:"Aesop's Fables",author:'Aesop (transl. George F. Townsend)',
   description:'Timeless moral tales about animals and human nature, perfect for beginners.'},

  {slug:'grimm_tales',pgId:2591,level:'A2',topic:'culture',kind:'fairy tale',
   type:'titles',
   primary:'https://www.gutenberg.org/files/2591/2591-0.txt',
   title:"Grimm's Selected Fairy Tales",author:'Brothers Grimm (transl. Margaret Hunt)',
   description:'Beloved European fairy tales of magic, courage, and transformation.'},

  {slug:'wilde_fairy_tales',pgId:902,level:'A2',topic:'culture',kind:'fairy tale',
   type:'titles',
   primary:'https://www.gutenberg.org/files/902/902-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/902/pg902.txt',
   title:"Selected Fairy Tales by Oscar Wilde",author:'Oscar Wilde',
   description:'Elegant, compassionate fairy tales rich with moral beauty and lyrical prose.'},

  {slug:'poe_stories',pgId:2148,level:'B2',topic:'culture',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/2148/2148-0.txt',
   title:'Selected Stories by Edgar Allan Poe',author:'Edgar Allan Poe',
   description:'Gothic horror and mystery masterpieces that invented the modern short story.'},

  {slug:'ohenry_million',pgId:2776,level:'B1',topic:'life',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/2776/2776-0.txt',
   title:'The Four Million — Selected Stories',author:'O. Henry',
   description:'Warm, witty tales of everyday New York life with unexpected twists.'},

  {slug:'chekhov_stories',pgId:1695,level:'B1',topic:'life',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/1695/1695-0.txt',
   title:'Selected Stories by Anton Chekhov',author:'Anton Chekhov',
   description:'Quiet, precise portraits of daily life that shaped modern short fiction.'},

  {slug:'maupassant_stories',pgId:3090,level:'B1',topic:'life',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/3090/3090-0.txt',
   title:'Selected Stories by Guy de Maupassant',author:'Guy de Maupassant',
   description:'Sharp, ironic tales of French society, ambition, and human weakness.'},

  {slug:'kipling_stories',pgId:1081,level:'B1',topic:'travel',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/1081/1081-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/1081/pg1081.txt',
   title:'Plain Tales from the Hills',author:'Rudyard Kipling',
   description:'Vivid short stories of colonial India, soldiers, and unexpected encounters.'},

  {slug:'london_tales',pgId:1162,level:'B1',topic:'travel',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/1162/1162-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/1162/pg1162.txt',
   title:'South Sea Tales',author:'Jack London',
   description:'Gripping adventure stories set among the islands and storms of the Pacific.'},

  {slug:'irving_tales',pgId:2048,level:'B2',topic:'history',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/2048/2048-0.txt',
   title:'Tales from the Sketch Book',author:'Washington Irving',
   description:'Classic American tales of legend, folklore, and the spirit of the young nation.'},

  {slug:'twain_humor',pgId:3173,level:'A2',topic:'life',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/3173/3173-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/3173/pg3173.txt',
   title:'Sketches New and Old',author:'Mark Twain',
   description:'Humorous short pieces capturing the wit and absurdity of American frontier life.'},

  {slug:'saki_stories',pgId:269,level:'B2',topic:'culture',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/269/269-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/269/pg269.txt',
   title:'Selected Stories by Saki',author:'H. H. Munro (Saki)',
   description:'Wickedly funny and darkly sardonic tales of Edwardian English society.'},

  {slug:'hardy_stories',pgId:2833,level:'B2',topic:'life',kind:'story',
   type:'titles',
   primary:'https://www.gutenberg.org/files/2833/2833-0.txt',
   fallback:'https://www.gutenberg.org/cache/epub/2833/pg2833.txt',
   title:"Wessex Tales",author:'Thomas Hardy',
   description:'Powerful stories of rural English life, fate, and the forces that shape ordinary people.'},
];

// ─── PROCESS ──────────────────────────────────────────────────────────────
async function processTarget(t){
  let raw;
  try{
    raw=await fetchWithFallback(t.primary, t.fallback, `text_${t.pgId}`);
  }catch(e){return{status:'fail',reason:'fetch:'+e.message};}

  const clean=stripBoilerplate(raw);
  const totalWords=clean.split(/\s+/).filter(Boolean).length;
  console.log(` [${totalWords}w]`);

  let finalText=clean, chapters=null;

  if(t.type==='aesop'){
    const fables=splitAesopFables(clean);
    console.log(`   Aesop: ${fables.length} fables found`);
    if(fables.length<10) return{status:'fail',reason:`too_few_fables:${fables.length}`};
    // KEY FIX: maxItemWords=500 filters PREFACE/LIFE sections; no early stop
    const {sel,total}=sliceToRange(fables,12100,500);
    console.log(`   Selected: ${sel.length} fables, ${total} words`);
    if(total<2420) return{status:'fail',reason:`slice_low:${sel.length}/${total}`};
    finalText=sel.map(f=>f.title+'\n\n'+f.text).join('\n\n\n');
    chapters=[];
    for(const f of sel){const c=chunkIntoChapters(f.text,121);if(c.length>0){c[0].title=f.title;chapters.push(...c);}}

  } else if(t.type==='titles'){
    const stories=splitByTitles(clean);
    console.log(`   Stories: ${stories.length} found`);
    if(stories.length<3) return{status:'fail',reason:`too_few:${stories.length}`};
    // KEY FIX: collect all stories up to maxW, no early stop
    const {sel,total}=sliceToRange(stories,12100);
    console.log(`   Selected: ${sel.length} stories, ${total} words`);
    if(total<2420) return{status:'fail',reason:`slice_low:${sel.length}/${total}`};
    finalText=sel.map(s=>s.title+'\n\n'+s.text).join('\n\n\n');
    chapters=[];
    for(const s of sel){const c=chunkIntoChapters(s.text,121);if(c.length>0){c[0].title=s.title;chapters.push(...c);}}

  } else {
    // Individual work — check range
    if(totalWords<2420) return{status:'fail',reason:`too_short:${totalWords}`};
    if(totalWords>12100) return{status:'fail',reason:`too_long:${totalWords}`};
  }

  const finalWords=finalText.split(/\s+/).filter(Boolean).length;
  if(!chapters) chapters=chunkIntoChapters(finalText,121);

  // KEY FIX 3: page check on chapters.length, not story count
  const trimmed=chapters.slice(0,100);
  if(trimmed.length<20) return{status:'fail',reason:`few_pages:${trimmed.length}`};

  const record=buildRecord({title:t.title,author:t.author,level:t.level,topic:t.topic,
    description:t.description,pgId:t.pgId,clean:finalText,chapters:trimmed,kind:t.kind});

  const errs=[];
  if(record.meta.word_count<2420||record.meta.word_count>12100) errs.push(`WORD_OOB:${record.meta.word_count}`);
  if(errs.length>0) return{status:'fail',reason:errs.join(',')};

  saveBook(t.slug,record);
  return{status:'pass',pages:trimmed.length,words:record.meta.word_count,
    level_measured:record.meta.level_measured,fk:record.meta.flesch_kincaid_grade};
}

async function main(){
  const provenance=[]; const passed=[],failed=[];
  for(const t of TARGETS){
    process.stdout.write(`\n[${t.slug}]...`);
    const r=await processTarget(t);
    if(r.status==='pass'){
      passed.push({...r,slug:t.slug,title:t.title,level:t.level,topic:t.topic});
      provenance.push({slug:t.slug,pgId:t.pgId,title:t.title,author:t.author,
        source_url:`https://www.gutenberg.org/ebooks/${t.pgId}`,
        download_url:t.primary,retrieved_at:new Date().toISOString(),
        licence:'Public Domain (Project Gutenberg)',word_count:r.words,pages:r.pages});
      console.log(` PASS pages=${r.pages} words=${r.words} lvl=${t.level}(${r.level_measured}) FK=${r.fk}`);
    }else{
      failed.push({slug:t.slug,title:t.title,reason:r.reason});
      console.log(` SKIP: ${r.reason}`);
      log({type:'ingest_skip',slug:t.slug,reason:r.reason});
    }
  }
  fs.writeFileSync(PROV,JSON.stringify(provenance,null,2));

  console.log('\n\n═══════════════════════════════════════');
  console.log(`PHASE 3 v3 | Total:${TARGETS.length} | PASS:${passed.length} | SKIP:${failed.length}`);
  console.log('\nPASSED:');
  passed.forEach(b=>console.log(`  ✅ ${b.slug.padEnd(25)} pg=${b.pages} w=${b.words} lvl=${b.level}(${b.level_measured}) t=${b.topic} FK=${b.fk}`));
  console.log('\nSKIPPED:');
  failed.forEach(b=>console.log(`  ❌ ${b.slug.padEnd(25)} ${b.reason}`));
  console.log('\nCOVERAGE:');
  const cells={};
  passed.forEach(b=>{const k=`${b.level}-${b.topic}`;cells[k]=(cells[k]||0)+1;});
  Object.entries(cells).sort().forEach(([k,v])=>console.log(`  ${k}: ${v}`));
}
main().catch(e=>{console.error('FATAL:',e);process.exit(1);});
