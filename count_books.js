const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const match = html.match(/const WORDLOOM_CATALOG = (\[[\s\S]*?\]);\n/);
if(match) {
    // Basic extraction
    const catalogStr = match[1];
    // Need to safely parse it or just count occurrences of `"level":`
    const levels = catalogStr.match(/"level":\s*"([^"]+)"/g);
    const topics = catalogStr.match(/"topic":\s*"([^"]+)"/g);
    console.log("Total books:", levels ? levels.length : 0);
    const counts = {};
    const tMatch = catalogStr.matchAll(/"level":\s*"([^"]+)",\s*"topic":\s*"([^"]+)"/g);
    for (const m of tMatch) {
        const key = m[1] + '-' + m[2];
        counts[key] = (counts[key] || 0) + 1;
    }
    console.log(counts);
} else { console.log("Catalog not found"); }
