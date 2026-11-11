const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DENSITIES = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

(async () => {
  console.log('Generating Android mipmap launcher icons...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const svgContent = fs.readFileSync(path.resolve(__dirname, '../../icon.svg'), 'utf8');

  for (const d of DENSITIES) {
    const targetDir = path.resolve(__dirname, `../../android/app/src/main/res/${d.folder}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Square / Standard Icon
    await page.setViewportSize({ width: d.size, height: d.size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: ${d.size}px; height: ${d.size}px; overflow: hidden; background: transparent; }
            svg { width: ${d.size}px; height: ${d.size}px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);
    await page.screenshot({ path: path.join(targetDir, 'ic_launcher.png'), omitBackground: true });

    // Round Icon
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: ${d.size}px; height: ${d.size}px; overflow: hidden; background: transparent; }
            .round-container { width: ${d.size}px; height: ${d.size}px; border-radius: 50%; overflow: hidden; }
            svg { width: ${d.size}px; height: ${d.size}px; display: block; }
          </style>
        </head>
        <body>
          <div class="round-container">
            ${svgContent}
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: path.join(targetDir, 'ic_launcher_round.png'), omitBackground: true });
    console.log(`✓ Generated ${d.folder} (${d.size}x${d.size})`);
  }

  // Generate foreground for adaptive icon
  const anyDpiDir = path.resolve(__dirname, '../../android/app/src/main/res/drawable');
  await page.setViewportSize({ width: 432, height: 432 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body, html { margin: 0; padding: 0; width: 432px; height: 432px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
          svg { width: 260px; height: 260px; display: block; }
        </style>
      </head>
      <body>${svgContent}</body>
    </html>
  `);
  await page.screenshot({ path: path.join(anyDpiDir, 'ic_launcher_foreground.png'), omitBackground: true });
  console.log('✓ Generated ic_launcher_foreground.png for adaptive icons');

  await browser.close();
  console.log('All Android icons generated successfully!');
})();
