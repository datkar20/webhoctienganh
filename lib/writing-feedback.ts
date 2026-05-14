import { normalizeAnswer } from "@/lib/answers";

export type SentenceFeedback = {
  isCorrect: boolean;
  score: number;
  revisedText: string;
  everydayExamples: string[];
  issues: string[];
  strengths: string[];
};

export type WritingTaskType = "letter" | "essay";
export type FeedbackLanguage = "en" | "vi";

export type WritingEvaluation = {
  score: number;
  taskAchievement: number;
  organization: number;
  vocabulary: number;
  grammar: number;
  wordCount: number;
  revisedSample: string;
  feedback: string[];
  structure: string[];
  strengths: string[];
};

const commonVerbs = new Set([
  "am",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "go",
  "goes",
  "went",
  "make",
  "makes",
  "made",
  "use",
  "uses",
  "used",
  "improve",
  "improves",
  "improved",
  "learn",
  "learns",
  "learned",
  "study",
  "studies",
  "studied",
  "help",
  "helps",
  "helped",
  "need",
  "needs",
  "needed",
  "want",
  "wants",
  "wanted",
  "can",
  "should",
  "will",
  "would",
  "could",
  "may",
  "might",
  "must"
]);

const linkingWords = ["firstly", "secondly", "however", "therefore", "moreover", "besides", "finally", "in conclusion"];

function wordsOf(text: string) {
  return text.trim().match(/[A-Za-zÀ-ỹ0-9']+/g) ?? [];
}

function sentenceCount(text: string) {
  return text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
}

function paragraphCount(text: string) {
  return text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).length;
}

function hasVerb(text: string) {
  const normalizedWords = wordsOf(text).map((word) => word.toLowerCase());
  return normalizedWords.some((word) => commonVerbs.has(word) || word.endsWith("ed") || word.endsWith("ing"));
}

function capitalizeSentence(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function containsVocabularyWord(text: string, word: string) {
  return normalizeAnswer(text).split(" ").includes(normalizeAnswer(word));
}

export function gradeVocabularySentence(answer: string, vocabularyWord: string, language: FeedbackLanguage = "en"): SentenceFeedback {
  const issues: string[] = [];
  const strengths: string[] = [];
  const clean = answer.trim();
  const wordCount = wordsOf(clean).length;
  const vi = language === "vi";

  if (!containsVocabularyWord(clean, vocabularyWord)) {
    issues.push(vi ? `Câu cần dùng đúng từ vựng "${vocabularyWord}".` : `Use the vocabulary word "${vocabularyWord}" in the sentence.`);
  } else {
    strengths.push(vi ? "Câu đã dùng đúng từ vựng mục tiêu." : "The sentence uses the target vocabulary word.");
  }

  if (wordCount < 5) issues.push(vi ? "Hãy viết một câu hoàn chỉnh, tối thiểu 5 từ." : "Write a complete sentence with at least 5 words.");
  else strengths.push(vi ? "Câu đủ dài để thể hiện ý nghĩa." : "The sentence is long enough to show meaning.");

  if (!/^[A-Z]/.test(clean)) issues.push(vi ? "Câu tiếng Anh nên bắt đầu bằng chữ hoa." : "Start the sentence with a capital letter.");
  if (!/[.!?]$/.test(clean)) issues.push(vi ? "Hãy kết thúc câu bằng dấu câu phù hợp." : "End the sentence with proper punctuation.");
  if (!hasVerb(clean)) issues.push(vi ? "Câu cần có động từ rõ ràng để đủ cấu trúc." : "Add a clear verb so the sentence has a complete structure.");
  else strengths.push(vi ? "Câu có cấu trúc động từ nhận diện được." : "The sentence has a recognizable verb structure.");

  const score = Math.max(0, 100 - issues.length * 20);
  const revisedText = buildRevisedSentence(clean, vocabularyWord);

  return {
    isCorrect: score >= 80,
    score,
    revisedText,
    everydayExamples: buildEverydayExamples(vocabularyWord, clean),
    issues,
    strengths
  };
}

function buildRevisedSentence(answer: string, vocabularyWord: string) {
  const normalized = answer.trim();
  if (normalized && containsVocabularyWord(normalized, vocabularyWord) && hasVerb(normalized)) return polishSentence(normalized);
  return capitalizeSentence(`I can use ${vocabularyWord} correctly in a clear English sentence`);
}

function polishSentence(answer: string) {
  return capitalizeSentence(
    answer
      .replace(/\bi am agree\b/gi, "I agree")
      .replace(/\bpeople is\b/gi, "people are")
      .replace(/\bhe go\b/gi, "he goes")
      .replace(/\bshe go\b/gi, "she goes")
      .replace(/\bit go\b/gi, "it goes")
      .replace(/\ba ([aeiou])/gi, "an $1")
      .replace(/\s+/g, " ")
  );
}

function buildEverydayExamples(vocabularyWord: string, answer: string) {
  const word = vocabularyWord.toLowerCase();
  const userContext = wordsOf(answer)
    .filter((item) => item.length > 3 && normalizeAnswer(item) !== normalizeAnswer(vocabularyWord))
    .slice(0, 2)
    .join(" ");
  const contextPhrase = userContext ? ` when I talk about ${userContext}` : "";

  return [
    capitalizeSentence(`I often use ${word}${contextPhrase} in daily conversations`),
    capitalizeSentence(`This ${word} is useful when I explain my ideas clearly`),
    capitalizeSentence(`I learned how to use ${word} in a natural sentence today`)
  ];
}

export function evaluateWritingTask(taskType: WritingTaskType, prompt: string, answer: string, language: FeedbackLanguage = "en"): WritingEvaluation {
  const wordCount = wordsOf(answer).length;
  const paragraphs = paragraphCount(answer);
  const sentences = sentenceCount(answer);
  const lower = answer.toLowerCase();
  const hasPromptKeywords = wordsOf(prompt)
    .filter((word) => word.length >= 5)
    .slice(0, 12)
    .some((word) => lower.includes(word.toLowerCase()));
  const usedLinking = linkingWords.filter((word) => lower.includes(word));
  const vi = language === "vi";

  const structureIssues: string[] = [];
  if (taskType === "letter") {
    if (wordCount < 100 || wordCount > 150) structureIssues.push(vi ? "Thư VSTEP B1 nên khoảng 120 từ, tốt nhất trong khoảng 100-150 từ." : "Aim for about 120 words for a VSTEP B1 letter.");
    if (paragraphs < 3) structureIssues.push(vi ? "Thư nên có 3-4 phần rõ ràng: chào hỏi, lý do viết, nội dung chính, kết thư." : "Use 3-4 clear parts: greeting, reason, main content, closing.");
    if (!/(dear|hello|hi)\b/i.test(answer)) structureIssues.push(vi ? "Hãy thêm lời chào, ví dụ: Dear ..." : "Add a greeting such as Dear ...");
    if (!/(best regards|regards|sincerely|see you|thank you)/i.test(answer)) structureIssues.push(vi ? "Hãy thêm phần kết thư tự nhiên, ví dụ: Best regards, Sincerely, Thank you." : "Add a natural closing.");
  } else {
    if (wordCount < 220 || wordCount > 290) structureIssues.push(vi ? "Bài luận VSTEP B1 nên khoảng 250 từ, tốt nhất trong khoảng 220-290 từ." : "Aim for about 250 words for a VSTEP B1 essay.");
    if (paragraphs < 4) structureIssues.push(vi ? "Bài luận nên có 4 đoạn: mở bài, thân bài 1, thân bài 2, kết luận." : "Use 4 paragraphs: introduction, body 1, body 2, conclusion.");
    if (!/(in conclusion|to conclude|overall)/i.test(answer)) structureIssues.push(vi ? "Hãy thêm tín hiệu kết luận như: In conclusion, To conclude, Overall." : "Add a conclusion signal.");
  }

  if (!hasPromptKeywords) structureIssues.push(vi ? "Bài viết cần bám sát đề hơn, nhắc lại hoặc phát triển các ý chính trong đề." : "Connect the answer more directly to the task prompt.");
  if (sentences < 4) structureIssues.push(vi ? "Hãy dùng thêm câu hoàn chỉnh để phát triển ý rõ hơn." : "Use more complete sentences to develop your ideas.");
  if (usedLinking.length < 2) structureIssues.push(vi ? "Nên thêm từ nối như firstly, however, moreover, therefore để bài mạch lạc hơn." : "Add linking words such as firstly, however, moreover, therefore.");

  const grammarIssues = detectGrammarIssues(answer, language);
  const taskAchievement = scoreBand([hasPromptKeywords, wordCount > 0, wordCount >= (taskType === "letter" ? 90 : 200)]);
  const organization = scoreBand([paragraphs >= (taskType === "letter" ? 3 : 4), usedLinking.length >= 2, sentences >= 4]);
  const vocabulary = scoreBand([new Set(wordsOf(answer).map((word) => word.toLowerCase())).size >= Math.min(70, wordCount * 0.55), usedLinking.length >= 2]);
  const grammar = Math.max(4, 10 - grammarIssues.length);
  const score = Math.round(((taskAchievement + organization + vocabulary + grammar) / 4) * 10) / 10;

  return {
    score,
    taskAchievement,
    organization,
    vocabulary,
    grammar,
    wordCount,
    revisedSample: buildWritingSample(taskType, prompt),
    feedback: [...structureIssues, ...grammarIssues],
    structure: taskType === "letter"
      ? (vi ? ["Chào hỏi", "Lý do viết", "Nội dung chính", "Kết thư"] : ["Greeting", "Reason for writing", "Main content", "Closing"])
      : (vi ? ["Mở bài", "Thân bài 1", "Thân bài 2", "Kết luận"] : ["Introduction", "Body paragraph 1", "Body paragraph 2", "Conclusion"]),
    strengths: [
      wordCount > 0 ? (vi ? "Bạn đã có bản nháp để cải thiện." : "You have a draft to improve.") : "",
      usedLinking.length > 0 ? (vi ? `Bạn đã dùng từ nối: ${usedLinking.join(", ")}.` : `Good linking words used: ${usedLinking.join(", ")}.`) : "",
      hasPromptKeywords ? (vi ? "Bài viết có liên quan đến đề." : "The answer relates to the topic.") : ""
    ].filter(Boolean)
  };
}

function scoreBand(checks: boolean[]) {
  const passed = checks.filter(Boolean).length;
  return Math.max(4, Math.round((passed / checks.length) * 6 + 4));
}

function detectGrammarIssues(text: string, language: FeedbackLanguage) {
  const vi = language === "vi";
  const issues: string[] = [];
  const sentences = text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const uncapitalized = sentences.filter((sentence) => sentence && !/^[A-Z]/.test(sentence)).length;
  if (uncapitalized > 0) issues.push(vi ? "Một số câu cần bắt đầu bằng chữ hoa." : "Some sentences should start with a capital letter.");
  if (/\bi am agree\b/i.test(text)) issues.push(vi ? 'Dùng "I agree", không dùng "I am agree".' : 'Use "I agree", not "I am agree".');
  if (/\bpeople is\b/i.test(text)) issues.push(vi ? 'Dùng "people are", không dùng "people is".' : 'Use "people are", not "people is".');
  if (/\bhe go\b|\bshe go\b|\bit go\b/i.test(text)) issues.push(vi ? "Kiểm tra động từ ngôi thứ ba số ít: he/she/it + verb-s." : "Check third-person singular verbs: he/she/it + verb-s.");
  if (/\ba [aeiou]/i.test(text)) issues.push(vi ? 'Dùng "an" trước âm nguyên âm.' : 'Use "an" before a vowel sound.');
  return issues;
}

function buildWritingSample(taskType: WritingTaskType, prompt: string) {
  if (taskType === "letter") {
    return [
      "Dear Sir or Madam,",
      `I am writing about ${prompt.trim() || "the topic in the task"}. I would like to explain my reason clearly.`,
      "First, I think this issue is important because it affects daily life. In addition, I would like to give some useful details and examples.",
      "Thank you for your time. I look forward to hearing from you."
    ].join("\n\n");
  }

  return [
    `${prompt.trim() || "This topic"} is an important issue in modern life. In my opinion, it has both practical benefits and some challenges.`,
    "Firstly, this issue can bring many advantages. For example, it can help people save time, improve their knowledge, and make better decisions.",
    "However, there are also some problems. People should use it carefully and choose suitable solutions for their situation.",
    "In conclusion, I believe this topic is useful if people understand it well and use it in a responsible way."
  ].join("\n\n");
}
