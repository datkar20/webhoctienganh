import type { Difficulty, ExtractedVocabulary } from "@/types";
import { suggestVocabularyImageUrl } from "@/lib/extract";

function guessPartOfSpeech(word: string) {
  if (word.endsWith("tion") || word.endsWith("ment") || word.endsWith("ness") || word.endsWith("ity")) return "noun";
  if (word.endsWith("ive") || word.endsWith("al") || word.endsWith("ous") || word.endsWith("ful") || word.endsWith("able")) {
    return "adjective";
  }
  if (word.endsWith("ing") || word.endsWith("ize") || word.endsWith("ise")) return "verb";
  if (word.endsWith("ly")) return "adverb";
  return "word";
}

function guessDifficulty(word: string, frequency: number): Difficulty {
  if (word.length >= 11 || frequency === 1) return "hard";
  if (word.length >= 7) return "medium";
  return "easy";
}

function findExampleSentence(text: string, word: string) {
  const sentence = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .find((item) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(item));

  return sentence ?? `The word "${word}" appears in this text.`;
}

async function fetchWithTimeout(url: string, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function cleanTranslation(value: string, source: string) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned || cleaned.toLowerCase() === source.toLowerCase()) return "";
  return cleaned;
}

export async function translateEnglishToVietnamese(text: string) {
  const source = text.trim();
  if (!source) return "";

  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source)}&langpair=en|vi`;
    const response = await fetchWithTimeout(myMemoryUrl);
    if (response.ok) {
      const data = (await response.json()) as { responseData?: { translatedText?: string } };
      const translated = cleanTranslation(data.responseData?.translatedText ?? "", source);
      if (translated) return translated;
    }
  } catch {
    // Fall through to the secondary public endpoint.
  }

  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(source)}`;
    const response = await fetchWithTimeout(googleUrl);
    if (response.ok) {
      const data = (await response.json()) as Array<Array<[string]>>;
      const translated = cleanTranslation(data[0]?.map((item) => item[0]).join("") ?? "", source);
      if (translated) return translated;
    }
  } catch {
    return "";
  }

  return "";
}

export async function autoFillExtractedVocabulary(
  suggestions: ExtractedVocabulary[],
  sourceText: string,
  onProgress?: (done: number, total: number) => void
) {
  const filled: ExtractedVocabulary[] = [];
  const total = suggestions.length;

  for (let index = 0; index < suggestions.length; index += 1) {
    const item = suggestions[index];
    if (item.exists) {
      filled.push(item);
      onProgress?.(index + 1, total);
      continue;
    }

    const exampleEn = item.exampleEn || findExampleSentence(sourceText, item.word);
    const [meaningVi, exampleVi] = await Promise.all([
      item.meaningVi ? Promise.resolve(item.meaningVi) : translateEnglishToVietnamese(item.word),
      item.exampleVi ? Promise.resolve(item.exampleVi) : translateEnglishToVietnamese(exampleEn)
    ]);

    filled.push({
      ...item,
      selected: Boolean(meaningVi) && !item.exists,
      meaningVi,
      partOfSpeech: item.partOfSpeech || guessPartOfSpeech(item.word),
      phonetic: item.phonetic || `/${item.word}/`,
      imageUrl: item.imageUrl || suggestVocabularyImageUrl(item.word, item.partOfSpeech || guessPartOfSpeech(item.word)),
      exampleEn,
      exampleVi,
      difficulty: item.difficulty || guessDifficulty(item.word, item.frequency)
    });
    onProgress?.(index + 1, total);
  }

  return filled;
}
