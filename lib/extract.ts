import { DICTIONARY_BY_WORD } from "@/data/built-in-dictionary";
import { ENGLISH_STOP_WORDS } from "@/data/stop-words";
import type { Difficulty, ExtractedVocabulary } from "@/types";

function stableImageLock(word: string) {
  return Array.from(word).reduce((total, character) => total + character.charCodeAt(0), 0) + 100;
}

export function suggestVocabularyImageUrl(word: string) {
  const keyword = encodeURIComponent(word.toLowerCase().replace(/\s+/g, ","));
  return `https://loremflickr.com/640/420/${keyword}?lock=${stableImageLock(word)}`;
}

export function extractVocabularyFromText(text: string, existingWords: string[] = []): ExtractedVocabulary[] {
  const existing = new Set(existingWords.map((word) => word.toLowerCase()));
  const frequency = new Map<string, number>();

  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4)
    .filter((word) => !ENGLISH_STOP_WORDS.has(word))
    .forEach((word) => frequency.set(word, (frequency.get(word) ?? 0) + 1));

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 40)
    .map(([word, count]) => {
      const entry = DICTIONARY_BY_WORD.get(word);
      return {
        word,
        frequency: count,
        selected: Boolean(entry) && !existing.has(word),
        meaningVi: entry?.meaningVi ?? "",
        partOfSpeech: entry?.partOfSpeech ?? "",
        phonetic: entry?.phonetic ?? "",
        imageUrl: suggestVocabularyImageUrl(word),
        exampleEn: entry?.exampleEn ?? "",
        exampleVi: entry?.exampleVi ?? "",
        difficulty: (entry?.difficulty ?? "medium") as Difficulty,
        exists: existing.has(word)
      };
    });
}
