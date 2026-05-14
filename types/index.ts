import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | Date | null | undefined;

export type TopicIcon =
  | "HeartPulse"
  | "GraduationCap"
  | "Cpu"
  | "Leaf"
  | "BriefcaseBusiness"
  | "Plane"
  | "Utensils"
  | "Home"
  | "BookOpenCheck"
  | "Target"
  | "Sparkles";

export type MasteryLevel = "new" | "learning" | "familiar" | "mastered" | "weak";
export type Difficulty = "easy" | "medium" | "hard";

export type QuizType =
  | "en-to-vi-choice"
  | "vi-to-en-choice"
  | "en-to-vi-type"
  | "vi-to-en-type"
  | "fill-blank"
  | "flashcard"
  | "mixed";

export type FlashcardRating = "forgot" | "almost" | "remembered" | "mastered";

export type UserProfile = {
  displayName: string;
  email: string;
  createdAt: FirestoreDate;
};

export type Topic = {
  id: string;
  name: string;
  description: string;
  icon: TopicIcon;
  color: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type VocabularyItem = {
  id: string;
  word: string;
  meaningVi: string;
  partOfSpeech: string;
  phonetic: string;
  exampleEn: string;
  exampleVi: string;
  difficulty: Difficulty;
  masteryLevel: MasteryLevel;
  correctCount: number;
  wrongCount: number;
  lastReviewedAt: FirestoreDate;
  nextReviewAt: FirestoreDate;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
};

export type VocabularyWithTopic = VocabularyItem & {
  topicId: string;
  topicName: string;
};

export type QuizAttempt = {
  id: string;
  topicId: string;
  topicName: string;
  quizType: QuizType;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  createdAt: FirestoreDate;
};

export type QuizQuestionRecord = {
  id: string;
  vocabularyId: string;
  questionType: QuizType;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  createdAt: FirestoreDate;
};

export type DictionaryEntry = {
  word: string;
  meaningVi: string;
  partOfSpeech: string;
  phonetic: string;
  exampleEn: string;
  exampleVi: string;
  difficulty: Difficulty;
  topic: string;
};

export type ExtractedVocabulary = {
  word: string;
  frequency: number;
  selected: boolean;
  meaningVi: string;
  partOfSpeech: string;
  phonetic: string;
  exampleEn: string;
  exampleVi: string;
  difficulty: Difficulty;
  exists: boolean;
};

export type LocalQuizQuestion = {
  id: string;
  vocabularyId: string;
  questionType: QuizType;
  prompt: string;
  correctAnswer: string;
  options?: string[];
  blankSentence?: string;
  vocabulary: VocabularyItem;
};
