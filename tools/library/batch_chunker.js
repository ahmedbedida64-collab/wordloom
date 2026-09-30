const fs = require('fs');
const path = require('path');

const stagingDir = 'docs/library/staging';
const outputDir = 'docs/library/processed_books';
const ledgerPath = 'docs/library/CRAWL_LEDGER.jsonl';
const progressPath = 'docs/library/PROGRESS.json';

function cleanAndChunkText(title, rawText) {
    if (!rawText || rawText.trim().length === 0) {
        throw new Error("Validation Failed: Empty text file detected");
    }
    
    let text = rawText.replace(/\r\n/g, '\n');
    let rawParagraphs = text.split(/\n{2,}/);
    
    let paragraphs = rawParagraphs.map(p => {
        return p.replace(/(?<!\n)\n(?!\n)/g, ' ').trim();
    }).filter(p => p.length > 0);

    const pages = [];
    let currentPageParagraphs = [];
    let currentPageWordCount = 0;
    let pageNumber = 1;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const pWordCount = p.split(/\s+/).length;

        if (currentPageWordCount + pWordCount > 280 && currentPageParagraphs.length > 0) {
            pages.push({
                page_number: pageNumber++,
                word_count: currentPageWordCount,
                content: currentPageParagraphs.join('\n\n')
            });
            currentPageParagraphs = [];
            currentPageWordCount = 0;
        }
        currentPageParagraphs.push(p);
        currentPageWordCount += pWordCount;
    }

    if (currentPageParagraphs.length > 0) {
        pages.push({
            page_number: pageNumber++,
            word_count: currentPageWordCount,
            content: currentPageParagraphs.join('\n\n')
        });
    }

    return {
        book_title: title,
        total_pages: pages.length,
        pages: pages
    };
}

let processed = 0;
let failed = 0;
const files = fs.readdirSync(stagingDir).filter(f => f.endsWith('.txt'));

for (let file of files) {
    try {
        const rawText = fs.readFileSync(path.join(stagingDir, file), 'utf8');
        const title = file.replace('.txt', '');
        const result = cleanAndChunkText(title, rawText);
        fs.writeFileSync(path.join(outputDir, `${title}.json`), JSON.stringify(result, null, 2));
        processed++;
    } catch (e) {
        failed++;
        fs.appendFileSync(ledgerPath, JSON.stringify({ file: file, status: "failed", reason: e.message, timestamp: new Date().toISOString() }) + "\n");
    }
}

console.log(`Batch Complete. Processed: ${processed}, Failed: ${failed}`);

// Update progress
let progress = { discovered: 3, fetched: 3, skipped: 0, processed: 0, failed: 0 };
if (fs.existsSync(progressPath)) {
    try { progress = JSON.parse(fs.readFileSync(progressPath, 'utf8')); } catch (e) {}
}
progress.processed = (progress.processed || 0) + processed;
progress.failed = (progress.failed || 0) + failed;
fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
