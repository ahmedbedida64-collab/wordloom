/**
 * verify_recreated_auth_and_custom_books.js
 * End-to-end Playwright verification of recreated authentication system & custom books page.
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('=== VERIFYING RECREATED AUTHENTICATION & CUSTOM BOOKS ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  
  // Abort external network calls
  await page.route(/https:\/\/(fonts\.|cdn\.tailwindcss|unpkg)/, route => route.abort());

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push('PAGE_ERROR: ' + err.message);
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '../../index.html');
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // 1. Initial State (No Session)
  console.log('[TEST 1] Initial Locked Auth Screen State...');
  const isAuthVisible = await page.isVisible('#auth-screen');
  if (!isAuthVisible) throw new Error('FAIL: Auth screen should be visible on initial load without session');

  const authClasses = await page.evaluate(() => {
    const screen = document.querySelector('#auth-screen');
    const shell = document.querySelector('.app-shell');
    const dock = document.querySelector('#react-nav-root');
    const title = document.querySelector('#auth-card-title')?.innerText.trim();
    const sub = document.querySelector('#auth-card-sub')?.innerText.trim();
    const btn = document.querySelector('#auth-submit-btn')?.innerText.trim();
    const nameVisible = window.getComputedStyle(document.querySelector('#auth-name-group')).display !== 'none';
    const langVisible = window.getComputedStyle(document.querySelector('#auth-language-group')).display !== 'none';
    const demoVisible = window.getComputedStyle(document.querySelector('#auth-demo-hint')).display !== 'none';
    const dockDisplay = dock ? window.getComputedStyle(dock).display : null;

    return {
      screenHidden: screen.classList.contains('hidden'),
      shellLocked: shell.classList.contains('auth-locked'),
      title,
      sub,
      btn,
      nameVisible,
      langVisible,
      demoVisible,
      dockDisplay
    };
  });

  console.log('   Auth state:', authClasses);
  if (authClasses.screenHidden) throw new Error('FAIL: Auth screen has hidden class');
  if (!authClasses.shellLocked) throw new Error('FAIL: App shell must have auth-locked class');
  if (authClasses.title !== 'Welcome back') throw new Error('FAIL: Unexpected title: ' + authClasses.title);
  if (authClasses.btn !== 'Sign In') throw new Error('FAIL: Expected "Sign In" button text, got: ' + authClasses.btn);
  if (authClasses.nameVisible || authClasses.langVisible) throw new Error('FAIL: Name & language should be hidden in Sign In mode');
  if (!authClasses.demoVisible) throw new Error('FAIL: Demo hint should be visible in Sign In mode');
  if (authClasses.dockDisplay !== 'none') throw new Error('FAIL: Dock should be display: none when locked');
  console.log('   ✓ Initial locked state is clean and isolated.');

  // Take screenshot of new auth screen
  await page.screenshot({ path: path.resolve(__dirname, 'recreated_auth_signin.png') });
  console.log('   ✓ Screenshot saved: recreated_auth_signin.png');

  // 2. Form Validation & Password Toggle
  console.log('\n[TEST 2] Validation & Show/Hide Password Toggle...');
  await page.fill('#auth-email', '');
  await page.fill('#auth-password', '');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(200);

  let errorText = await page.innerText('#auth-error');
  console.log('   Empty submit error:', errorText);
  if (!errorText.includes('enter your email')) throw new Error('FAIL: Expected empty email validation error');

  // Password toggle test
  await page.fill('#auth-password', 'secretPass');
  let pwdType = await page.getAttribute('#auth-password', 'type');
  if (pwdType !== 'password') throw new Error('FAIL: Password input should initially have type="password"');

  await page.click('#auth-password-toggle');
  pwdType = await page.getAttribute('#auth-password', 'type');
  if (pwdType !== 'text') throw new Error('FAIL: Password input should change to type="text" when toggled');

  await page.click('#auth-password-toggle');
  pwdType = await page.getAttribute('#auth-password', 'type');
  if (pwdType !== 'password') throw new Error('FAIL: Password input should toggle back to type="password"');
  console.log('   ✓ Password visibility toggle functions correctly.');

  // Incorrect password test
  await page.fill('#auth-email', 'demo@wordloom.com');
  await page.fill('#auth-password', 'wrongPassword');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(200);
  errorText = await page.innerText('#auth-error');
  console.log('   Wrong password error:', errorText);
  if (!errorText.includes('Incorrect password')) throw new Error('FAIL: Expected "Incorrect password" error message');
  console.log('   ✓ Credential validation operates correctly.');

  // 3. Successful Sign In & Settings Account Badge
  console.log('\n[TEST 3] Successful Sign In (Demo Account) & Unlock...');
  await page.click('#auth-fill-demo');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(400);

  const unlockedState = await page.evaluate(() => {
    const screen = document.querySelector('#auth-screen');
    const shell = document.querySelector('.app-shell');
    const dock = document.querySelector('#react-nav-root');
    return {
      screenHidden: screen.classList.contains('hidden'),
      shellLocked: shell.classList.contains('auth-locked'),
      dockDisplay: dock ? window.getComputedStyle(dock).display : null,
      session: JSON.parse(localStorage.getItem('wordloom-session') || 'null')
    };
  });
  console.log('   Unlocked state:', unlockedState);
  if (!unlockedState.screenHidden) throw new Error('FAIL: Auth screen should be hidden after sign in');
  if (unlockedState.shellLocked) throw new Error('FAIL: App shell should not be auth-locked');
  if (unlockedState.dockDisplay === 'none') throw new Error('FAIL: Dock should be visible after unlock');
  if (!unlockedState.session || unlockedState.session.email !== 'demo@wordloom.com') {
    throw new Error('FAIL: Session not properly created: ' + JSON.stringify(unlockedState.session));
  }
  console.log('   ✓ App unlocked successfully!');

  // Navigate to Settings and check Account Profile
  console.log('\n[TEST 4] Settings View Account Profile & Sign Out...');
  await page.evaluate(() => window.showView('settings'));
  await page.waitForTimeout(300);

  const accountInfo = await page.evaluate(() => {
    const name = document.querySelector('#account-user-name')?.innerText.trim();
    const email = document.querySelector('#account-user-email')?.innerText.trim();
    const avatar = document.querySelector('#account-avatar')?.innerText.trim();
    const signoutBtn = document.querySelector('#auth-signout');
    const c = window.getComputedStyle(signoutBtn);
    return {
      name,
      email,
      avatar,
      signoutBorder: c.borderTopColor,
      signoutBg: c.backgroundColor,
      signoutColor: c.color,
      signoutRadius: c.borderRadius
    };
  });
  console.log('   Settings Account profile:', accountInfo);
  if (accountInfo.name !== 'Demo Reader') throw new Error('FAIL: Account name mismatch');
  if (accountInfo.email !== 'demo@wordloom.com') throw new Error('FAIL: Account email mismatch');
  if (accountInfo.avatar !== 'D') throw new Error('FAIL: Account avatar mismatch');
  if (accountInfo.signoutBorder !== 'rgb(139, 90, 43)') throw new Error('FAIL: Sign out button border color mismatch');
  console.log('   ✓ Settings displays active account profile and brown natural frame Sign Out button.');

  // Take screenshot of settings account section
  await page.screenshot({ path: path.resolve(__dirname, 'recreated_settings_account.png') });

  // Test Sign Out
  await page.click('#auth-signout');
  await page.waitForTimeout(400);

  const signedOutState = await page.evaluate(() => {
    const screen = document.querySelector('#auth-screen');
    const shell = document.querySelector('.app-shell');
    const session = localStorage.getItem('wordloom-session');
    return {
      screenHidden: screen.classList.contains('hidden'),
      shellLocked: shell.classList.contains('auth-locked'),
      session
    };
  });
  console.log('   Signed out state:', signedOutState);
  if (signedOutState.screenHidden) throw new Error('FAIL: Auth screen should be visible after sign out');
  if (!signedOutState.shellLocked) throw new Error('FAIL: App shell should be locked after sign out');
  if (signedOutState.session !== null) throw new Error('FAIL: Session should be removed from localStorage');
  console.log('   ✓ Sign out cleanly returns to login screen and purges session!');

  // 4. Create Account Mode (Registration)
  console.log('\n[TEST 5] Registration Mode (Create Account)...');
  await page.click('#auth-tab-signup');
  await page.waitForTimeout(300);

  const signupState = await page.evaluate(() => {
    const title = document.querySelector('#auth-card-title')?.innerText.trim();
    const btn = document.querySelector('#auth-submit-btn')?.innerText.trim();
    const nameVisible = window.getComputedStyle(document.querySelector('#auth-name-group')).display !== 'none';
    const langVisible = window.getComputedStyle(document.querySelector('#auth-language-group')).display !== 'none';
    const demoVisible = window.getComputedStyle(document.querySelector('#auth-demo-hint')).display !== 'none';
    return { title, btn, nameVisible, langVisible, demoVisible };
  });
  console.log('   Sign up tab state:', signupState);
  if (signupState.title !== 'Create your account') throw new Error('FAIL: Expected "Create your account" title');
  if (signupState.btn !== 'Create Account') throw new Error('FAIL: Expected "Create Account" button');
  if (!signupState.nameVisible || !signupState.langVisible) throw new Error('FAIL: Name and language should be visible');
  if (signupState.demoVisible) throw new Error('FAIL: Demo hint should be hidden in signup mode');

  await page.screenshot({ path: path.resolve(__dirname, 'recreated_auth_signup.png') });

  // Test validation on registration
  await page.fill('#auth-name', '');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(200);
  errorText = await page.innerText('#auth-error');
  if (!errorText.includes('enter your full name')) throw new Error('FAIL: Expected name validation error');

  await page.fill('#auth-name', 'Salma Reader');
  await page.fill('#auth-email', 'salma@test.com');
  await page.fill('#auth-password', '123'); // too short
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(200);
  errorText = await page.innerText('#auth-error');
  if (!errorText.includes('at least 6 characters')) throw new Error('FAIL: Expected password length error');

  // Successful Registration
  await page.fill('#auth-password', 'reading_password_2024');
  await page.selectOption('#auth-language', 'fr');
  await page.click('#auth-submit-btn');
  await page.waitForTimeout(400);

  const registeredSession = await page.evaluate(() => {
    return {
      session: JSON.parse(localStorage.getItem('wordloom-session') || 'null'),
      lang: localStorage.getItem('wordloom-language')
    };
  });
  console.log('   Registered session:', registeredSession);
  if (!registeredSession.session || registeredSession.session.name !== 'Salma Reader') {
    throw new Error('FAIL: New user session invalid');
  }
  if (registeredSession.lang !== 'fr') throw new Error('FAIL: Mother language not updated to fr');
  console.log('   ✓ User registration created account and logged in successfully!');

  // Sign out again
  await page.evaluate(() => window.WordloomAuth.signOut());
  await page.waitForTimeout(300);

  // 5. Social & Guest Login
  console.log('\n[TEST 6] Social SSO (Google & GitHub) and Guest Mode...');
  // Test Google SSO
  await page.click('#auth-google-btn');
  await page.waitForTimeout(300);
  let session = await page.evaluate(() => JSON.parse(localStorage.getItem('wordloom-session') || 'null'));
  if (session.provider !== 'google') throw new Error('FAIL: Google SSO session failed');
  console.log('   ✓ Google SSO login works.');

  await page.evaluate(() => window.WordloomAuth.signOut());
  await page.waitForTimeout(300);

  // Test GitHub SSO
  await page.click('#auth-github-btn');
  await page.waitForTimeout(300);
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('wordloom-session') || 'null'));
  if (session.provider !== 'github') throw new Error('FAIL: GitHub SSO session failed');
  console.log('   ✓ GitHub SSO login works.');

  await page.evaluate(() => window.WordloomAuth.signOut());
  await page.waitForTimeout(300);

  // Test Guest login
  await page.click('#auth-guest');
  await page.waitForTimeout(300);
  session = await page.evaluate(() => JSON.parse(localStorage.getItem('wordloom-session') || 'null'));
  if (!session.isGuest || session.name !== 'Guest reader') throw new Error('FAIL: Guest login failed');
  console.log('   ✓ Guest login works.');

  // 6. Custom Books Page Buttons & Arrow Removal
  console.log('\n[TEST 7] Custom Books Page Buttons & Arrow Removal...');
  await page.evaluate(() => window.showView('customBook'));
  await page.waitForTimeout(300);

  const customBookCheck = await page.evaluate(() => {
    const importBtn = document.querySelector('#import-local-book');
    const catalogBtn = document.querySelector('#download-full-catalog');
    const backBtn = document.querySelector('#custom-book-view .back-link');
    const sourceLinks = Array.from(document.querySelectorAll('#custom-book-view .source-card small')).map(el => el.innerText.trim());

    const getStyle = el => {
      const c = window.getComputedStyle(el);
      return {
        text: el.innerText.trim(),
        borderColor: c.borderTopColor,
        borderWidth: c.borderTopWidth,
        borderRadius: c.borderRadius,
        backgroundColor: c.backgroundColor,
        color: c.color
      };
    };

    return {
      importBtn: getStyle(importBtn),
      catalogBtn: getStyle(catalogBtn),
      backBtn: getStyle(backBtn),
      sourceLinks
    };
  });

  console.log('   Custom Books Import Button:', customBookCheck.importBtn);
  console.log('   Custom Books Catalog Button:', customBookCheck.catalogBtn);
  console.log('   Custom Books Back Button:', customBookCheck.backBtn);
  console.log('   Custom Books Source Links:', customBookCheck.sourceLinks);

  const expectedBorder = 'rgb(139, 90, 43)';
  const expectedBg = 'rgb(250, 244, 235)';
  const expectedColor = 'rgb(92, 64, 51)';
  const expectedRadius = '6px';

  // Check buttons
  [customBookCheck.importBtn, customBookCheck.catalogBtn, customBookCheck.backBtn].forEach((btn, idx) => {
    if (btn.text.includes('→') || btn.text.includes('←')) {
      throw new Error(`FAIL: Button index ${idx} contains arrow: ${btn.text}`);
    }
    if (btn.borderColor !== expectedBorder) {
      throw new Error(`FAIL: Button index ${idx} border color is ${btn.borderColor}, expected ${expectedBorder}`);
    }
    if (btn.backgroundColor !== expectedBg) {
      throw new Error(`FAIL: Button index ${idx} background color is ${btn.backgroundColor}, expected ${expectedBg}`);
    }
    if (btn.borderRadius !== expectedRadius) {
      throw new Error(`FAIL: Button index ${idx} border radius is ${btn.borderRadius}, expected ${expectedRadius}`);
    }
    if (btn.color !== expectedColor) {
      throw new Error(`FAIL: Button index ${idx} text color is ${btn.color}, expected ${expectedColor}`);
    }
  });

  // Check source links have no arrows
  customBookCheck.sourceLinks.forEach(linkText => {
    if (linkText.includes('→') || linkText.includes('←')) {
      throw new Error(`FAIL: Source link contains arrow: ${linkText}`);
    }
  });

  await page.screenshot({ path: path.resolve(__dirname, 'recreated_custom_books.png') });
  console.log('   ✓ Custom books buttons and links have clean brown natural frame styling and NO arrows!');

  console.log('\n======================================================');
  console.log('ALL AUTHENTICATION & CUSTOM BOOKS TESTS PASSED (100%)!');
  console.log('======================================================\n');

  if (errors.length > 0) {
    console.warn('⚠️ Console errors noted during test run:', errors);
  }

  await browser.close();
})().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
