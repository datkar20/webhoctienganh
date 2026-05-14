import type { Difficulty, ExtractedVocabulary } from "@/types";
import { findVocabularyImageUrl } from "@/lib/extract";
import { approximatePhonetic } from "@/lib/phonetics";

export function guessPartOfSpeech(word: string) {
  if (word.endsWith("tion") || word.endsWith("ment") || word.endsWith("ness") || word.endsWith("ity")) return "noun";
  if (word.endsWith("ive") || word.endsWith("al") || word.endsWith("ous") || word.endsWith("ful") || word.endsWith("able")) {
    return "adjective";
  }
  if (word.endsWith("ing") || word.endsWith("ize") || word.endsWith("ise")) return "verb";
  if (word.endsWith("ly")) return "adverb";
  return "word";
}

export function guessDifficulty(word: string, frequency: number) {
  if (word.length >= 11 || frequency === 1) return "hard";
  if (word.length >= 7) return "medium";
  return "easy";
}

export async function autoFillVocabularyFields({
  word,
  meaningVi,
  partOfSpeech,
  phonetic,
  imageUrl,
  exampleEn,
  exampleVi,
  difficulty
}: {
  word: string;
  meaningVi?: string;
  partOfSpeech?: string;
  phonetic?: string;
  imageUrl?: string;
  exampleEn?: string;
  exampleVi?: string;
  difficulty?: Difficulty;
}) {
  const originalWord = word.trim();
  const looksVietnamese = hasVietnameseCharacters(originalWord);
  const translatedWord = looksVietnamese ? await translateVietnameseToEnglish(originalWord) : "";
  const cleanWord = (translatedWord || originalWord).trim().toLowerCase();
  const fallbackMeaning = looksVietnamese ? originalWord : "";
  const resolvedPartOfSpeech = partOfSpeech?.trim() || guessPartOfSpeech(cleanWord);
  const resolvedExampleEn = exampleEn?.trim() || `I want to remember the word "${cleanWord}".`;
  const [resolvedMeaningVi, resolvedExampleVi, resolvedImageUrl] = await Promise.all([
    meaningVi?.trim() ? Promise.resolve(meaningVi.trim()) : fallbackMeaning ? Promise.resolve(fallbackMeaning) : translateEnglishToVietnamese(cleanWord),
    exampleVi?.trim() ? Promise.resolve(exampleVi.trim()) : translateEnglishToVietnamese(resolvedExampleEn),
    imageUrl?.trim() ? Promise.resolve(imageUrl.trim()) : findVocabularyImageUrl(cleanWord, resolvedPartOfSpeech)
  ]);

  return {
    word: cleanWord,
    meaningVi: resolvedMeaningVi,
    partOfSpeech: resolvedPartOfSpeech,
    phonetic: phonetic?.trim() || approximatePhonetic(cleanWord),
    imageUrl: resolvedImageUrl,
    exampleEn: resolvedExampleEn,
    exampleVi: resolvedExampleVi,
    difficulty: difficulty ?? guessDifficulty(cleanWord, 1)
  };
}

function hasVietnameseCharacters(value: string) {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(value);
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
  return translateText(text, "en", "vi");
}

async function translateVietnameseToEnglish(text: string) {
  return translateText(text, "vi", "en");
}

async function translateText(text: string, from: "en" | "vi", to: "en" | "vi") {
  const source = text.trim();
  if (!source) return "";

  try {
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(source)}&langpair=${from}|${to}`;
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
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(source)}`;
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
    const resolvedPartOfSpeech = item.partOfSpeech || guessPartOfSpeech(item.word);
    const [meaningVi, exampleVi, imageUrl] = await Promise.all([
      item.meaningVi ? Promise.resolve(item.meaningVi) : translateEnglishToVietnamese(item.word),
      item.exampleVi ? Promise.resolve(item.exampleVi) : translateEnglishToVietnamese(exampleEn),
      item.imageUrl ? Promise.resolve(item.imageUrl) : findVocabularyImageUrl(item.word, resolvedPartOfSpeech)
    ]);

    filled.push({
      ...item,
      selected: Boolean(meaningVi) && !item.exists,
      meaningVi,
      partOfSpeech: resolvedPartOfSpeech,
      phonetic: item.phonetic || approximatePhonetic(item.word),
      imageUrl,
      exampleEn,
      exampleVi,
      difficulty: item.difficulty || guessDifficulty(item.word, item.frequency)
    });
    onProgress?.(index + 1, total);
  }

  return filled;
}
