import { DICTIONARY_BY_WORD } from "@/data/built-in-dictionary";
import { ENGLISH_STOP_WORDS } from "@/data/stop-words";
import type { Difficulty, ExtractedVocabulary } from "@/types";

const MEANINGFUL_PHRASES = new Map<string, { meaningVi: string; partOfSpeech: string; topic: string; exampleEn: string; exampleVi: string }>([
  ["rush hour", {
    meaningVi: "giờ cao điểm",
    partOfSpeech: "noun phrase",
    topic: "Transport",
    exampleEn: "Traffic is heavy during rush hour.",
    exampleVi: "Giao thông đông đúc vào giờ cao điểm."
  }],
  ["rush hours", {
    meaningVi: "các khung giờ cao điểm",
    partOfSpeech: "noun phrase",
    topic: "Transport",
    exampleEn: "Rush hours are stressful in big cities.",
    exampleVi: "Các khung giờ cao điểm rất căng thẳng ở thành phố lớn."
  }],
  ["public transport", {
    meaningVi: "phương tiện giao thông công cộng",
    partOfSpeech: "noun phrase",
    topic: "Transport",
    exampleEn: "Public transport can reduce traffic jams.",
    exampleVi: "Giao thông công cộng có thể giảm ùn tắc."
  }],
  ["traffic jam", {
    meaningVi: "kẹt xe",
    partOfSpeech: "noun phrase",
    topic: "Transport",
    exampleEn: "We were late because of a traffic jam.",
    exampleVi: "Chúng tôi đến muộn vì kẹt xe."
  }],
  ["traffic jams", {
    meaningVi: "những vụ kẹt xe",
    partOfSpeech: "noun phrase",
    topic: "Transport",
    exampleEn: "Traffic jams waste a lot of time.",
    exampleVi: "Kẹt xe làm lãng phí rất nhiều thời gian."
  }],
  ["air pollution", {
    meaningVi: "ô nhiễm không khí",
    partOfSpeech: "noun phrase",
    topic: "Environment",
    exampleEn: "Air pollution affects children's health.",
    exampleVi: "Ô nhiễm không khí ảnh hưởng đến sức khỏe trẻ em."
  }],
  ["climate change", {
    meaningVi: "biến đổi khí hậu",
    partOfSpeech: "noun phrase",
    topic: "Environment",
    exampleEn: "Climate change affects many countries.",
    exampleVi: "Biến đổi khí hậu ảnh hưởng đến nhiều quốc gia."
  }],
  ["digital literacy", {
    meaningVi: "khả năng sử dụng công nghệ số",
    partOfSpeech: "noun phrase",
    topic: "Education",
    exampleEn: "Digital literacy is important for students.",
    exampleVi: "Khả năng sử dụng công nghệ số rất quan trọng với học sinh."
  }],
  ["online learning", {
    meaningVi: "học trực tuyến",
    partOfSpeech: "noun phrase",
    topic: "Education",
    exampleEn: "Online learning is flexible for busy students.",
    exampleVi: "Học trực tuyến linh hoạt cho học sinh bận rộn."
  }],
  ["customer service", {
    meaningVi: "dịch vụ khách hàng",
    partOfSpeech: "noun phrase",
    topic: "Business",
    exampleEn: "Good customer service builds trust.",
    exampleVi: "Dịch vụ khách hàng tốt xây dựng niềm tin."
  }]
]);

function stableImageLock(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) + 100;
}

export function suggestVocabularyImageUrl(word: string, partOfSpeech = "", topic = "") {
  const pos = partOfSpeech.toLowerCase();
  const topicKeyword = topic.toLowerCase();
  const visualHint = pos.includes("verb")
    ? "a person clearly doing the action"
    : pos.includes("adjective")
      ? "a simple visual scene showing the quality"
      : pos.includes("adverb")
        ? "movement in a realistic scene"
        : "the object or concept as the main subject";
  const prompt = [
    "realistic educational vocabulary illustration",
    `English vocabulary word: ${word.toLowerCase()}`,
    topicKeyword ? `topic: ${topicKeyword}` : "",
    partOfSpeech ? `part of speech: ${partOfSpeech}` : "",
    visualHint,
    "single clear subject, natural lighting, no text, no watermark"
  ]
    .filter(Boolean)
    .join(", ");

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=420&nologo=true&seed=${stableImageLock(`${word}-${partOfSpeech}-${topic}`)}`;
}

export function extractVocabularyFromText(text: string, existingWords: string[] = []): ExtractedVocabulary[] {
  const existing = new Set(existingWords.map((word) => word.toLowerCase()));
  const frequency = new Map<string, number>();
  const phraseFrequency = new Map<string, number>();
  const phraseWordsToSkip = new Set<string>();
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/'/g, "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  for (let index = 0; index < tokens.length; index += 1) {
    [3, 2].forEach((size) => {
      const phrase = tokens.slice(index, index + size).join(" ");
      if (!MEANINGFUL_PHRASES.has(phrase)) return;
      phraseFrequency.set(phrase, (phraseFrequency.get(phrase) ?? 0) + 1);
      phrase.split(" ").forEach((word) => phraseWordsToSkip.add(word));
    });
  }

  tokens
    .filter((word) => word.length >= 4)
    .filter((word) => !ENGLISH_STOP_WORDS.has(word))
    .filter((word) => !phraseWordsToSkip.has(word))
    .forEach((word) => frequency.set(word, (frequency.get(word) ?? 0) + 1));

  const phraseItems = Array.from(phraseFrequency.entries()).map(([phrase, count]) => {
    const entry = MEANINGFUL_PHRASES.get(phrase);
    return {
      word: phrase,
      frequency: count,
      selected: !existing.has(phrase),
      meaningVi: entry?.meaningVi ?? "",
      partOfSpeech: entry?.partOfSpeech ?? "phrase",
      phonetic: "",
      imageUrl: suggestVocabularyImageUrl(phrase, entry?.partOfSpeech, entry?.topic),
      exampleEn: entry?.exampleEn ?? "",
      exampleVi: entry?.exampleVi ?? "",
      difficulty: "medium" as Difficulty,
      exists: existing.has(phrase)
    };
  });

  const wordItems = Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word, count]) => {
      const entry = DICTIONARY_BY_WORD.get(word);
      return {
        word,
        frequency: count,
        selected: Boolean(entry) && !existing.has(word),
        meaningVi: entry?.meaningVi ?? "",
        partOfSpeech: entry?.partOfSpeech ?? "",
        phonetic: entry?.phonetic ?? "",
        imageUrl: suggestVocabularyImageUrl(word, entry?.partOfSpeech, entry?.topic),
        exampleEn: entry?.exampleEn ?? "",
        exampleVi: entry?.exampleVi ?? "",
        difficulty: (entry?.difficulty ?? "medium") as Difficulty,
        exists: existing.has(word)
      };
    });

  return [...phraseItems, ...wordItems]
    .sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word))
    .slice(0, 40);
}
