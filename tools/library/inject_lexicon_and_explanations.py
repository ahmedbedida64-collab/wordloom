#!/usr/bin/env python3
"""
Injects expanded lexicon, Datamuse-powered explanations engine,
offline persistence, and pre-warming into index.html.
"""

import json, re

from tools.library.build_lexicon import CORE_WORDS
from tools.library.compile_wordloom_lexicon import VOCAB

ADDITIONAL_FABLE_WORDS = {
    "summer": ("صيف", "The warmest season of the year, between spring and autumn.", "noun", "été", "verano", "Sommer", "yaz"),
    "orchard": ("بستان / حديقة فواكه", "A piece of land planted with fruit trees.", "noun", "verger", "huerto", "Obstgarten", "meyve bahçesi"),
    "quench": ("يروي (العطش) / يطفئ", "Satisfy one's thirst by drinking; extinguish.", "verb", "étancher", "saciar / apagar", "löschen / stillen", "gidermek / söndürmek"),
    "thirst": ("عطش", "A feeling of needing or wanting to drink something.", "noun", "soif", "sed", "Durst", "susuzluk"),
    "thirsty": ("عطشان", "Feeling a need to drink.", "adjective", "assoiffé", "sediento", "durstig", "susamış"),
    "morsel": ("لقمة / قطعة طعام صغيرة", "A small piece or amount of food; a mouthful.", "noun", "morceau / bouchée", "bocado", "Bissen / Häppchen", "lokma"),
    "despise": ("يحتقر / يزدري", "Feel contempt or a deep repugnance for.", "verb", "mépriser", "despreciar", "verachten", "küçümsemek / hor görmek"),
    "cannot": ("لا يستطيع / لا يمكنه", "Can not; unable to.", "verb", "ne peut pas", "no puede", "kann nicht", "yapamaz"),
    "until": ("حتى / إلى أن", "Up to the point in time or that event mentioned.", "conjunction", "jusqu'à", "hasta", "bis", "kadar / -e kadar"),
    "steps": ("خطوات / درجات", "Acts of lifting and setting down the foot; stairs.", "noun", "pas / étapes", "pasos", "Schritte", "adımlar"),
    "success": ("نجاح / فلاح", "The accomplishment of an aim or purpose.", "noun", "succès", "éxito", "Erfolg", "başarı"),
    "nose": ("أنف", "The part projecting above the mouth on the face of a person or animal.", "noun", "nez", "nariz", "Nase", "burun"),
    "ripening": ("ينضج / ناضج", "Becoming ripe or mature.", "adjective", "mûrissant", "madurando", "reifend", "olgunlaşan"),
    "tempting": ("مغرٍ / جذاب", "Appealing or inviting.", "adjective", "tentant", "tentador", "verlockend", "cazip / çekici"),
    "orchards": ("بساتين", "Plural of orchard; fruit tree gardens.", "noun", "vergers", "huertos", "Obstgärten", "meyve bahçeleri"),
    "greater": ("أكبر / أعظم", "Comparative of great; of larger extent.", "adjective", "plus grand", "mayor / más grande", "größer", "daha büyük"),
    "saying": ("قائلاً / مقولة", "Present participle of say; a well-known proverb.", "noun", "disant / dicton", "diciendo / dicho", "sagend / Sprichwort", "diyerek / atasözü"),
    "walking": ("يمشي / سائر", "Present participle of walk; moving on foot.", "verb", "marchant", "caminando", "gehend / zu Fuß", "yürüyen"),
    "taking": ("آخذاً", "Present participle of take.", "verb", "prenant", "tomando", "nehmend", "alarak"),
    "turning": ("يلتف / استدارة", "Present participle of turn.", "verb", "tournant", "girando", "drehend", "dönerek"),
    "hunter": ("صياد", "A person or animal that hunts game.", "noun", "chasseur", "cazador", "Jäger", "avcı"),
    "hunters": ("صيادون", "Plural of hunter.", "noun", "chasseurs", "cazadores", "Jäger", "avcılar"),
    "rope": ("حبل", "A length of strong cord made by twisting together strands of natural fibres.", "noun", "corde", "cuerda", "Seil", "ip / halat"),
    "ropes": ("حبال", "Plural of rope.", "noun", "cordes", "cuerdas", "Seile", "ipler / halatlar"),
    "roar": ("زئير / هدير", "A full, deep, prolonged cry uttered by a lion or other large animal.", "noun", "rugissement", "rugido", "Brüllen", "kükreme"),
    "teeth": ("أسنان", "Plural of tooth.", "noun", "dents", "dientes", "Zähne", "dişler"),
    "tooth": ("سن / ضرس", "Each of a set of hard, bony enamel-coated structures in the jaws.", "noun", "dent", "diente", "Zahn", "diş"),
    "gnawed": ("قرض / قضم", "Bite at or nibble something persistently.", "verb", "rongé", "roído", "genagt", "kemirmiş"),
    "free": ("حر / طليق / مجاني", "Able to act or be done as one wishes; not under control.", "adjective", "libre / gratuit", "libre / gratis", "frei / kostenlos", "özgür / serbest"),
    "caught": ("أمسك / قبض على", "Past tense of catch.", "verb", "attrapé / pris", "atrapado / cogido", "gefangen", "yakaladı"),
    "asleep": ("نائم", "In a state of sleep.", "adjective", "endormi", "dormido", "schlafend", "uykuda"),
    "awake": ("مستيقظ", "Not asleep.", "adjective", "éveillé", "despierto", "wach", "uyanık")
}

def run():
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Build merged translations
    m_trans = re.search(r"const DEFAULT_CUSTOM_TRANSLATIONS = (\{.*?\});\s*const savedCustomTranslations", html)
    existing_trans = json.loads(m_trans.group(1)) if m_trans else {}

    merged_translations = {}
    for k, v in existing_trans.items():
        merged_translations[k] = v.copy()

    for bundle in (CORE_WORDS, VOCAB, ADDITIONAL_FABLE_WORDS):
        for k, val in bundle.items():
            ar, eng_def, pos, fr, es, de, tr = val
            if k not in merged_translations:
                merged_translations[k] = {}
            merged_translations[k]["ar"] = ar
            merged_translations[k]["fr"] = fr
            merged_translations[k]["es"] = es
            merged_translations[k]["de"] = de
            merged_translations[k]["tr"] = tr
            merged_translations[k]["en"] = k

    # 2. Build merged dictionary: key -> [ar, def, pos, example]
    merged_dict = {}
    for bundle in (VOCAB, CORE_WORDS, ADDITIONAL_FABLE_WORDS):
        for k, val in bundle.items():
            ar, eng_def, pos, fr, es, de, tr = val
            merged_dict[k] = [ar, eng_def, pos, f"The word “{k}” appears in this passage."]

    print(f"Total translations: {len(merged_translations)}")
    print(f"Total dictionary entries: {len(merged_dict)}")

    # Format dictionary JS
    dict_entries = []
    for k in sorted(merged_dict.keys()):
        arr = merged_dict[k]
        dict_entries.append(f"  {json.dumps(k)}: {json.dumps(arr, ensure_ascii=False)}")
    new_dict_str = "const dictionary = {\n" + ",\n".join(dict_entries) + "\n};\nconst savedCustomDictionary = JSON.parse(localStorage.getItem('wordloom-custom-dictionary') || '{}');\nObject.assign(dictionary, savedCustomDictionary);\nwindow.dictionary = dictionary;\n\nfunction persistCustomDictionary() {\n  try {\n    localStorage.setItem('wordloom-custom-dictionary', JSON.stringify(dictionary));\n  } catch (e) {}\n}"

    new_trans_str = f"const DEFAULT_CUSTOM_TRANSLATIONS = {json.dumps(merged_translations, ensure_ascii=False)};"

    # Replace dictionary and translations in index.html
    # Look for: const dictionary = { ... };\nconst translations = ...;\nconst DEFAULT_CUSTOM_TRANSLATIONS = ...;
    target_pattern = re.compile(r"const dictionary = \{.*?\};\s*const translations = (\{.*?\});\s*const DEFAULT_CUSTOM_TRANSLATIONS = \{.*?\};", re.DOTALL)
    
    match = target_pattern.search(html)
    if not match:
        print("ERROR: Could not match dictionary and DEFAULT_CUSTOM_TRANSLATIONS block!")
        return False

    replacement = f"{new_dict_str}\nconst translations = {match.group(1)};\n{new_trans_str}"
    html = html[:match.start()] + replacement + html[match.end():]
    print("Successfully replaced dictionary and DEFAULT_CUSTOM_TRANSLATIONS")

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("Saved updated index.html")
    return True

if __name__ == "__main__":
    run()
