/**
 * PHASE 3 INGEST v2 — Fixed compilation splitter + more targets
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

function log(e){ fs.appendFileSync(LEDGER, JSON.stringify({...e,ts:new Date().toISOString()})+'\n'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function fetchText(url){
  return new Promise((resolve,reject)=>{
    https.get(url,{headers:{'User-Agent':'WordloomLibraryBuilder/1.0 (educational)'}},res=>{
      if([301,302].includes(res.statusCode)) return fetchText(res.headers.location).then(resolve).catch(reject);
      if(res.statusCode!==200){reject(new Error('HTTP '+res.statusCode));return;}
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(d));
    }).on('error',reject);
  });
}

async function getOrFetch(url, cacheKey){
  const f = path.join(CACHE, cacheKey+'.txt');
  if(fs.existsSync(f)) return fs.readFileSync(f,'utf8');
  await sleep(2200);
  const text = await fetchText(url);
  fs.writeFileSync(f, text);
  log({type:'download',url,cache:cacheKey});
  return text;
}

function stripBoilerplate(raw){
  // Normalize all line-ending variants first
  let text = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const startRe=/\*\*\* START OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  const endRe  =/\*\*\* END OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  let s=0, e=text.length;
  const sm=startRe.exec(text); if(sm){ s=text.indexOf('\n',sm.index)+1; }
  const em=endRe.exec(text);   if(em){ e=em.index; }
  return text.slice(s,e).trim();
}

function chunkIntoChapters(text, targetWords=121){
  const normalized = text.replace(/([^\n])\n(?!\n)/g,'$1 ').trim();
  const paragraphs = normalized.split(/\n{2,}/).map(p=>p.replace(/\s+/g,' ').trim()).filter(p=>p.length>10);
  const chapters=[];
  let cur=[], curWords=0;
  for(const p of paragraphs){
    const pw=p.split(/\s+/).length;
    if(curWords+pw > targetWords*1.6 && cur.length>0){
      chapters.push({title:'',subtitle:'',paragraphs:[...cur]});
      cur=[]; curWords=0;
    }
    cur.push(p); curWords+=pw;
  }
  if(cur.length>0) chapters.push({title:'',subtitle:'',paragraphs:[...cur]});
  return chapters;
}

// Split Aesop-style text: fable title lines appear as short standalone lines
// surrounded by blank lines, followed by the fable text, then a blank line + moral
function splitAesopFables(clean){
  const lines = clean.split('\n');
  const fables=[];
  let i=0;
  // Skip preamble (preface, life of aesop) — find first all-caps short line after content starts
  while(i<lines.length){
    const l=lines[i].trim();
    // A fable title: short (2-80 chars), title-case or ALL CAPS, no punctuation ending
    const isTitle = l.length>=5 && l.length<=80 &&
      !l.endsWith('.') && !l.endsWith(',') &&
      (l===l.toUpperCase() || /^The |^An |^A /.test(l)) &&
      lines[i-1]?.trim()==='' && lines[i+1]?.trim()==='' ;
    if(isTitle){
      // Collect this fable's text until next blank-line+title
      const title=l;
      const bodyLines=[];
      i+=2;
      while(i<lines.length){
        const next=lines[i].trim();
        const nextIsTitle = next.length>=5&&next.length<=80&&
          !next.endsWith('.')&&!next.endsWith(',')&&
          (next===next.toUpperCase()||/^The |^An |^A /.test(next))&&
          lines[i-1]?.trim()===''&&lines[i+1]?.trim()==='';
        if(nextIsTitle) break;
        bodyLines.push(lines[i]);
        i++;
      }
      const text=bodyLines.join('\n').trim();
      if(text.split(/\s+/).length>=30) fables.push({title,text});
    } else { i++; }
  }
  return fables;
}

// Split generic collection: stories/tales separated by blank lines + short title-ish line
function splitByTitles(clean){
  const lines=clean.split('\n');
  const stories=[];
  let curTitle='', curBody=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i].trim();
    const prev=(lines[i-1]||'').trim();
    const next=(lines[i+1]||'').trim();
    const isTitle=l.length>=4&&l.length<=90&&prev===''&&next===''&&
      !l.match(/^(THE END|CONTENTS|PREFACE|INTRODUCTION|CHAPTER|PART|BOOK)/i)&&
      (l===l.toUpperCase()||/^[IVX]+\.|^\d+\.|^[A-Z][a-z]/.test(l));
    if(isTitle&&curBody.join('').split(/\s+/).length>50){
      stories.push({title:curTitle,text:curBody.join('\n').trim()});
      curTitle=l; curBody=[];
    } else if(isTitle&&curBody.length<5){ curTitle=l; }
    else { curBody.push(lines[i]); }
  }
  if(curBody.join('').split(/\s+/).length>50) stories.push({title:curTitle,text:curBody.join('\n').trim()});
  return stories.filter(s=>s.text.split(/\s+/).length>=80);
}

function sliceToRange(stories, minW=2420, maxW=12100){
  let sel=[],total=0;
  for(const s of stories){
    const w=s.text.split(/\s+/).filter(Boolean).length;
    if(total+w>maxW) break;
    sel.push(s); total+=w;
    if(total>=minW) break;
  }
  return {sel,total};
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
    meta:{word_count,page_count:chapters.length,level_measured,flesch_kincaid_grade,avg_sentence_length,pgId}
  };
}

function saveBook(slug,record){
  fs.writeFileSync(path.join(OUT,slug+'.json'),JSON.stringify(record,null,2));
}

// ─── TARGETS ─────────────────────────────────────────────────────────────────
const TARGETS=[
  // Already verified passing — re-confirm
  {slug:'yellow_wallpaper',pgId:1952,level:'B2',topic:'life',kind:'story',
   url:'https://www.gutenberg.org/files/1952/1952-0.txt',
   title:'The Yellow Wallpaper',author:'Charlotte Perkins Gilman',
   description:'A woman confined to a room slowly loses her mind — a landmark feminist story.'},

  {slug:'secret_sharer',pgId:23362,level:'B2',topic:'travel',kind:'story',
   url:'https://www.gutenberg.org/files/23362/23362-0.txt',
   title:'The Secret Sharer',author:'Joseph Conrad',
   description:'A sea captain harbours a mysterious fugitive and confronts his own identity.'},

  // ── Compilations with fixed splitter ──────────────────────────────────────
  {slug:'aesop_fables',pgId:21,level:'A1',topic:'culture',kind:'fable',
   type:'aesop',
   url:'https://www.gutenberg.org/files/21/21-0.txt',
   title:"Aesop's Fables",author:'Aesop (transl. George F. Townsend)',
   description:'Timeless moral tales featuring animals in simple, vivid language — perfect for beginners.'},

  {slug:'grimm_tales',pgId:2591,level:'A2',topic:'culture',kind:'fairy tale',
   type:'titles',
   url:'https://www.gutenberg.org/files/2591/2591-0.txt',
   title:"Grimm's Selected Fairy Tales",author:'Brothers Grimm (transl. Margaret Hunt)',
   description:'Beloved European fairy tales of magic, courage, and transformation.'},

  {slug:'poe_stories',pgId:2148,level:'B2',topic:'culture',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/2148/2148-0.txt',
   title:'Selected Stories by Edgar Allan Poe',author:'Edgar Allan Poe',
   description:'Gothic horror and mystery masterpieces that invented the short story form.'},

  {slug:'ohenry_million',pgId:2776,level:'B1',topic:'life',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/2776/2776-0.txt',
   title:'The Four Million — Selected Stories',author:'O. Henry',
   description:'Warm, witty tales of everyday New York life with unexpected twists.'},

  {slug:'wilde_fairy_tales',pgId:902,level:'A2',topic:'culture',kind:'fairy tale',
   type:'titles',
   url:'https://www.gutenberg.org/files/902/902-0.txt',
   title:"Selected Fairy Tales by Oscar Wilde",author:'Oscar Wilde',
   description:'Elegant, compassionate fairy tales rich with moral beauty and lyrical prose.'},

  {slug:'chekhov_ward6',pgId:1695,level:'B1',topic:'life',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/1695/1695-0.txt',
   title:'Selected Stories by Anton Chekhov',author:'Anton Chekhov',
   description:'Quiet, precise portraits of Russian daily life that shaped modern short fiction.'},

  {slug:'twain_jumping_frog',pgId:7100,level:'A2',topic:'life',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/7100/7100-0.txt',
   title:'The Celebrated Jumping Frog and Other Sketches',author:'Mark Twain',
   description:'Humorous frontier tales and sketches capturing the wit and absurdity of early America.'},

  // ── More individual works (targeted to be in range) ───────────────────────
  {slug:'canterville_ghost',pgId:14522,level:'B1',topic:'culture',kind:'story',
   url:'https://www.gutenberg.org/files/14522/14522-0.txt',
   title:'The Canterville Ghost',author:'Oscar Wilde',
   description:'An American family moves into a haunted English manor and refuses to be frightened.'},

  {slug:'rip_van_winkle',pgId:2048,level:'A2',topic:'life',kind:'story',
   type:'extract_story',extract_title:'RIP VAN WINKLE',
   url:'https://www.gutenberg.org/files/2048/2048-0.txt',
   title:'Rip Van Winkle',author:'Washington Irving',
   description:'A lazy man falls asleep in the Catskill Mountains and wakes up twenty years later.'},

  {slug:'dorian_gray_short',pgId:174,level:'C1',topic:'culture',kind:'story',
   // Too long (entire novel). Skip — we already know this from candidate list
   url:'https://www.gutenberg.org/files/174/174-0.txt',
   title:'The Picture of Dorian Gray',author:'Oscar Wilde',
   description:'A beautiful young man sells his soul for eternal youth, with devastating consequences.'},

  {slug:'maupassant_best',pgId:3090,level:'B1',topic:'life',kind:'story',
   type:'maupassant_fix',
   url:'https://www.gutenberg.org/files/3090/3090-0.txt',
   title:'Best Short Stories — Guy de Maupassant',author:'Guy de Maupassant',
   description:'Sharp, ironic tales of French society — ambition, love, and human weakness.'},

  {slug:'kipling_stories',pgId:1081,level:'B1',topic:'travel',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/1081/1081-0.txt',
   title:'Selected Stories — Rudyard Kipling',author:'Rudyard Kipling',
   description:'Vivid tales of colonial India and adventure from a master storyteller.'},

  {slug:'london_south_sea',pgId:1162,level:'B1',topic:'travel',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/1162/1162-0.txt',
   title:'South Sea Tales',author:'Jack London',
   description:'Gripping adventure stories set among the islands and storms of the Pacific.'},

  {slug:'twain_diaries',pgId:4612,level:'A2',topic:'culture',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/4612/4612-0.txt',
   title:"The Diaries of Adam and Eve",author:'Mark Twain',
   description:'Twain retells the Garden of Eden from Adam and Eve\'s own amusing perspectives.'},

  {slug:'irving_alhambra',pgId:3044,level:'B2',topic:'history',kind:'story',
   type:'titles',
   url:'https://www.gutenberg.org/files/3044/3044-0.txt',
   title:'Tales from the Alhambra',author:'Washington Irving',
   description:'Legends and stories gathered in the ancient Moorish palace of Granada, Spain.'},

  {slug:'james_beast_jungle',pgId:1093,level:'C1',topic:'life',kind:'story',
   url:'https://www.gutenberg.org/files/1093/1093-0.txt',
   title:'The Beast in the Jungle',author:'Henry James',
   description:'A man spends his life waiting for a terrible fate — only to find it was waiting in vain.'},

  {slug:'wharton_bunner_sisters',pgId:4517,level:'B2',topic:'life',kind:'story',
   url:'https://www.gutenberg.org/files/4517/4517-0.txt', // ethan frome text file, will skip if too long
   title:'Ethan Frome',author:'Edith Wharton',
   description:'A farmer trapped between duty and forbidden love in bleak New England winter.'},
];

// ─── PROCESS ─────────────────────────────────────────────────────────────────
async function processTarget(target){
  let raw;
  try { raw = await getOrFetch(target.url, `text_${target.pgId}`); }
  catch(e){ return {status:'fail',reason:'fetch:'+e.message}; }

  const clean = stripBoilerplate(raw);
  const cleanWords = clean.split(/\s+/).filter(Boolean).length;

  let finalText=clean, chapters=null;

  // ── Handle compilation types ──
  if(target.type==='aesop'){
    const fables=splitAesopFables(clean);
    console.log(`  Aesop: found ${fables.length} fables`);
    if(fables.length<10) return {status:'fail',reason:`aesop_few_fables:${fables.length}`};
    const {sel,total}=sliceToRange(fables);
    if(sel.length<20||total<2420) return {status:'fail',reason:`aesop_slice_short:${sel.length}/${total}`};
    finalText=sel.map(f=>f.title+'\n\n'+f.text).join('\n\n\n');
    chapters=[];
    for(const f of sel){
      const ch=chunkIntoChapters(f.text,121);
      if(ch.length>0){ ch[0].title=f.title; chapters.push(...ch); }
    }

  } else if(target.type==='titles'){
    const stories=splitByTitles(clean);
    console.log(`  Titles split: found ${stories.length} stories`);
    if(stories.length<3) return {status:'fail',reason:`few_stories:${stories.length}`};
    const {sel,total}=sliceToRange(stories);
    if(sel.length<5||total<2420) return {status:'fail',reason:`slice_short:${sel.length}/${total}`};
    finalText=sel.map(s=>s.title+'\n\n'+s.text).join('\n\n\n');
    chapters=[];
    for(const s of sel){
      const ch=chunkIntoChapters(s.text,121);
      if(ch.length>0){ ch[0].title=s.title; chapters.push(...ch); }
    }

  } else if(target.type==='extract_story'){
    // Extract one story by its all-caps title
    const marker=target.extract_title;
    const idx=clean.indexOf(marker);
    if(idx===-1) return {status:'fail',reason:`marker_not_found:${marker}`};
    // Find end: next all-caps heading or major section break
    const after=clean.slice(idx+marker.length);
    const nextHeading=after.search(/\n[A-Z]{4,}[^\n]*\n/);
    const storyText=nextHeading>0 ? after.slice(0,nextHeading).trim() : after.slice(0,12000).trim();
    const storyWords=storyText.split(/\s+/).filter(Boolean).length;
    if(storyWords<2420||storyWords>12100) return {status:'fail',reason:`extract_oob:${storyWords}`};
    finalText=storyText;

  } else if(target.type==='maupassant_fix'){
    // Maupassant PG 3090: split by "THE " prefix stories
    const storyRe=/\n(THE [A-Z\s']+)\n/g;
    const stories=[];
    let lastIdx=0, lastTitle='';
    let m;
    while((m=storyRe.exec(clean))!==null){
      if(lastTitle&&m.index-lastIdx>200){
        stories.push({title:lastTitle,text:clean.slice(lastIdx,m.index).trim()});
      }
      lastTitle=m[1].trim(); lastIdx=m.index+m[0].length;
    }
    if(lastTitle) stories.push({title:lastTitle,text:clean.slice(lastIdx).trim()});
    console.log(`  Maupassant: found ${stories.length} stories`);
    if(stories.length<3) return {status:'fail',reason:`few_maupassant:${stories.length}`};
    const {sel,total}=sliceToRange(stories);
    if(sel.length<5||total<2420) return {status:'fail',reason:`slice_short:${sel.length}/${total}`};
    finalText=sel.map(s=>s.title+'\n\n'+s.text).join('\n\n\n');
    chapters=[];
    for(const s of sel){
      const ch=chunkIntoChapters(s.text,121);
      if(ch.length>0){ ch[0].title=s.title; chapters.push(...ch); }
    }
  }

  const finalWords=finalText.split(/\s+/).filter(Boolean).length;
  if(finalWords<2420) return {status:'fail',reason:`too_short:${finalWords}`};
  if(finalWords>12100&&!chapters) return {status:'fail',reason:`too_long:${finalWords}`};

  if(!chapters) chapters=chunkIntoChapters(finalText,121);
  if(chapters.length<20) return {status:'fail',reason:`few_pages:${chapters.length}`};
  const trimmed=chapters.slice(0,100);

  const record=buildRecord({title:target.title,author:target.author,
    level:target.level,topic:target.topic,description:target.description,
    pgId:target.pgId,clean:finalText,chapters:trimmed,kind:target.kind});

  const errs=[];
  if(trimmed.length<20||trimmed.length>100) errs.push(`PAGE_OOB:${trimmed.length}`);
  if(record.meta.word_count<2420||record.meta.word_count>12100) errs.push(`WORD_OOB:${record.meta.word_count}`);
  if(errs.length>0) return {status:'fail',reason:errs.join(',')};

  saveBook(target.slug,record);
  return {status:'pass',pages:trimmed.length,words:record.meta.word_count,
    level_measured:record.meta.level_measured,fk:record.meta.flesch_kincaid_grade};
}

async function main(){
  const provenance=[], passed=[], failed=[];
  // Load existing provenance if present
  let existingProv=[];
  try{ existingProv=JSON.parse(fs.readFileSync(PROV,'utf8')); }catch(e){}

  for(const target of TARGETS){
    process.stdout.write(`\n[PROCESS] ${target.title}...`);
    const result=await processTarget(target);
    if(result.status==='pass'){
      passed.push({...result,slug:target.slug,title:target.title,level:target.level,topic:target.topic});
      provenance.push({slug:target.slug,pgId:target.pgId,title:target.title,
        author:target.author,source_url:`https://www.gutenberg.org/ebooks/${target.pgId}`,
        download_url:target.url,retrieved_at:new Date().toISOString(),
        licence:'Public Domain (Project Gutenberg)',
        word_count:result.words,pages:result.pages});
      console.log(` PASS pages=${result.pages} words=${result.words} lvl_measured=${result.level_measured} FK=${result.fk}`);
    } else {
      failed.push({slug:target.slug,title:target.title,reason:result.reason});
      console.log(` SKIP: ${result.reason}`);
      log({type:'ingest_skip',slug:target.slug,reason:result.reason});
    }
  }

  fs.writeFileSync(PROV, JSON.stringify([...existingProv,...provenance],null,2));

  console.log('\n\n═══════════════════════════════════════');
  console.log('PHASE 3 v2 SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Total targets: ${TARGETS.length} | PASSED: ${passed.length} | SKIPPED: ${failed.length}`);
  console.log('\nPASSED:');
  passed.forEach(b=>console.log(`  ✅ ${b.slug.padEnd(28)} pages=${b.pages} words=${b.words} level=${b.level}(${b.level_measured}) topic=${b.topic} FK=${b.fk}`));
  console.log('\nSKIPPED:');
  failed.forEach(b=>console.log(`  ❌ ${b.slug.padEnd(28)} ${b.reason}`));
  console.log('\nCOVERAGE:');
  const cells={};
  passed.forEach(b=>{const k=`${b.level}-${b.topic}`;cells[k]=(cells[k]||0)+1;});
  Object.entries(cells).sort().forEach(([k,v])=>console.log(`  ${k}: ${v}`));
}

main().catch(e=>{console.error('FATAL:',e);process.exit(1);});
