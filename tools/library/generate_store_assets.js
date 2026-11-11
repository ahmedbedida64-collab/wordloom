const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Generating Google Play Store icons, feature graphic, and screenshots...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Generate 512x512 icon
    const iconPage = await browser.newPage({ viewport: { width: 512, height: 512 } });
    const svgContent = fs.readFileSync(path.resolve(__dirname, '../../icon.svg'), 'utf8');
    await iconPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: 512px; height: 512px; overflow: hidden; background: transparent; }
            svg { width: 512px; height: 512px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);
    await iconPage.screenshot({ path: path.resolve(__dirname, '../../icons/icon-512.png'), omitBackground: false });
    console.log('✓ Saved icons/icon-512.png (512x512 Play Store App Icon)');

    // 2. Generate 192x192 icon
    await iconPage.setViewportSize({ width: 192, height: 192 });
    await iconPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: 192px; height: 192px; overflow: hidden; background: transparent; }
            svg { width: 192px; height: 192px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);
    await iconPage.screenshot({ path: path.resolve(__dirname, '../../icons/icon-192.png'), omitBackground: false });
    console.log('✓ Saved icons/icon-192.png (192x192 PWA Icon)');

    // 3. Generate Maskable Icon (safe zone padding 10%)
    await iconPage.setViewportSize({ width: 512, height: 512 });
    await iconPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body, html { margin: 0; padding: 0; width: 512px; height: 512px; overflow: hidden; background: #1f6658; display: flex; align-items: center; justify-content: center; }
            svg { width: 410px; height: 410px; display: block; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);
    await iconPage.screenshot({ path: path.resolve(__dirname, '../../icons/icon-maskable-512.png') });
    console.log('✓ Saved icons/icon-maskable-512.png (512x512 Maskable Android Icon)');
    await iconPage.close();

    // 4. Generate 1024x500 Google Play Feature Graphic
    const featurePage = await browser.newPage({ viewport: { width: 1024, height: 500 } });
    await featurePage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              width: 1024px;
              height: 500px;
              overflow: hidden;
              background: linear-gradient(135deg, #2A1B14 0%, #17100D 60%, #0E0907 100%);
              font-family: 'DM Sans', sans-serif;
              color: #FAF4EB;
              display: flex;
              align-items: center;
              position: relative;
            }
            .bg-accent {
              position: absolute;
              top: -80px;
              right: -80px;
              width: 480px;
              height: 480px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(139, 90, 43, 0.35) 0%, rgba(139, 90, 43, 0) 70%);
              filter: blur(40px);
            }
            .container {
              position: relative;
              z-index: 2;
              display: flex;
              width: 100%;
              padding: 0 64px;
              align-items: center;
              justify-content: space-between;
            }
            .left-col {
              max-width: 580px;
            }
            .tag {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(139, 90, 43, 0.25);
              border: 1px solid rgba(139, 90, 43, 0.6);
              color: #E2B78E;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
              margin-bottom: 20px;
            }
            h1 {
              font-family: 'Cinzel', serif;
              font-size: 52px;
              font-weight: 700;
              letter-spacing: -0.01em;
              line-height: 1.1;
              color: #FFFDF9;
              margin-bottom: 14px;
            }
            h1 span {
              color: #D4A373;
            }
            p {
              font-size: 18px;
              line-height: 1.5;
              color: #D8C7B8;
              margin-bottom: 24px;
            }
            .badges {
              display: flex;
              gap: 12px;
            }
            .badge {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.12);
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 13px;
              color: #FAF4EB;
            }
            .right-col {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .icon-card {
              width: 220px;
              height: 220px;
              background: rgba(250, 244, 235, 0.05);
              border: 2px solid rgba(139, 90, 43, 0.4);
              border-radius: 40px;
              box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,90,43,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }
            .icon-card svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="bg-accent"></div>
          <div class="container">
            <div class="left-col">
              <div class="tag">✦ Graded Reading Laboratory</div>
              <h1>Wordloom<span>.</span></h1>
              <p>Master English through timeless literature. 21 graded classics, interactive spaced repetition, and neural voice narration.</p>
              <div class="badges">
                <div class="badge">📚 CEFR Levels A1–C2</div>
                <div class="badge">🎧 4 Voice Narrators</div>
                <div class="badge">⚡ 100% Offline Ready</div>
              </div>
            </div>
            <div class="right-col">
              <div class="icon-card">
                ${svgContent}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    await featurePage.waitForTimeout(600);
    await featurePage.screenshot({ path: path.resolve(__dirname, '../../docs/store/feature-graphic.png') });
    console.log('✓ Saved docs/store/feature-graphic.png (1024x500 Google Play Feature Graphic)');
    await featurePage.close();

    // 5. Generate High-Res Play Store Mobile Screenshots (1080x2400)
    console.log('Generating 1080x2400 high-res store screenshots...');
    const shotPage = await browser.newPage({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.625 // 412 * 2.625 = 1081.5 x 2401.875 px
    });

    await shotPage.addInitScript(() => {
      localStorage.setItem('wordloom-welcome-complete', 'true');
      localStorage.setItem('wordloom-session', JSON.stringify({
        token: 'store_token',
        userId: 'usr_store',
        email: 'reader@wordloom.com',
        name: 'Avid Reader',
        language: 'ar'
      }));
    });

    const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
    await shotPage.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await shotPage.waitForTimeout(800);

    // Screenshot 1: Library View
    await shotPage.screenshot({ path: path.resolve(__dirname, '../../docs/store/screenshots/1_library_view.png') });
    console.log('✓ Saved docs/store/screenshots/1_library_view.png');

    // Screenshot 2: Reader View
    await shotPage.evaluate(() => window.openReader("Aesop's Fables"));
    await shotPage.waitForTimeout(800);
    await shotPage.screenshot({ path: path.resolve(__dirname, '../../docs/store/screenshots/2_reader_view.png') });
    console.log('✓ Saved docs/store/screenshots/2_reader_view.png');

    // Screenshot 3: Review Hub & Games
    await shotPage.evaluate(() => window.showView('vocabulary'));
    await shotPage.waitForTimeout(800);
    await shotPage.screenshot({ path: path.resolve(__dirname, '../../docs/store/screenshots/3_review_hub.png') });
    console.log('✓ Saved docs/store/screenshots/3_review_hub.png');

    // Screenshot 4: Settings Dashboard
    await shotPage.evaluate(() => window.showView('settings'));
    await shotPage.waitForTimeout(800);
    await shotPage.screenshot({ path: path.resolve(__dirname, '../../docs/store/screenshots/4_settings_dashboard.png') });
    console.log('✓ Saved docs/store/screenshots/4_settings_dashboard.png');

    await shotPage.close();
    console.log('All store graphics and screenshots generated successfully!');
  } catch (err) {
    console.error('Error generating assets:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
