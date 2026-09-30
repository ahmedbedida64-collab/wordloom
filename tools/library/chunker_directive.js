const fs = require('fs');

function cleanAndChunkText(title, rawText) {
    // 1. Clean rogue line breaks within paragraphs
    // First normalize all breaks to \n
    let text = rawText.replace(/\r\n/g, '\n');
    // Split by paragraph boundary (2 or more newlines)
    let rawParagraphs = text.split(/\n{2,}/);
    
    let paragraphs = rawParagraphs.map(p => {
        // Replace single newlines within a paragraph with a space
        return p.replace(/(?<!\n)\n(?!\n)/g, ' ').trim();
    }).filter(p => p.length > 0);

    const pages = [];
    let currentPageParagraphs = [];
    let currentPageWordCount = 0;
    let pageNumber = 1;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const pWordCount = p.split(/\s+/).length;

        // If adding this paragraph pushes us over 250, and we already have text, push the chunk.
        // If the single paragraph itself is huge, we still keep it together.
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

    // Push the final chunk
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

const text = fs.readFileSync('/tmp/dummy_text.txt', 'utf8');
const result = cleanAndChunkText("The Emperor's New Clothes", text);
console.log(JSON.stringify(result, null, 2));
