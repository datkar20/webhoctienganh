import { checkAnswer, normalizeAnswer } from "@/lib/answers";
import { randomId } from "@/lib/utils";
import type { LocalQuizQuestion, QuizType, VocabularyItem } from "@/types";

const BLOCK_SIZE = 10;

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function choicesFor(
  vocabulary: VocabularyItem[],
  current: VocabularyItem,
  answerField: "word" | "meaningVi"
) {
  const correct = current[answerField];
  const distractors = shuffle(vocabulary.filter((item) => item.id !== current.id))
    .map((item) => item[answerField])
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 3);

  return shuffle([correct, ...distractors]).slice(0, 4);
}

function blankSentence(vocabulary: VocabularyItem) {
  const example = vocabulary.exampleEn || `The missing word is ${vocabulary.word}.`;
  const pattern = new RegExp(`\\b${escapeRegExp(vocabulary.word)}\\b`, "i");
  return pattern.test(example) ? example.replace(pattern, "____") : `${example} ____`;
}

function repeatedSelection(pool: VocabularyItem[], count: number) {
  if (pool.length === 0 || count <= 0) return [];
  const selected: VocabularyItem[] = [];

  while (selected.length < count) {
    selected.push(...shuffle(pool));
  }

  return selected.slice(0, count);
}

function questionFor(item: VocabularyItem, questionType: QuizType, pool: VocabularyItem[]): LocalQuizQuestion {
  if (questionType === "en-to-vi-choice") {
    return {
      id: randomId("question"),
      vocabularyId: item.id,
      questionType,
      prompt: item.word,
      correctAnswer: item.meaningVi,
      options: choicesFor(pool, item, "meaningVi"),
      vocabulary: item
    };
  }

  if (questionType === "vi-to-en-choice") {
    return {
      id: randomId("question"),
      vocabularyId: item.id,
      questionType,
      prompt: item.meaningVi,
      correctAnswer: item.word,
      options: choicesFor(pool, item, "word"),
      vocabulary: item
    };
  }

  if (questionType === "vi-to-en-type") {
    return {
      id: randomId("question"),
      vocabularyId: item.id,
      questionType,
      prompt: item.meaningVi,
      correctAnswer: item.word,
      vocabulary: item
    };
  }

  if (questionType === "fill-blank") {
    return {
      id: randomId("question"),
      vocabularyId: item.id,
      questionType,
      prompt: "Fill the missing word",
      correctAnswer: item.word,
      blankSentence: blankSentence(item),
      vocabulary: item
    };
  }

  if (questionType === "flashcard") {
    return {
      id: randomId("question"),
      vocabularyId: item.id,
      questionType,
      prompt: item.word,
      correctAnswer: item.meaningVi,
      vocabulary: item
    };
  }

  return {
    id: randomId("question"),
    vocabularyId: item.id,
    questionType,
    prompt: item.word,
    correctAnswer: item.meaningVi,
    vocabulary: item
  };
}

function generateBlockedMixedQuestions(pool: VocabularyItem[], count: number) {
  const selected = repeatedSelection(pool, count);
  const questions: LocalQuizQuestion[] = [];

  for (let index = 0; index < selected.length; index += BLOCK_SIZE) {
    const block = selected.slice(index, index + BLOCK_SIZE);
    const choiceTypes: QuizType[] = ["en-to-vi-choice", "vi-to-en-choice"];
    const typingTypes: QuizType[] = ["en-to-vi-type", "vi-to-en-type"];

    block.forEach((item, itemIndex) => {
      questions.push(questionFor(item, choiceTypes[itemIndex % choiceTypes.length], pool));
    });

    block.forEach((item, itemIndex) => {
      questions.push(questionFor(item, typingTypes[itemIndex % typingTypes.length], pool));
    });
  }

  return questions;
}

export function generateQuizQuestions(
  vocabulary: VocabularyItem[],
  quizType: QuizType,
  count: number,
  wordIds?: string[]
): LocalQuizQuestion[] {
  const pool = wordIds?.length
    ? vocabulary.filter((item) => wordIds.includes(item.id))
    : vocabulary;
  if (quizType === "mixed") return generateBlockedMixedQuestions(pool, count);

  const selected = repeatedSelection(pool, count);
  return selected.map((item) => questionFor(item, quizType, pool));
}

export function evaluateQuizAnswer(question: LocalQuizQuestion, answer: string) {
  if (question.questionType === "fill-blank" || question.questionType === "vi-to-en-type") {
    return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
  }

  if (question.questionType === "en-to-vi-type" || question.questionType === "en-to-vi-choice") {
    return checkAnswer(answer, question.correctAnswer);
  }

  return answer === question.correctAnswer;
}
