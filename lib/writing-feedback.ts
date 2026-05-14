import { normalizeAnswer } from "@/lib/answers";

export type SentenceFeedback = {
  isCorrect: boolean;
  score: number;
  revisedText: string;
  issues: string[];
  strengths: string[];
};

export type WritingTaskType = "letter" | "essay";

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

export function gradeVocabularySentence(answer: string, vocabularyWord: string): SentenceFeedback {
  const issues: string[] = [];
  const strengths: string[] = [];
  const clean = answer.trim();
  const wordCount = wordsOf(clean).length;

  if (!containsVocabularyWord(clean, vocabularyWord)) issues.push(`Use the vocabulary word "${vocabularyWord}" in the sentence.`);
  else strengths.push("The sentence uses the target vocabulary word.");

  if (wordCount < 5) issues.push("Write a complete sentence with at least 5 words.");
  else strengths.push("The sentence is long enough to show meaning.");

  if (!/^[A-Z]/.test(clean)) issues.push("Start the sentence with a capital letter.");
  if (!/[.!?]$/.test(clean)) issues.push("End the sentence with proper punctuation.");
  if (!hasVerb(clean)) issues.push("Add a clear verb so the sentence has a complete structure.");
  else strengths.push("The sentence has a recognizable verb structure.");

  const score = Math.max(0, 100 - issues.length * 20);
  const revisedText = buildRevisedSentence(clean, vocabularyWord);

  return {
    isCorrect: score >= 80,
    score,
    revisedText,
    issues,
    strengths
  };
}

function buildRevisedSentence(answer: string, vocabularyWord: string) {
  const normalized = answer.trim();
  if (normalized && containsVocabularyWord(normalized, vocabularyWord) && hasVerb(normalized)) return capitalizeSentence(normalized);
  return capitalizeSentence(`I can use ${vocabularyWord} correctly in a clear English sentence`);
}

export function evaluateWritingTask(taskType: WritingTaskType, prompt: string, answer: string): WritingEvaluation {
  const wordCount = wordsOf(answer).length;
  const paragraphs = paragraphCount(answer);
  const sentences = sentenceCount(answer);
  const lower = answer.toLowerCase();
  const hasPromptKeywords = wordsOf(prompt)
    .filter((word) => word.length >= 5)
    .slice(0, 12)
    .some((word) => lower.includes(word.toLowerCase()));
  const usedLinking = linkingWords.filter((word) => lower.includes(word));

  const structureIssues: string[] = [];
  if (taskType === "letter") {
    if (wordCount < 100 || wordCount > 150) structureIssues.push("Aim for about 120 words for a VSTEP B1 letter.");
    if (paragraphs < 3) structureIssues.push("Use 3-4 clear parts: greeting, reason, main content, closing.");
    if (!/(dear|hello|hi)\b/i.test(answer)) structureIssues.push("Add a greeting such as Dear ...");
    if (!/(best regards|regards|sincerely|see you|thank you)/i.test(answer)) structureIssues.push("Add a natural closing.");
  } else {
    if (wordCount < 220 || wordCount > 290) structureIssues.push("Aim for about 250 words for a VSTEP B1 essay.");
    if (paragraphs < 4) structureIssues.push("Use 4 paragraphs: introduction, body 1, body 2, conclusion.");
    if (!/(in conclusion|to conclude|overall)/i.test(answer)) structureIssues.push("Add a conclusion signal.");
  }

  if (!hasPromptKeywords) structureIssues.push("Connect the answer more directly to the task prompt.");
  if (sentences < 4) structureIssues.push("Use more complete sentences to develop your ideas.");
  if (usedLinking.length < 2) structureIssues.push("Add linking words such as firstly, however, moreover, therefore.");

  const grammarIssues = detectGrammarIssues(answer);
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
      ? ["Greeting", "Reason for writing", "Main content", "Closing"]
      : ["Introduction", "Body paragraph 1", "Body paragraph 2", "Conclusion"],
    strengths: [
      wordCount > 0 ? "You have a draft to improve." : "",
      usedLinking.length > 0 ? `Good linking words used: ${usedLinking.join(", ")}.` : "",
      hasPromptKeywords ? "The answer relates to the topic." : ""
    ].filter(Boolean)
  };
}

function scoreBand(checks: boolean[]) {
  const passed = checks.filter(Boolean).length;
  return Math.max(4, Math.round((passed / checks.length) * 6 + 4));
}

function detectGrammarIssues(text: string) {
  const issues: string[] = [];
  const sentences = text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
  const uncapitalized = sentences.filter((sentence) => sentence && !/^[A-Z]/.test(sentence)).length;
  if (uncapitalized > 0) issues.push("Some sentences should start with a capital letter.");
  if (/\bi am agree\b/i.test(text)) issues.push('Use "I agree", not "I am agree".');
  if (/\bpeople is\b/i.test(text)) issues.push('Use "people are", not "people is".');
  if (/\bhe go\b|\bshe go\b|\bit go\b/i.test(text)) issues.push("Check third-person singular verbs: he/she/it + verb-s.");
  if (/\ba [aeiou]/i.test(text)) issues.push('Use "an" before a vowel sound.');
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
