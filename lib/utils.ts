import { type ClassValue, clsx } from "clsx";
import { Timestamp } from "firebase/firestore";
import { twMerge } from "tailwind-merge";
import type { FirestoreDate, MasteryLevel, QuizType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDate(value: FirestoreDate): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  return null;
}

export function formatDate(value: FirestoreDate) {
  const date = toDate(value);
  if (!date) return "Not reviewed";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function isDueToday(value: FirestoreDate) {
  const date = toDate(value);
  if (!date) return true;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date <= endOfToday;
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function masteryLabel(level: MasteryLevel) {
  const labels: Record<MasteryLevel, string> = {
    new: "New",
    learning: "Learning",
    familiar: "Familiar",
    mastered: "Mastered",
    weak: "Weak"
  };
  return labels[level];
}

export function quizTypeLabel(type: QuizType) {
  const labels: Record<QuizType, string> = {
    "en-to-vi-choice": "English -> Vietnamese choice",
    "vi-to-en-choice": "Vietnamese -> English choice",
    "en-to-vi-type": "Type Vietnamese meaning",
    "vi-to-en-type": "Type English word",
    "fill-blank": "Fill in blank",
    "sentence-writing": "Write a sentence",
    flashcard: "Flashcard",
    mixed: "Random smart mix"
  };
  return labels[type];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function randomId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
