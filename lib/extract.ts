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
  return `https://picsum.photos/seed/${encodeURIComponent(`${word}-${partOfSpeech}-${topic}`)}/640/420`;
}

export async function findVocabularyImageUrl(word: string, partOfSpeech = "", topic = "") {
  const query = [word, topic, partOfSpeech]
    .filter(Boolean)
    .join(" ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();
  if (!query) return suggestVocabularyImageUrl(word, partOfSpeech, topic);

  try {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrsearch", query);
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "8");
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url|mime");
    url.searchParams.set("iiurlwidth", "640");
    url.searchParams.set("format", "json");
    url.searchParams.set("origin", "*");

    const response = await fetch(url.toString());
    if (!response.ok) return suggestVocabularyImageUrl(word, partOfSpeech, topic);
    const data = (await response.json()) as {
      query?: {
        pages?: Record<string, { title?: string; imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }> }>;
      };
    };
    const images = Object.values(data.query?.pages ?? {})
      .flatMap((page) => page.imageinfo ?? [])
      .filter((image) => image.mime?.startsWith("image/") && image.mime !== "image/svg+xml")
      .map((image) => image.thumburl || image.url)
      .filter(Boolean) as string[];

    return images[stableImageLock(word) % Math.max(images.length, 1)] ?? suggestVocabularyImageUrl(word, partOfSpeech, topic);
  } catch {
    return suggestVocabularyImageUrl(word, partOfSpeech, topic);
  }
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
      imageUrl: "",
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
        imageUrl: entry?.imageUrl ?? "",
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
