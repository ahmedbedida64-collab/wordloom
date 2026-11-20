const SoundReader = {
  activeUtterances: new Set(),
  _utteranceBuffer: [], // Persistent FIFO 32-utterance buffer defeating V8 GC drops
  activeTimeout: null,
  activeAudioEl: null,
  isSpeaking: false,
  currentId: 0,
  currentVoiceProfile: (typeof localStorage !== 'undefined' && ['studio-human', 'british-classic'].includes(localStorage.getItem('wordloom-voice')) ? localStorage.getItem('wordloom-voice') : 'studio-human'),
  _keepaliveInterval: null,

  _retainUtterance(u) {
    if (!u) return;
    this.activeUtterances.add(u);
    this._utteranceBuffer.push(u);
    if (this._utteranceBuffer.length > 32) {
      this._utteranceBuffer.shift();
    }
  },

  // ─── Multilingual Neural Voice Registry ──────────────────────────
  _voicesByLang: {},
  _voiceReady: false,

  // Refined High-Aesthetic Voice Priority Lists (Studio Human & British Classic)
  _VOICE_PRIORITY_STUDIO: [
    'Microsoft Aria Online (Natural) - English (United States)',
    'Google US English',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Ava (Premium)',
    'Ava (Enhanced)',
    'Samantha (Premium)',
    'Samantha (Enhanced)',
    'Samantha',
    'Alex'
  ],

  _VOICE_PRIORITY_BRITISH: [
    'Google UK English Female',
    'Google UK English Male',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Libby Online (Natural) - English (United Kingdom)',
    'Serena (Enhanced)',
    'Serena',
    'Daniel (Enhanced)',
    'Daniel',
    'Oliver (Enhanced)',
    'Oliver',
    'Stephanie',
    'Fiona'
  ],

  // Backwards compatibility priority list getter
  get _VOICE_PRIORITY_EN() {
    return this.currentVoiceProfile === 'british-classic' ? this._VOICE_PRIORITY_BRITISH : this._VOICE_PRIORITY_STUDIO;
  },

  // Arabic Neural Priority: Google Arabic -> MS Azure Natural Arabic -> Apple Siri / macOS
  _VOICE_PRIORITY_AR: [
    'Google العربية',
    'Microsoft Shakir Online (Natural) - Arabic (Egypt)',
    'Microsoft Salma Online (Natural) - Arabic (Egypt)',
    'Microsoft Hamed Online (Natural) - Arabic (Saudi Arabia)',
    'Microsoft Zariyah Online (Natural) - Arabic (Saudi Arabia)',
    'Maged',
    'Tarik',
    'Laila',
    'Mariam'
  ],

  // Low-grade synthetic and novelty synthesizers to discard
  _VOICE_REJECT: [
    'espeak', 'festival', 'flite', 'CMU', 'MBROLA', 'pico', 'SpeechSynthesis',
    'albert', 'bad news', 'zarvox', 'whisper', 'boing', 'bells'
  ],

  get _bestVoice() {
    return this._resolveVoice('en');
  },

  setVoiceProfile(profile) {
    const valid = ['studio-human', 'british-classic'];
    this.currentVoiceProfile = valid.includes(profile) ? profile : 'studio-human';
    this._voicesByLang = {};
  },

  previewVoice(profile = null) {
    const prof = profile || this.currentVoiceProfile || 'studio-human';
    this.setVoiceProfile(prof);
    const samples = {
      'british-classic': 'Welcome to Wordloom. Enjoy classic literary diction and refined pronunciation.',
      'studio-human': 'Welcome to Wordloom. Clear, authentic diction designed for thoughtful language learners.'
    };
    const sampleText = samples[prof] || samples['studio-human'];
    const btn = document.querySelector('#preview-voice-btn');
    const label = document.querySelector('#preview-voice-text');
    const icon = document.querySelector('#preview-voice-icon');
    if (btn) btn.classList.add('speaking');
    if (label) label.textContent = 'Playing sample…';
    if (icon) icon.textContent = '🔊';

    const onComplete = () => {
      if (btn) btn.classList.remove('speaking');
      if (label) label.textContent = 'Test Voice';
      if (icon) icon.textContent = '🔊';
    };

    return this.speak(sampleText, {
      lang: prof === 'british-classic' ? 'en-GB' : 'en-US',
      onEnd: onComplete,
      onError: onComplete,
      timeoutMs: 4500
    });
  },

  _resolveVoice(targetLang = 'en', profile = null) {
    const langKey = targetLang.toLowerCase().slice(0, 2);
    const activeProfile = profile || this.currentVoiceProfile || 'studio-human';
    const cacheKey = `${langKey}_${activeProfile}`;
    if (this._voicesByLang[cacheKey]) return this._voicesByLang[cacheKey];

    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const isAr = langKey === 'ar';
    if (isAr) {
      const langRegex = /^ar[-_]?/i;
      for (const name of this._VOICE_PRIORITY_AR) {
        const found = voices.find(v => v.name === name && langRegex.test(v.lang));
        if (found) { this._voicesByLang[cacheKey] = found; return found; }
      }
      for (const name of this._VOICE_PRIORITY_AR) {
        const found = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()) && langRegex.test(v.lang));
        if (found) { this._voicesByLang[cacheKey] = found; return found; }
      }
      const anyAr = voices.find(v => langRegex.test(v.lang));
      if (anyAr) { this._voicesByLang[cacheKey] = anyAr; return anyAr; }
      return voices[0] || null;
    }

    let priorityList = this._VOICE_PRIORITY_STUDIO;
    let genderOrStyleRegex = /(aria|jenny|ava|samantha|natural|online|enhanced|premium)/i;
    let langRegex = /^en[-_]?/i;

    if (activeProfile === 'british-classic') {
      priorityList = this._VOICE_PRIORITY_BRITISH;
      genderOrStyleRegex = /(uk|gb|british|sonia|ryan|libby|serena|daniel|oliver|fiona)/i;
      langRegex = /^en[-_](gb|uk)/i;
    }

    // 1st pass: exact name match
    for (const name of priorityList) {
      const found = voices.find(v => v.name === name && (activeProfile === 'british-classic' ? langRegex.test(v.lang) : /^en[-_]?/i.test(v.lang)));
      if (found) { this._voicesByLang[cacheKey] = found; return found; }
    }

    // 2nd pass: partial name match
    for (const name of priorityList) {
      const found = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()) && (activeProfile === 'british-classic' ? langRegex.test(v.lang) : /^en[-_]?/i.test(v.lang)));
      if (found) { this._voicesByLang[cacheKey] = found; return found; }
    }

    // 3rd pass: in-language voices filtered by rejection list and matching gender/style
    const enVoices = voices.filter(v =>
      (activeProfile === 'british-classic' ? langRegex.test(v.lang) : /^en[-_]?/i.test(v.lang)) &&
      !this._VOICE_REJECT.some(bad => v.name.toLowerCase().includes(bad.toLowerCase()))
    );

    const matchedStyle = enVoices.find(v => genderOrStyleRegex.test(v.name));
    if (matchedStyle) { this._voicesByLang[cacheKey] = matchedStyle; return matchedStyle; }

    // 4th pass: any neural / natural in English
    const neural = enVoices.find(v => /(online|natural|neural|wavenet|enhanced|premium)/i.test(v.name));
    if (neural) { this._voicesByLang[cacheKey] = neural; return neural; }

    if (enVoices.length > 0) { this._voicesByLang[cacheKey] = enVoices[0]; return enVoices[0]; }

    // Fallback: any voice matching target language
    const anyInLang = voices.find(v => /^en[-_]?/i.test(v.lang));
    if (anyInLang) { this._voicesByLang[cacheKey] = anyInLang; return anyInLang; }

    // Last resort
    const fallback = voices[0] || null;
    this._voicesByLang[cacheKey] = fallback;
    return fallback;
  },

  // ─── Humanised Prosody & Emotional Cadence Engine ────────────────
  _prosodyFor(text, voice, baseOpts = {}) {
    const raw = String(text || '').trim();
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    const isNeuralLike = voice && /(google|microsoft|aria|emma|jenny|ana|guy|shakir|salma|samantha|ava|zoe|karen|siri|online|natural|enhanced|premium|wavenet)/i.test(voice.name);
    const isSingleWord = baseOpts.isSingleWord || (wordCount <= 1 && !/[,.!?;—]/.test(raw));
    const isBritish = this.currentVoiceProfile === 'british-classic';
    const isStudio = !isBritish;

    // Emotional contour detection
    const isQuestion = /\?\s*$/.test(raw) || /\?\s*["”]/.test(raw);
    const isExclamation = /!\s*$/.test(raw) || /!\s*["”]/.test(raw);
    const isDialogue = /^["“']/.test(raw) && /["”']$/.test(raw);

    // Natural speech pacing:
    let rate;
    if (baseOpts.rate !== undefined) {
      rate = baseOpts.rate;
    } else if (isSingleWord) {
      rate = isBritish ? 0.88 : (isNeuralLike ? 0.90 : 0.88);
    } else {
      rate = isNeuralLike
        ? (isBritish ? 0.90 : 0.94)
        : (isBritish ? 0.88 : 0.92);
      if (isDialogue) rate = Math.min(rate, 0.93);
    }

    // Natural pitch contour:
    let pitch;
    if (baseOpts.pitch !== undefined) {
      pitch = baseOpts.pitch;
    } else if (isBritish) {
      pitch = isNeuralLike ? 1.02 : 1.0;
    } else {
      pitch = 1.0;
    }

    let volume = baseOpts.volume !== undefined ? baseOpts.volume : 1.0;

    // Static emotion archetype
    let emotion = baseOpts.emotion;
    if (!emotion) {
      if (isBritish) emotion = 'dramatic';
      else emotion = 'enthusiastic';
    } else {
      emotion = String(emotion).toLowerCase();
      if (emotion === 'reflective') emotion = 'calm';
      if (emotion === 'storyteller') emotion = 'warm';
      if (emotion === 'expressive') emotion = 'dramatic';
      if (emotion === 'active') emotion = 'enthusiastic';

      if (emotion === 'calm') {
        rate = Math.round(rate * 0.94 * 1000) / 1000;
        pitch = Math.round(pitch * 0.94 * 1000) / 1000;
        volume = Math.min(volume, 0.95);
      } else if (emotion === 'enthusiastic') {
        rate = Math.round(rate * 1.05 * 1000) / 1000;
        pitch = Math.round(pitch * 1.05 * 1000) / 1000;
      } else if (emotion === 'dramatic') {
        rate = Math.round(rate * 0.92 * 1000) / 1000;
        pitch = Math.round(pitch * 1.06 * 1000) / 1000;
      } else if (emotion === 'warm') {
        rate = Math.round(rate * 0.98 * 1000) / 1000;
        pitch = Math.round(pitch * 1.02 * 1000) / 1000;
      }
    }

    // Apply natural emotional inflection
    if (isQuestion) {
      pitch = Math.min(1.20, pitch * 1.04); // subtle inquisitive rising terminal lilt (+4%)
    } else if (isExclamation) {
      pitch = Math.min(1.20, pitch * 1.03); // energetic, engaging lift (+3%)
    }

    // Safe browser clamping
    rate = Math.max(0.6, Math.min(1.5, rate));
    pitch = Math.max(0.7, Math.min(1.20, pitch));
    volume = Math.max(0.1, Math.min(1.0, volume));

    return { rate, pitch, volume, emotion };
  },

  _numberToWords(num) {
    if (num === 0) return 'zero';
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    function helper(n) {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
      if (n < 1000) {
        const rest = n % 100;
        return ones[Math.floor(n / 100)] + ' hundred' + (rest !== 0 ? ' ' + helper(rest) : '');
      }
      if (n < 1000000) {
        const rest = n % 1000;
        return helper(Math.floor(n / 1000)) + ' thousand' + (rest !== 0 ? ' ' + helper(rest) : '');
      }
      if (n < 1000000000) {
        const rest = n % 1000000;
        return helper(Math.floor(n / 1000000)) + ' million' + (rest !== 0 ? ' ' + helper(rest) : '');
      }
      return String(n);
    }
    return helper(num);
  },

  _numberToOrdinal(num) {
    const words = this._numberToWords(num);
    const parts = words.split(/[\s-]/);
    const lastPart = parts[parts.length - 1];
    const prefix = words.slice(0, words.length - lastPart.length);
    const ordMap = {
      one: 'first', two: 'second', three: 'third', four: 'fourth', five: 'fifth',
      six: 'sixth', seven: 'seventh', eight: 'eighth', nine: 'ninth', ten: 'tenth',
      eleven: 'eleventh', twelve: 'twelfth', thirteen: 'thirteenth', fourteen: 'fourteenth',
      fifteen: 'fifteenth', sixteen: 'sixteenth', seventeen: 'seventeenth', eighteen: 'eighteenth',
      nineteen: 'nineteenth', twenty: 'twentieth', thirty: 'thirtieth', forty: 'fortieth',
      fifty: 'fiftieth', sixty: 'sixtieth', seventy: 'seventieth', eighty: 'eightieth',
      ninety: 'ninetieth', hundred: 'hundredth', thousand: 'thousandth', million: 'millionth'
    };
    if (ordMap[lastPart]) {
      return prefix + ordMap[lastPart];
    }
    return words + 'th';
  },

  _yearToWords(year) {
    const y = parseInt(year, 10);
    if (isNaN(y) || y < 1000 || y > 2099) return this._numberToWords(y);
    if (y === 2000) return 'two thousand';
    if (y > 2000 && y < 2010) return 'two thousand ' + this._numberToWords(y % 100);
    const firstTwo = Math.floor(y / 100);
    const lastTwo = y % 100;
    const firstWord = this._numberToWords(firstTwo);
    if (lastTwo === 0) return firstWord + ' hundred';
    if (lastTwo < 10) return firstWord + ' oh ' + this._numberToWords(lastTwo);
    return firstWord + ' ' + this._numberToWords(lastTwo);
  },

  // ─── Natural Pronunciation & Pause Pre-processor ─────────────────
  _naturalise(text) {
    if (!text) return '';
    let t = String(text);

    // If Arabic, preserve letters, tashkeel, and clean punctuation
    if (/[\u0600-\u06FF]/.test(t)) {
      return t
        .replace(/\s*—\s*/g, '، ')
        .replace(/;\s*/g, '، ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Normalize typographic curly apostrophes to standard straight apostrophe
    t = t.replace(/[’‘ʼ]/g, "'");

    // Clean surrounding decorative quotes for single words
    if (/^["'“][^"'“”]+["'”]$/.test(t.trim())) {
      t = t.trim().slice(1, -1);
    }

    // Archaic 19th-century Gutenberg poetic contractions
    t = t
      .replace(/\bo'er\b/gi, m => m[0] === 'O' ? 'Over' : 'over')
      .replace(/\bne'er\b/gi, m => m[0] === 'N' ? 'Never' : 'never')
      .replace(/(^|[^\w])'tis\b/gi, (m, p) => p + (m.includes('T') ? 'It is' : 'it is'))
      .replace(/(^|[^\w])'twas\b/gi, (m, p) => p + (m.includes('T') ? 'It was' : 'it was'))
      .replace(/(^|[^\w])'twill\b/gi, (m, p) => p + (m.includes('T') ? 'It will' : 'it will'))
      .replace(/(^|[^\w])'twould\b/gi, (m, p) => p + (m.includes('T') ? 'It would' : 'it would'))
      .replace(/\be'en\b/gi, m => m[0] === 'E' ? 'Even' : 'even');

    t = t.replace(/\b([a-zA-Z]{3,})'d\b/g, (match, base) => {
      if (/^(don|can|won|ain|didn|wouldn|couldn|shouldn|hadn|hasn|haven|isn|aren|wasn|weren)$/i.test(base)) {
        return match;
      }
      return base.endsWith('e') ? base + 'd' : base + 'ed';
    });

    // Roman numerals in titles and monarchs
    const romanCardinals = {
      I: 'One', II: 'Two', III: 'Three', IV: 'Four', V: 'Five',
      VI: 'Six', VII: 'Seven', VIII: 'Eight', IX: 'Nine', X: 'Ten',
      XI: 'Eleven', XII: 'Twelve', XIII: 'Thirteen', XIV: 'Fourteen', XV: 'Fifteen',
      XVI: 'Sixteen', XVII: 'Seventeen', XVIII: 'Eighteen', XIX: 'Nineteen', XX: 'Twenty'
    };
    const romanOrdinals = {
      I: 'First', II: 'Second', III: 'Third', IV: 'Fourth', V: 'Fifth',
      VI: 'Sixth', VII: 'Seventh', VIII: 'Eighth', IX: 'Ninth', X: 'Tenth',
      XI: 'Eleventh', XII: 'Twelfth', XIII: 'Thirteenth', XIV: 'Fourteenth', XV: 'Fifteenth',
      XVI: 'Sixteenth', XVII: 'Seventeenth', XVIII: 'Eighteenth', XIX: 'Nineteenth', XX: 'Twentieth'
    };
    t = t.replace(/\b(Chapter|Part|Act|Scene|Book|Volume|Section)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\b/gi, (m, title, num) => {
      return title + ' ' + (romanCardinals[num.toUpperCase()] || num);
    });
    t = t.replace(/\b(King|Queen|Emperor|Pope|Prince|Princess|Henry|Louis|Edward|George|Elizabeth|Charles|Napoleon|James|William|Richard|Alexander|Philip|Mary)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI)\b/g, (m, monarch, num) => {
      return monarch + ' the ' + (romanOrdinals[num.toUpperCase()] || num);
    });

    // Expand common literary abbreviations & honorifics
    t = t
      .replace(/\bDr\.(?!\w)/gi, 'Doctor ')
      .replace(/\bMr\.(?!\w)/gi, 'Mister ')
      .replace(/\bMrs\.(?!\w)/gi, 'Missus ')
      .replace(/\bMs\.(?!\w)/gi, 'Mizz ')
      .replace(/\bProf\.(?!\w)/gi, 'Professor ')
      .replace(/\bSt\.(?!\w)/gi, 'Saint ')
      .replace(/\bCapt\.(?!\w)/gi, 'Captain ')
      .replace(/\bCol\.(?!\w)/gi, 'Colonel ')
      .replace(/\bGen\.(?!\w)/gi, 'General ')
      .replace(/\bMaj\.(?!\w)/gi, 'Major ')
      .replace(/\bSgt\.(?!\w)/gi, 'Sergeant ')
      .replace(/\bRev\.(?!\w)/gi, 'Reverend ')
      .replace(/\bHon\.(?!\w)/gi, 'Honorable ')
      .replace(/\bMt\.\s+([A-Z])/g, 'Mount $1')
      .replace(/\bFt\.\s+([A-Z])/g, 'Fort $1');

    // Scholarly & Latin abbreviations
    t = t
      .replace(/\betc\.(?!\w)/gi, 'etcetera')
      .replace(/\be\.g\.,?\s*/gi, 'for example, ')
      .replace(/\bi\.e\.,?\s*/gi, 'that is, ')
      .replace(/\bvs\.(?!\w)/gi, 'versus ')
      .replace(/\bet al\.(?!\w)/gi, 'and others')
      .replace(/\bibid\.(?!\w)/gi, 'in the same place')
      .replace(/\bca\.\s*(\d+)/gi, 'circa $1')
      .replace(/\bNo\.\s*(\d+)/gi, 'Number $1')
      .replace(/\bVol\.\s*(\d+)/gi, 'Volume $1')
      .replace(/\bpp\.\s*(\d+)/gi, 'pages $1')
      .replace(/\bp\.\s*(\d+)/gi, 'page $1');

    // Acronyms & initialisms
    t = t
      .replace(/\bCEFR\b/g, 'C. E. F. R.')
      .replace(/\bAPI\b/g, 'A. P. I.')
      .replace(/\bURL\b/g, 'U. R. L.')
      .replace(/\bHTML\b/g, 'H. T. M. L.')
      .replace(/\bUI\b/g, 'U. I.')
      .replace(/\b([A-C])([1-2])\b/g, (match, letter, digit) => {
        const digitWords = { '1': 'one', '2': 'two' };
        return letter + ' ' + (digitWords[digit] || digit);
      });

    // Currencies, fractions & symbols
    t = t
      .replace(/\$(\d+(\.\d{2})?)/g, '$1 dollars')
      .replace(/£(\d+(\.\d{2})?)/g, '$1 pounds')
      .replace(/€(\d+(\.\d{2})?)/g, '$1 euros')
      .replace(/\b1\/2\b/g, 'one half')
      .replace(/\b1\/4\b/g, 'one quarter')
      .replace(/\b3\/4\b/g, 'three quarters')
      .replace(/\b1\/3\b/g, 'one third')
      .replace(/\b2\/3\b/g, 'two thirds')
      .replace(/\s*&\s*/g, ' and ')
      .replace(/(\d+)\s*%/g, '$1 percent')
      .replace(/\s*@\s*/g, ' at ')
      .replace(/#(\d+)/g, 'number $1');

    // Ordinals (1st, 2nd, 3rd, 21st, 100th)
    t = t.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (match, num) => {
      const n = parseInt(num, 10);
      return isNaN(n) ? match : this._numberToOrdinal(n);
    });

    // Decimals (e.g. 3.14 -> three point one four)
    t = t.replace(/\b(\d+)\.(\d+)\b/g, (match, whole, fraction) => {
      if (fraction.length > 4) return match;
      const wholeWords = this._numberToWords(parseInt(whole, 10));
      const fracDigits = fraction.split('').map(d => this._numberToWords(parseInt(d, 10))).join(' ');
      return wholeWords + ' point ' + fracDigits;
    });

    // 4-digit historical years (1000 to 2099)
    t = t.replace(/\b(1[0-9]{3}|20[0-9]{2})\b/g, match => this._yearToWords(match));

    // Standalone cardinal numbers (0 to 999,999,999)
    t = t.replace(/\b\d+\b/g, match => {
      const n = parseInt(match, 10);
      return isNaN(n) ? match : this._numberToWords(n);
    });

    // Natural pause conditioning
    t = t
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s*--\s*/g, ', ')
      .replace(/;\s*/g, ', ')
      .replace(/\.\.\./g, '…')
      .replace(/:\s+/g, ', ')
      .replace(/\s*\(([^)]+)\)\s*/g, ', $1, ')
      .replace(/,(\S)/g, ', $1')
      .replace(/\s*,\s*,+/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();

    // If text contains no spoken letters or digits, return empty string
    if (!/[a-zA-Z0-9\u0600-\u06FF]/.test(t)) {
      return '';
    }

    return t;
  },

  stopAll() {
    this.currentId++;
    if (this._keepaliveInterval) {
      clearInterval(this._keepaliveInterval);
      this._keepaliveInterval = null;
    }
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }
    if (this.activeAudioEl) {
      try {
        this.activeAudioEl.pause();
        this.activeAudioEl.removeAttribute('src');
        this.activeAudioEl.load();
      } catch (e) {}
      this.activeAudioEl = null;
    }
    if (typeof feedbackTimers !== 'undefined' && feedbackTimers) {
      feedbackTimers.forEach(timer => clearTimeout(timer));
      feedbackTimers.clear();
    }
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
      } catch (e) {}
    }
    this.activeUtterances.clear();
    this.isSpeaking = false;
    this.resetSpeakingUI();
    if (typeof SoundFX !== 'undefined' && SoundFX.unduck) {
      try { SoundFX.unduck(100); } catch (e) {}
    }
  },

  resetSpeakingUI() {
    if (typeof document === 'undefined') return;
    const playBtn = document.querySelector('#ttw-play-btn');
    const playLabel = document.querySelector('#ttw-play-label');
    if (playBtn) playBtn.classList.remove('ttw-speaking');
    if (playLabel) playLabel.textContent = 'Tap to listen';

    const phraseBtn = document.querySelector('#ttw-phrase-btn');
    const phraseLabel = document.querySelector('#ttw-phrase-label');
    if (phraseBtn) phraseBtn.classList.remove('ttw-speaking');
    if (phraseLabel) phraseLabel.textContent = 'Listen to full phrase';

    const sentenceEl = document.querySelector('#ttw-sentence');
    if (sentenceEl) sentenceEl.classList.remove('ttw-sentence-speaking');

    const previewBtn = document.querySelector('#preview-voice-btn');
    const previewLabel = document.querySelector('#preview-voice-text');
    if (previewBtn) previewBtn.classList.remove('speaking');
    if (previewLabel) previewLabel.textContent = 'Test Voice';

    document.querySelectorAll('.review-listen.speaking, .speak-word.speaking, [data-spell-speak].speaking, .sound-button.speaking, [data-speak].speaking').forEach(el => {
      el.classList.remove('speaking');
    });
  },

  speak(text, options = {}) {
    if (!text || !('speechSynthesis' in window)) {
      if (typeof options.onEnd === 'function') {
        try { options.onEnd(); } catch (e) {}
      }
      return null;
    }

    this.stopAll();
    const myId = this.currentId;

    const isArabic = /[\u0600-\u06FF]/.test(text);
    const targetLang = options.lang || (isArabic ? 'ar' : (this.currentVoiceProfile === 'british-classic' ? 'en-GB' : 'en-US'));
    const voice = this._resolveVoice(targetLang);

    if (speechSynthesis.paused) {
      try { speechSynthesis.resume(); } catch (e) {}
    }

    try {
      const cleanText = this._naturalise(text);
      if (!cleanText) {
        this.resetSpeakingUI();
        if (typeof options.onEnd === 'function') {
          try { options.onEnd(); } catch (e) {}
        }
        return null;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = targetLang;
      }

      const prosody = this._prosodyFor(cleanText, voice, options);

      utterance.rate   = options.rate !== undefined ? options.rate : prosody.rate;
      utterance.pitch  = options.pitch !== undefined ? options.pitch : prosody.pitch;
      utterance.volume = options.volume !== undefined ? options.volume : prosody.volume;

      this._retainUtterance(utterance);
      this.isSpeaking = true;

      if (typeof SoundFX !== 'undefined' && SoundFX.duck) {
        try { SoundFX.duck(0.25, 120); } catch (e) {}
      }

      const cleanup = (isError = false, errorEvt = null) => {
        if (this.currentId !== myId) return;

        if (this._keepaliveInterval) {
          clearInterval(this._keepaliveInterval);
          this._keepaliveInterval = null;
        }
        this.activeUtterances.delete(utterance);
        if (this.activeTimeout) {
          clearTimeout(this.activeTimeout);
          this.activeTimeout = null;
        }
        this.isSpeaking = false;
        this.resetSpeakingUI();

        if (typeof SoundFX !== 'undefined' && SoundFX.unduck) {
          try { SoundFX.unduck(200); } catch (e) {}
        }

        if (isError) {
          if (typeof options.onError === 'function') {
            try { options.onError(errorEvt); } catch (err) {}
          }
        } else {
          if (typeof options.onEnd === 'function') {
            try { options.onEnd(); } catch (e) { console.warn(e); }
          }
        }
      };

      utterance.onstart = () => {
        if (this.currentId !== myId) return;
        if (typeof options.onStart === 'function') {
          try { options.onStart(); } catch (e) {}
        }
      };

      utterance.onboundary = (e) => {
        if (this.currentId !== myId) return;
        if (typeof options.onBoundary === 'function') {
          try { options.onBoundary(e); } catch (e) {}
        }
      };

      utterance.onend = () => cleanup(false);
      utterance.onerror = (e) => {
        if (this.currentId !== myId) return;
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) {
          cleanup(false);
          return;
        }
        cleanup(true, e);
      };

      speechSynthesis.speak(utterance);

      // Adaptive keepalive pulse: Chrome silent stall mitigation (>10s)
      this._keepaliveInterval = setInterval(() => {
        if (this.currentId !== myId || !this.isSpeaking) {
          if (this._keepaliveInterval) {
            clearInterval(this._keepaliveInterval);
            this._keepaliveInterval = null;
          }
          return;
        }
        if ('speechSynthesis' in window && speechSynthesis.speaking) {
          try {
            speechSynthesis.pause();
            speechSynthesis.resume();
          } catch (e) {}
        }
      }, 10000);

      // Adaptive watchdog timeout scaled by word count and rate
      const wordCount = String(cleanText).trim().split(/\s+/).filter(Boolean).length;
      const maxMs = options.timeoutMs || (options.isSingleWord
        ? Math.max(2500, (wordCount * 450) + 1500)
        : Math.max(5000, (wordCount * 1400) + 5000));

      this.activeTimeout = setTimeout(() => {
        if (this.currentId !== myId) return;
        this.stopAll();
        if (typeof options.onEnd === 'function') {
          try { options.onEnd(); } catch (e) {}
        }
      }, maxMs);

      return utterance;
    } catch (err) {
      console.warn('SoundReader.speak error:', err);
      this.stopAll();
      if (typeof options.onEnd === 'function') {
        try { options.onEnd(); } catch (e) {}
      }
      return null;
    }
  },

  playAudioUrl(url, fallbackWord = null, options = {}) {
    this.stopAll();
    const myId = this.currentId;
    this.isSpeaking = true;
    try {
      const audio = new Audio(url);
      this.activeAudioEl = audio;

      const onDone = () => {
        if (this.currentId !== myId) return;
        this.activeAudioEl = null;
        this.isSpeaking = false;
        this.resetSpeakingUI();
        if (typeof options.onEnd === 'function') {
          try { options.onEnd(); } catch (e) {}
        }
      };

      audio.onended = onDone;
      audio.onerror = () => {
        if (this.currentId !== myId) return;
        this.activeAudioEl = null;
        if (fallbackWord) {
          this.speak(fallbackWord, Object.assign({}, options, { rate: 0.88 }));
        } else {
          onDone();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (this.currentId !== myId) return;
          this.activeAudioEl = null;
          if (fallbackWord) {
            this.speak(fallbackWord, Object.assign({}, options, { rate: 0.88 }));
          } else {
            onDone();
          }
        });
      }
    } catch (e) {
      if (this.currentId !== myId) return;
      if (fallbackWord) {
        this.speak(fallbackWord, Object.assign({}, options, { rate: 0.88 }));
      }
    }
  },

  speakWord(word, options = {}) {
    if (!word) {
      if (typeof options.onEnd === 'function') {
        try { options.onEnd(); } catch (e) {}
      }
      return null;
    }
    const cleanWord = String(word).trim();
    return this.speak(cleanWord, Object.assign({ isSingleWord: true }, options));
  }
};

if ('speechSynthesis' in window) {
  if (typeof speechSynthesis.addEventListener === 'function') {
    speechSynthesis.addEventListener('voiceschanged', () => {
      SoundReader._voicesByLang = {};
      SoundReader._resolveVoice('en');
      SoundReader._resolveVoice('ar');
    });
  }
  SoundReader._resolveVoice('en');
  SoundReader._resolveVoice('ar');
}
window.SoundReader = SoundReader;
