#!/usr/bin/env python3
"""
tools/library/apply_full_voice_humanization.py

Applies complete voice humanization, multi-sentence breathing pauses,
controllable narration speed, and UI controls into index.html.
"""
import re
import sys

def main():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    print("Initial index.html length:", len(content))

    # Pattern to find existing SoundReader (from // === UNIFIED SOUND READER down to window.speakText = speakText;)
    soundreader_pat = re.compile(
        r'// =====================================================================\s*'
        r'// (?:PROCEDURAL WEB AUDIO API ENGINE|UNIFIED SOUND READER).*?'
        r'window\.speakText = speakText;\s*',
        re.DOTALL
    )

    m = soundreader_pat.search(content)
    if not m:
        print("ERROR: Could not locate SoundReader block in index.html")
        sys.exit(1)

    print(f"Found SoundReader block: chars {m.start()} to {m.end()} (length: {len(m.group(0))})")

    with open('tools/library/sound_reader_block.js', 'r', encoding='utf-8') as f_block:
        new_sound_reader_block = f_block.read()

    content = content[:m.start()] + new_sound_reader_block + content[m.end():]

    # Add Narration Speed into Settings View
    if 'id="voice-speed"' not in content:
        old_settings_field = """              <div class="settings-field">
                <label for="reader-voice">
                  <span class="field-title">Narration Voice &amp; Personality</span>
                  <span class="field-description">Choose your preferred narrator for dictionary pronunciations, word recall, and spelling games.</span>
                  <div class="voice-picker-row">
                    <select id="reader-voice" class="standalone-select" style="flex: 1; min-width: 240px;">
                      <option value="natural-female" selected>Natural AI Female · Warm &amp; Melodic</option>
                      <option value="natural-male">Natural AI Male · Calm &amp; Resonant</option>
                      <option value="british-classic">British Classic · Oxford Literary Cadence</option>
                      <option value="studio-human">Studio Human · Authentic Diction &amp; Clarity</option>
                    </select>
                    <button type="button" id="preview-voice-btn" class="voice-test-btn" title="Listen to a voice sample">
                      <span id="preview-voice-icon">🔊</span>
                      <span id="preview-voice-text">Test Voice</span>
                    </button>
                  </div>
                </label>
              </div>"""

        new_settings_field = """              <div class="settings-field">
                <label for="reader-voice">
                  <span class="field-title">Narration Voice &amp; Personality</span>
                  <span class="field-description">Choose your preferred narrator for dictionary pronunciations, word recall, and spelling games.</span>
                  <div class="voice-picker-row">
                    <select id="reader-voice" class="standalone-select" style="flex: 1; min-width: 240px;">
                      <option value="natural-female" selected>Natural AI Female · Warm &amp; Melodic</option>
                      <option value="natural-male">Natural AI Male · Calm &amp; Resonant</option>
                      <option value="british-classic">British Classic · Oxford Literary Cadence</option>
                      <option value="studio-human">Studio Human · Authentic Diction &amp; Clarity</option>
                    </select>
                    <button type="button" id="preview-voice-btn" class="voice-test-btn" title="Listen to a voice sample">
                      <span id="preview-voice-icon">🔊</span>
                      <span id="preview-voice-text">Test Voice</span>
                    </button>
                  </div>
                </label>
              </div>

              <div class="settings-field">
                <label for="voice-speed">
                  <span class="field-title">Narration Speed &amp; Cadence</span>
                  <span class="field-description">Adjust speech tempo for comfortable listening, clear comprehension, and natural pauses.</span>
                  <div class="voice-picker-row">
                    <select id="voice-speed" class="standalone-select" style="flex: 1; min-width: 240px;">
                      <option value="0.75">0.75× · Gentle &amp; Deliberate (Learner Focus)</option>
                      <option value="0.82" selected>0.82× · Natural Conversational (Recommended)</option>
                      <option value="0.90">0.90× · Standard Fluent Flow</option>
                      <option value="1.00">1.00× · Brisk Authentic Pace</option>
                    </select>
                  </div>
                </label>
              </div>

              <div class="settings-field">
                <span class="field-title">Ambient Palette</span>
                <span class="field-description">Click a mood to apply it to your reading environment immediately.</span>
                <div class="mood-pill-grid">
                  <button type="button" class="mood-chip-btn" onclick="applyColorMood('purple'); localStorage.setItem('wordloom-mood', 'purple'); showToast('Mood: Antique Parchment');">
                    <span class="mood-dot" style="background: #8B5A2B;"></span> Parchment
                  </button>
                  <button type="button" class="mood-chip-btn" onclick="applyColorMood('fern'); localStorage.setItem('wordloom-mood', 'fern'); showToast('Mood: Emerald Fern');">
                    <span class="mood-dot" style="background: #2D6559;"></span> Fern
                  </button>
                  <button type="button" class="mood-chip-btn" onclick="applyColorMood('coral'); localStorage.setItem('wordloom-mood', 'coral'); showToast('Mood: Warm Coral');">
                    <span class="mood-dot" style="background: #E2765F;"></span> Coral
                  </button>
                  <button type="button" class="mood-chip-btn" onclick="applyColorMood('sky'); localStorage.setItem('wordloom-mood', 'sky'); showToast('Mood: Ocean Sky');">
                    <span class="mood-dot" style="background: #3D78A0;"></span> Sky
                  </button>
                  <button type="button" class="mood-chip-btn" onclick="applyColorMood('amber'); localStorage.setItem('wordloom-mood', 'amber'); showToast('Mood: Amber Gold');">
                    <span class="mood-dot" style="background: #B47D2E;"></span> Amber
                  </button>
                </div>
              </div>"""

        if old_settings_field in content:
            content = content.replace(old_settings_field, new_settings_field, 1)
            print("Added #voice-speed dropdown in Settings View")
        else:
            print("WARNING: old_settings_field not matched directly")

    # Add speed button to Dictionary Modal
    if 'id="dict-speed-btn"' not in content:
        old_dict_modal_btn = """    <div class="modal-actions" style="display: flex; gap: 12px; font-family: sans-serif; margin-top: 0 !important;">
      <button class="speak-word" data-speak="${key}" type="button" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #ffffff !important; border: 2px solid #5C4033 !important; color: #5C4033 !important; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; min-height: 48px;">
        🔊 Listen
      </button>"""

        new_dict_modal_btn = """    <div class="modal-actions" style="display: flex; gap: 12px; font-family: sans-serif; margin-top: 0 !important; align-items: center;">
      <button class="speak-word" data-speak="${key}" type="button" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #ffffff !important; border: 2px solid #5C4033 !important; color: #5C4033 !important; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; min-height: 48px;">
        🔊 Listen
      </button>
      <button id="dict-speed-btn" class="voice-speed-pill" type="button" title="Change narration speed" style="background: #FAF4EB; border: 1.5px solid #8B5A2B; color: #5C4033; border-radius: 6px; padding: 8px 12px; font-weight: 700; font-size: 13px; cursor: pointer; min-height: 48px; min-width: 64px; flex: 0 0 auto;">
        ${SoundReader.currentVoiceSpeed || 0.82}×
      </button>"""

        if old_dict_modal_btn in content:
            content = content.replace(old_dict_modal_btn, new_dict_modal_btn)
            print("Added #dict-speed-btn in dictionary modals")

    # Update savePreferences()
    if "localStorage.setItem('wordloom-voice-speed'" not in content:
        old_save = """  localStorage.setItem('wordloom-voice', readerVoice);
  SoundReader.setVoiceProfile(readerVoice);"""

        new_save = """  localStorage.setItem('wordloom-voice', readerVoice);
  SoundReader.setVoiceProfile(readerVoice);
  const speedEl = document.querySelector('#voice-speed');
  if (speedEl) {
    const spVal = speedEl.value || '0.82';
    localStorage.setItem('wordloom-voice-speed', spVal);
    SoundReader.setVoiceSpeed(spVal);
  }"""
        if old_save in content:
            content = content.replace(old_save, new_save, 1)
            print("Updated savePreferences with voice-speed persistence")
        else:
            print("WARNING: old_save not found in content!")

    # Update syncSettingsForm()
    if "const storedSpeed = localStorage.getItem('wordloom-voice-speed')" not in content:
        old_sync = """  const voiceEl = document.querySelector('#reader-voice');
  if (voiceEl && readerVoice) voiceEl.value = readerVoice;"""

        new_sync = """  const voiceEl = document.querySelector('#reader-voice');
  if (voiceEl && readerVoice) voiceEl.value = readerVoice;
  const speedEl = document.querySelector('#voice-speed');
  const storedSpeed = localStorage.getItem('wordloom-voice-speed') || '0.82';
  if (speedEl) speedEl.value = storedSpeed;"""
        if old_sync in content:
            content = content.replace(old_sync, new_sync, 1)
            print("Updated syncSettingsForm with voice-speed sync")
        else:
            print("WARNING: old_sync not found in content!")

    # Update data-speak event listener
    old_click = """  const speak = event.target.closest('[data-speak]');
  if (speak) {
    speak.classList.add('speaking');
    SoundReader.speakWord(speak.dataset.speak, { lang: 'en-US', rate: 0.88, pitch: 1 });
    return;
  }"""

    new_click = """  const dictSpeedBtn = event.target.closest('#dict-speed-btn');
  if (dictSpeedBtn) {
    const speeds = ['0.75', '0.82', '0.90', '1.00'];
    const cur = String(SoundReader.currentVoiceSpeed || '0.82');
    const idx = speeds.indexOf(cur);
    const next = speeds[(idx + 1) % speeds.length];
    SoundReader.setVoiceSpeed(next);
    showToast('Speed: ' + next + '×');
    return;
  }
  const speak = event.target.closest('[data-speak]');
  if (speak) {
    speak.classList.add('speaking');
    SoundReader.speakWord(speak.dataset.speak, {
      onEnd: () => speak.classList.remove('speaking'),
      onError: () => speak.classList.remove('speaking')
    });
    return;
  }"""

    if old_click in content:
        content = content.replace(old_click, new_click, 1)
        print("Updated click listener for dictSpeedBtn and data-speak")
    else:
        print("WARNING: old_click not found in content!")

    # Change listener for #voice-speed
    if "document.querySelector('#voice-speed')?.addEventListener('change'" not in content:
        old_voice_listener = """document.querySelector('#reader-voice')?.addEventListener('change', event => {
  readerVoice = event.target.value;
  localStorage.setItem('wordloom-voice', readerVoice);
  SoundReader.setVoiceProfile(readerVoice);
  SoundReader.previewVoice(readerVoice);
});"""

        new_voice_listener = """document.querySelector('#reader-voice')?.addEventListener('change', event => {
  readerVoice = event.target.value;
  localStorage.setItem('wordloom-voice', readerVoice);
  SoundReader.setVoiceProfile(readerVoice);
  SoundReader.previewVoice(readerVoice);
});
document.querySelector('#voice-speed')?.addEventListener('change', event => {
  SoundReader.setVoiceSpeed(event.target.value);
  showToast('Speed: ' + event.target.value + '×');
});"""

        if old_voice_listener in content:
            content = content.replace(old_voice_listener, new_voice_listener, 1)
            print("Added #voice-speed change listener")
        else:
            print("WARNING: old_voice_listener not found in content!")

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("Finished updating index.html! Final length:", len(content))

if __name__ == '__main__':
    main()
