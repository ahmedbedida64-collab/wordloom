/**
 * Phase 3 prep: Compute reading-level metrics for a text string.
 * Returns: { word_count, sentence_count, avg_sentence_length,
 *            flesch_kincaid_grade, level_measured }
 */
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g,'');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function computeMetrics(text) {
  const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
  const wc = words.length;
  const sc = Math.max(sentences.length, 1);
  const asl = wc / sc;
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const asw = totalSyllables / Math.max(wc, 1);
  const fk = 0.39 * asl + 11.8 * asw - 15.59;

  let level;
  if (fk < 3.0 && asl < 7)       level = 'A1';
  else if (fk < 5.0 && asl < 11) level = 'A2';
  else if (fk < 7.5 && asl < 15) level = 'B1';
  else if (fk < 10.0 && asl < 19) level = 'B2';
  else                             level = 'C1';

  return { word_count: wc, sentence_count: sc, avg_sentence_length: parseFloat(asl.toFixed(1)), flesch_kincaid_grade: parseFloat(fk.toFixed(2)), level_measured: level };
}

module.exports = { computeMetrics };
