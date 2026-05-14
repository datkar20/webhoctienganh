const vowelGroups = /[aeiouy]+/gi;

export function approximatePhonetic(word: string) {
  const clean = word.toLowerCase().replace(/[^a-z-]/g, "").trim();
  if (!clean) return "";

  const syllables = splitSyllables(clean);
  const stressIndex = syllables.length > 1 ? stressPosition(clean, syllables.length) : 0;
  const pronounced = syllables.map((syllable, index) => `${index === stressIndex ? "'" : ""}${syllable}`);
  return `/${pronounced.join("-")}/`;
}

export function displayPhonetic(word: string, phonetic?: string) {
  const value = phonetic?.trim();
  if (!value || value === `/${word}/` || value === `/${word.toLowerCase()}/`) return approximatePhonetic(word);
  return value;
}

function splitSyllables(word: string) {
  const groups = [...word.matchAll(vowelGroups)];
  if (groups.length <= 1) return [word];

  const syllables: string[] = [];
  let start = 0;
  groups.forEach((group, index) => {
    if (index === groups.length - 1) {
      syllables.push(word.slice(start));
      return;
    }
    const nextStart = groups[index + 1].index ?? word.length;
    const cut = Math.max(group.index ?? start, Math.floor(((group.index ?? start) + nextStart) / 2));
    syllables.push(word.slice(start, cut));
    start = cut;
  });

  return syllables.filter(Boolean);
}

function stressPosition(word: string, syllableCount: number) {
  if (/(tion|sion|ic|ity|ical|ify|graphy)$/.test(word)) return Math.max(0, syllableCount - 2);
  if (/(ee|eer|ese|ette|oon)$/.test(word)) return syllableCount - 1;
  if (syllableCount <= 2) return 0;
  return syllableCount - 2;
}
