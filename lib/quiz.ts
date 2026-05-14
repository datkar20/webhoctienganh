import { checkAnswer, normalizeAnswer } from "@/lib/answers";
import { randomId } from "@/lib/utils";
import type { LocalQuizQuestion, QuizType, VocabularyItem } from "@/types";

const SMART_RANDOM_TYPES: QuizType[] = [
  "en-to-vi-choice",
  "vi-to-en-choice",
  "en-to-vi-type",
  "vi-to-en-type"
];

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

export function generateQuizQuestions(
  vocabulary: VocabularyItem[],
  quizType: QuizType,
  count: number,
  wordIds?: string[]
): LocalQuizQuestion[] {
  const pool = wordIds?.length
    ? vocabulary.filter((item) => wordIds.includes(item.id))
    : vocabulary;
  const selected = repeatedSelection(pool, count);

  return selected.map((item, index) => {
    const questionType =
      quizType === "mixed"
        ? SMART_RANDOM_TYPES[index % SMART_RANDOM_TYPES.length]
        : quizType;

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
  });
}

export function evaluateQuizAnswer(question: LocalQuizQuestion, answer: string) {
  if (question.questionType === "fill-blank" || question.questionType === "vi-to-en-type") {
    return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
  }

  if (question.questionType === "en-to-vi-type") {
    return checkAnswer(answer, question.correctAnswer);
  }

  return answer === question.correctAnswer;
}
