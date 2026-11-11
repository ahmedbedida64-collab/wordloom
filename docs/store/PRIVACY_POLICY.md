# Privacy Policy for Wordloom

**Last Updated:** November 11, 2026

Wordloom ("we", "our", or "the app") is committed to protecting your privacy. This Privacy Policy explains our practices regarding user information and data security.

---

## 1. Zero Data Collection & Local-First Architecture

Wordloom is designed as an offline-first, private reading and language learning application:
- **No Personal Data Collected:** We do not collect, store, sell, or transmit any personally identifiable information (such as your name, email, phone number, location, or device identifier) to any external servers.
- **Local-Only Storage:** All of your learning progress, saved vocabulary words, reading history, CEFR preferences, audio voice selections, and custom books are stored strictly on your device using browser local storage (`localStorage`) and IndexedDB.
- **No Third-Party Analytics or Tracking:** Wordloom does not include any analytics trackers, behavioral profiling SDKs, or third-party advertising networks.

---

## 2. Audio & Speech Features

- **Text-to-Speech Narration:** Wordloom uses your device's built-in Android speech synthesis engine (`SpeechSynthesisUtterance`) to pronounce words and sentences. Speech synthesis happens entirely on-device without sending your audio or spoken text to any external server.
- **Dictionary Lookups:** When connected to the internet, optional dictionary definitions and pronunciation audio may be retrieved from standard public educational dictionaries (such as Google Dictionary static sounds or Datamuse API). No personal identity is associated with these queries.

---

## 3. Permissions

Wordloom requests only the minimal necessary Android permissions:
- `android.permission.INTERNET`: Used only to fetch optional educational dictionary definitions and dictionary audio files when online.
- `android.permission.ACCESS_NETWORK_STATE`: Used to detect network availability and seamlessly switch to offline local storage mode.

Wordloom **does not** request or access:
- Camera or microphone
- Contacts or call logs
- Location / GPS
- Device storage or file system outside the app's isolated sandbox

---

## 4. Children’s Privacy

Wordloom is suitable for learners of all ages, including students and children. We comply fully with the Children’s Online Privacy Protection Act (COPPA) and Google Play Families Policy because we do not collect any personal information from children or adults.

---

## 5. Contact Us

If you have any questions or feedback regarding this Privacy Policy or Wordloom, you can contact us at:
- **Email:** support@wordloom.com
- **Website:** https://wordloom.app
