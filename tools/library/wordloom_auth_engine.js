
/* === WORDLOOM CLIENT-SIDE AUTH ENGINE & CONTROLLER === */
let authCurrentMode = 'signin';

const WordloomAuth = {
  USERS_KEY: 'wordloom-users',
  SESSION_KEY: 'wordloom-session',

  init() {
    const existing = this.getUsers();
    if (!existing || existing.length === 0) {
      const defaultUsers = [
        {
          id: 'usr_demo',
          email: 'demo@wordloom.com',
          passwordHash: this.hash('wordloom123'),
          name: 'Demo Reader',
          language: 'ar',
          createdAt: Date.now()
        },
        {
          id: 'usr_ahmed',
          email: 'ahmed@wordloom.com',
          passwordHash: this.hash('wordloom123'),
          name: 'Ahmed',
          language: 'ar',
          createdAt: Date.now()
        }
      ];
      localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
    }
  },

  hash(pwd) {
    let hash = 0x811c9dc5;
    const str = 'wl_salt_' + pwd;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16);
  },

  getUsers() {
    try {
      const u = JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]');
      return Array.isArray(u) ? u : [];
    } catch {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  getSession() {
    try {
      const s = localStorage.getItem(this.SESSION_KEY);
      if (!s) return null;
      if (s === 'active') return { name: 'Demo Reader', email: 'demo@wordloom.com', language: 'ar' };
      return JSON.parse(s);
    } catch {
      return null;
    }
  },

  login(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPwd = (password || '').trim();
    if (!cleanId) throw new Error('Please enter your email or username.');
    if (!cleanPwd) throw new Error('Please enter your password.');

    const users = this.getUsers();
    const user = users.find(u =>
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    );

    if (!user) {
      throw new Error('Account not found. Switch to "Create Account" or use demo@wordloom.com');
    }
    if (user.passwordHash !== this.hash(cleanPwd)) {
      throw new Error('Incorrect password. Please try again.');
    }

    const session = {
      token: 'wl_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language || 'ar',
      loggedInAt: Date.now()
    };
    this.createSession(session);
    return session;
  },

  register(data) {
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();
    const language = data.language || 'ar';

    if (!name) throw new Error('Please enter your full name.');
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = this.getUsers();
    if (users.some(u => u.email && u.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      email,
      passwordHash: this.hash(password),
      name,
      language,
      createdAt: Date.now()
    };
    users.push(newUser);
    this.saveUsers(users);

    const session = {
      token: 'wl_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      language: newUser.language,
      loggedInAt: Date.now()
    };
    this.createSession(session);
    return session;
  },

  socialLogin(provider) {
    const isGoogle = provider === 'google';
    const mockEmail = isGoogle ? 'reader.google@wordloom.com' : 'reader.github@wordloom.com';
    const mockName = isGoogle ? 'Google Reader' : 'GitHub Reader';
    const users = this.getUsers();
    let user = users.find(u => u.email === mockEmail);
    if (!user) {
      user = {
        id: 'usr_' + provider + '_' + Date.now().toString(36),
        email: mockEmail,
        passwordHash: this.hash('oauth_social_login'),
        name: mockName,
        language: 'ar',
        provider,
        createdAt: Date.now()
      };
      users.push(user);
      this.saveUsers(users);
    }
    const session = {
      token: 'wl_' + provider + '_' + Date.now().toString(36),
      userId: user.id,
      email: user.email,
      name: user.name,
      language: user.language || 'ar',
      provider,
      loggedInAt: Date.now()
    };
    this.createSession(session);
    if (typeof showToast === 'function') showToast(`Signed in with ${isGoogle ? 'Google' : 'GitHub'}!`);
    return session;
  },

  guestLogin() {
    const session = {
      token: 'wl_guest_' + Date.now().toString(36),
      userId: 'usr_guest',
      email: 'guest@wordloom.local',
      name: 'Guest reader',
      language: localStorage.getItem('wordloom-language') || 'ar',
      isGuest: true,
      loggedInAt: Date.now()
    };
    this.createSession(session);
    return session;
  },

  loginSocial(provider) {
    return this.socialLogin(provider);
  },

  loginGuest() {
    return this.guestLogin();
  },

  createSession(session) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    localStorage.setItem('wordloom-welcome-complete', 'true');
    if (session.language) {
      localStorage.setItem('wordloom-language', session.language);
      motherLanguage = session.language;
    }
  },

  signOut() {
    localStorage.removeItem(this.SESSION_KEY);
    syncAuthUI();
    const form = document.querySelector('#auth-form');
    if (form) form.reset();
    setAuthMode('signin');
    clearAuthError();
    if (typeof showToast === 'function') showToast('Signed out of Wordloom.');
  }
};

WordloomAuth.init();

function showAuthError(msg) {
  const wrap = document.querySelector('#auth-error-wrap');
  const errorEl = document.querySelector('#auth-error');
  if (wrap && errorEl) {
    errorEl.textContent = msg;
    wrap.classList.remove('hidden');
  }
}

function clearAuthError() {
  const wrap = document.querySelector('#auth-error-wrap');
  const errorEl = document.querySelector('#auth-error');
  if (wrap && errorEl) {
    errorEl.textContent = '';
    wrap.classList.add('hidden');
  }
}

function setAuthMode(mode) {
  authCurrentMode = mode;
  const tabSignin = document.querySelector('#auth-tab-signin');
  const tabSignup = document.querySelector('#auth-tab-signup');
  const nameGroup = document.querySelector('#auth-name-group');
  const langGroup = document.querySelector('#auth-language-group');
  const demoHint = document.querySelector('#auth-demo-hint');
  const cardTitle = document.querySelector('#auth-card-title');
  const cardSub = document.querySelector('#auth-card-sub');
  const submitBtn = document.querySelector('#auth-submit-btn');
  const emailInput = document.querySelector('#auth-email');
  const passwordInput = document.querySelector('#auth-password');

  clearAuthError();

  if (mode === 'signin') {
    tabSignin?.classList.add('active');
    tabSignin?.setAttribute('aria-selected', 'true');
    tabSignup?.classList.remove('active');
    tabSignup?.setAttribute('aria-selected', 'false');
    nameGroup?.classList.add('hidden');
    langGroup?.classList.add('hidden');
    demoHint?.classList.remove('hidden');
    if (nameGroup) nameGroup.style.display = 'none';
    if (langGroup) langGroup.style.display = 'none';
    if (demoHint) demoHint.style.display = 'flex';
    if (cardTitle) cardTitle.textContent = 'Welcome back';
    if (cardSub) cardSub.textContent = 'Sign in to resume your reading journey';
    if (submitBtn) submitBtn.textContent = 'Sign In';
    if (emailInput) {
      emailInput.setAttribute('autocomplete', 'username');
      if (!emailInput.value) emailInput.value = 'demo@wordloom.com';
    }
    if (passwordInput) {
      passwordInput.setAttribute('autocomplete', 'current-password');
      if (!passwordInput.value) passwordInput.value = 'wordloom123';
    }
  } else {
    tabSignup?.classList.add('active');
    tabSignup?.setAttribute('aria-selected', 'true');
    tabSignin?.classList.remove('active');
    tabSignin?.setAttribute('aria-selected', 'false');
    nameGroup?.classList.remove('hidden');
    langGroup?.classList.remove('hidden');
    demoHint?.classList.add('hidden');
    if (nameGroup) nameGroup.style.display = 'flex';
    if (langGroup) langGroup.style.display = 'flex';
    if (demoHint) demoHint.style.display = 'none';
    if (cardTitle) cardTitle.textContent = 'Create your account';
    if (cardSub) cardSub.textContent = 'Start reading stories crafted for your level';
    if (submitBtn) submitBtn.textContent = 'Create Account';
    if (emailInput) {
      emailInput.setAttribute('autocomplete', 'email');
      if (emailInput.value === 'demo@wordloom.com') emailInput.value = '';
    }
    if (passwordInput) {
      passwordInput.setAttribute('autocomplete', 'new-password');
      if (passwordInput.value === 'wordloom123') passwordInput.value = '';
    }
  }
}

function updateUserProfileUI(session) {
  const userNameEl = document.querySelector('#account-user-name');
  const userEmailEl = document.querySelector('#account-user-email');
  const avatarEl = document.querySelector('#account-avatar');
  if (session) {
    if (userNameEl) userNameEl.textContent = session.name || 'Reader';
    if (userEmailEl) userEmailEl.textContent = session.email || (session.isGuest ? 'Guest Session' : '');
    if (avatarEl) avatarEl.textContent = (session.name ? session.name[0] : 'R').toUpperCase();
  }
}

function openWelcome() { }

function unlockApp(session) {
  WordloomAuth.createSession(session);
  syncAuthUI();
  const motherLangSelect = document.querySelector('#mother-language');
  if (motherLangSelect && motherLanguage) {
    motherLangSelect.value = motherLanguage;
  }
  openWelcome();
}

function syncAuthUI() {
  const session = WordloomAuth.getSession();
  const navRoot = document.querySelector('#react-nav-root');
  if (session) {
    authScreen?.classList.add('hidden');
    appShell?.classList.remove('auth-locked');
    if (navRoot) navRoot.style.display = '';
    updateUserProfileUI(session);
  } else {
    authScreen?.classList.remove('hidden');
    appShell?.classList.add('auth-locked');
    if (navRoot) navRoot.style.display = 'none';
  }
}

function submitAuth(event) {
  if (event) event.preventDefault();
  clearAuthError();

  const emailInput = document.querySelector('#auth-email');
  const passwordInput = document.querySelector('#auth-password');
  const nameInput = document.querySelector('#auth-name');
  const langSelect = document.querySelector('#auth-language');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const language = langSelect ? langSelect.value : 'ar';

  try {
    let session;
    if (authCurrentMode === 'signup') {
      session = WordloomAuth.register({ name, email, password, language });
    } else {
      session = WordloomAuth.login(email, password);
    }
    unlockApp(session);
  } catch (err) {
    showAuthError(err.message || 'Authentication failed.');
  }
}

syncAuthUI();
