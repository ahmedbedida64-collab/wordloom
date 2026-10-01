/**
 * replace_casual_covers.js
 * Downloads and replaces the 12 casual/high-key placeholder covers with authentic,
 * period-appropriate, low-key, literary fine-art photography matching the 19th-century
 * atmosphere and setting of each classic work.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const replacements = [
  {
    file: 'cover_irving_alhambra.jpg',
    book: 'Tales from the Alhambra',
    url: 'https://images.unsplash.com/photo-1669231334393-db4ae180be84?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Carved Moorish colonnade and arches of the Alhambra in Granada'
  },
  {
    file: 'cover_irving_tales.jpg',
    book: 'Tales from the Sketch Book',
    url: 'https://plus.unsplash.com/premium_photo-1697762692100-9aa1aa7d7410?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Rustic covered bridge in misty autumn Hudson Valley forest'
  },
  {
    file: 'cover_secret_sharer.jpg',
    book: 'The Secret Sharer',
    url: 'https://plus.unsplash.com/premium_photo-1748104089442-0148aec710c1?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Wooden tall ship sailing at dusk under dark tropical sky'
  },
  {
    file: 'cover_kipling_stories.jpg',
    book: 'Plain Tales from the Hills',
    url: 'https://images.unsplash.com/photo-1506452305024-9d3f02d1c9b5?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Evergreen pine forest emerging from deep Himalayan mountain fog'
  },
  {
    file: 'cover_london_tales.jpg',
    book: 'South Sea Tales',
    url: 'https://images.unsplash.com/photo-1763877271966-0eaad4b2620e?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Stormy Pacific waves crashing over dark volcanic rocky coast'
  },
  {
    file: 'cover_hardy_stories.jpg',
    book: 'Wessex Tales',
    url: 'https://images.unsplash.com/photo-1715195606258-b5c586aeb5a3?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Moody rolling English moor countryside from hilltop under dark clouds'
  },
  {
    file: 'cover_chekhov_stories.jpg',
    book: 'Selected Stories by Anton Chekhov',
    url: 'https://images.unsplash.com/photo-1548346624-cebe41d2433c?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Rustic wooden dacha porch with empty rocking chairs in autumn'
  },
  {
    file: 'cover_maupassant_stories.jpg',
    book: 'Selected Stories by Guy de Maupassant',
    url: 'https://images.unsplash.com/photo-1729856237380-b636323ea8b8?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Rain-slicked Parisian cobblestone street at night with streetlights and moon'
  },
  {
    file: 'cover_ohenry_million.jpg',
    book: 'The Four Million',
    url: 'https://images.unsplash.com/photo-1762275589087-16e5cbd82e8f?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Turn-of-the-century New York brownstones with tall chimneys at night'
  },
  {
    file: 'cover_twain_humor.jpg',
    book: 'Sketches New and Old',
    url: 'https://images.unsplash.com/photo-1764662274717-e5fec9a57e37?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Foggy river waterfront with glowing streetlights and wooden dock'
  },
  {
    file: 'cover_saki_stories.jpg',
    book: 'Selected Stories by Saki',
    url: 'https://images.unsplash.com/photo-1640273837947-ea830d50c191?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Antique Edwardian manor library with dark oak bookshelves and warm lamp'
  },
  {
    file: 'cover_alice_wonderland.jpg',
    book: 'Alice in Wonderland',
    url: 'https://plus.unsplash.com/premium_photo-1682125779534-76c5debea767?auto=format&fit=crop&w=800&h=1200&q=85',
    motif: 'Vintage brass pocket watch resting on antique leather books on dark wood'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function run() {
  const coversDir = path.join(__dirname, '../../covers');
  console.log(`Starting replacement of ${replacements.length} casual covers with authentic fine-art photography...\n`);

  for (const item of replacements) {
    const dest = path.join(coversDir, item.file);
    process.stdout.write(`Downloading for "${item.book}" -> ${item.file}... `);
    try {
      await download(item.url, dest);
      const stat = fs.statSync(dest);
      console.log(`OK (${Math.round(stat.size / 1024)} KB) - ${item.motif}`);
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }

  console.log('\nAll replacements successfully downloaded and placed into /covers.');
}

run();
