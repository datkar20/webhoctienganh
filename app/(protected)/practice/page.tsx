"use client";

import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { CheckCircle2, Eye, Loader2, Play, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { useTopics, useVocabulary } from "@/lib/firestore-hooks";
import { evaluateQuizAnswer, generateQuizQuestions } from "@/lib/quiz";
import { updateVocabularyAfterAnswer } from "@/lib/spaced-repetition";
import { quizTypeLabel } from "@/lib/utils";
import type { FlashcardRating, LocalQuizQuestion, QuizType } from "@/types";

type AnswerRecord = {
  question: LocalQuizQuestion;
  userAnswer: string;
  isCorrect: boolean;
};

const quizTypes: QuizType[] = [
  "en-to-vi-choice",
  "vi-to-en-choice",
  "en-to-vi-type",
  "vi-to-en-type",
  "fill-blank",
  "flashcard",
  "mixed"
];

export default function PracticePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { topics, loading: topicsLoading, error: topicsError } = useTopics(user?.uid);
  const [topicId, setTopicId] = useState("");
  const [quizType, setQuizType] = useState<QuizType>("en-to-vi-choice");
  const [questionCount, setQuestionCount] = useState(10);
  const [retryWordIds, setRetryWordIds] = useState<string[]>([]);
  const { vocabulary, loading: vocabularyLoading } = useVocabulary(user?.uid, topicId);
  const [questions, setQuestions] = useState<LocalQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputAnswer, setInputAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<AnswerRecord | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [showBack, setShowBack] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialTopicId = params.get("topicId");
    const initialWordIds = params.get("wordIds");
    const initialQuizType = params.get("quizType") as QuizType | null;
    if (initialTopicId) setTopicId(initialTopicId);
    if (initialWordIds) setRetryWordIds(initialWordIds.split(",").filter(Boolean));
    if (initialQuizType && quizTypes.includes(initialQuizType)) setQuizType(initialQuizType);
  }, []);

  useEffect(() => {
    if (!topicId && topics.length > 0) setTopicId(topics[0].id);
  }, [topicId, topics]);

  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const availableVocabulary = useMemo(() => {
    if (retryWordIds.length === 0) return vocabulary;
    return vocabulary.filter((item) => retryWordIds.includes(item.id));
  }, [retryWordIds, vocabulary]);

  const currentQuestion = questions[currentIndex];
  const inQuiz = questions.length > 0;

  function startQuiz() {
    if (!topicId) {
      toast.error("Choose a topic first");
      return;
    }
    if (availableVocabulary.length === 0) {
      toast.error("This topic has no vocabulary to practice");
      return;
    }

    const nextQuestions = generateQuizQuestions(
      vocabulary,
      quizType,
      Math.min(questionCount, availableVocabulary.length),
      retryWordIds.length ? retryWordIds : undefined
    );
    setQuestions(nextQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setFeedback(null);
    setInputAnswer("");
    setSelectedAnswer("");
    setShowBack(false);
  }

  async function applyVocabularyUpdate(
    question: LocalQuizQuestion,
    isCorrect: boolean,
    flashcardRating?: FlashcardRating
  ) {
    if (!user || !topicId) return;
    const update = updateVocabularyAfterAnswer(question.vocabulary, isCorrect, flashcardRating);
    await updateDoc(doc(db, "users", user.uid, "topics", topicId, "vocabulary", question.vocabularyId), {
      ...update,
      updatedAt: serverTimestamp()
    });
  }

  async function submitAnswer(answer: string, flashcardRating?: FlashcardRating) {
    if (!currentQuestion || feedback) return;
    const isFlashcard = currentQuestion.questionType === "flashcard";
    const isCorrect = isFlashcard ? flashcardRating !== "forgot" : evaluateQuizAnswer(currentQuestion, answer);
    const userAnswer = isFlashcard ? ratingLabel(flashcardRating ?? "forgot") : answer;

    setSaving(true);
    try {
      await applyVocabularyUpdate(currentQuestion, isCorrect, flashcardRating);
      const record = { question: currentQuestion, userAnswer, isCorrect };
      const nextAnswers = [...answers, record];
      setAnswers(nextAnswers);
      setFeedback(record);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update word progress");
    } finally {
      setSaving(false);
    }
  }

  async function finishQuiz(finalAnswers: AnswerRecord[]) {
    if (!user || !selectedTopic) return;
    setSaving(true);
    try {
      const correctAnswers = finalAnswers.filter((answer) => answer.isCorrect).length;
      const score = Math.round((correctAnswers / finalAnswers.length) * 100);
      const attemptRef = await addDoc(collection(db, "users", user.uid, "quizAttempts"), {
        topicId: selectedTopic.id,
        topicName: selectedTopic.name,
        quizType,
        totalQuestions: finalAnswers.length,
        correctAnswers,
        score,
        createdAt: serverTimestamp()
      });

      const batch = writeBatch(db);
      finalAnswers.forEach((answer) => {
        batch.set(doc(collection(attemptRef, "questions")), {
          vocabularyId: answer.question.vocabularyId,
          questionType: answer.question.questionType,
          prompt: answer.question.blankSentence ?? answer.question.prompt,
          userAnswer: answer.userAnswer,
          correctAnswer: answer.question.correctAnswer,
          isCorrect: answer.isCorrect,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success("Quiz saved");
      router.push(`/practice/results/${attemptRef.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save quiz result");
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      void finishQuiz(answers);
      return;
    }
    setCurrentIndex(nextIndex);
    setInputAnswer("");
    setSelectedAnswer("");
    setFeedback(null);
    setShowBack(false);
  }

  if (topicsLoading) return <LoadingState label="Loading topics..." />;
  if (topicsError) {
    return (
      <EmptyState
        title="Could not load topics"
        description={topicsError.message}
        action={
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Practice</h1>
        <p className="text-sm text-slate-500">Choose a topic, quiz type, and question count. Results are saved automatically.</p>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title="No topics to practice"
          description="Create a topic and add vocabulary before starting a quiz."
        />
      ) : !inQuiz ? (
        <Card>
          <CardHeader>
            <CardTitle>Quiz Setup</CardTitle>
            <CardDescription>
              {retryWordIds.length > 0
                ? `Retry mode: ${retryWordIds.length} selected wrong words.`
                : "Practice all words from a topic."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Select id="topic" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quizType">Quiz type</Label>
                <Select id="quizType" value={quizType} onChange={(event) => setQuizType(event.target.value as QuizType)}>
                  {quizTypes.map((type) => (
                    <option key={type} value={type}>
                      {quizTypeLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">Questions</Label>
                <Select id="count" value={String(questionCount)} onChange={(event) => setQuestionCount(Number(event.target.value))}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </Select>
              </div>
            </div>
            {vocabularyLoading ? (
              <LoadingState label="Loading vocabulary..." className="min-h-24" />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  Available words: <span className="font-semibold text-slate-900">{availableVocabulary.length}</span>
                </p>
                {availableVocabulary.length < questionCount ? (
                  <p className="mt-1 text-xs text-amber-700">
                    The quiz will use {availableVocabulary.length} questions because this pool has fewer words.
                  </p>
                ) : null}
              </div>
            )}
            <Button onClick={startQuiz} disabled={vocabularyLoading || availableVocabulary.length === 0}>
              <Play className="h-4 w-4" />
              Start quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>
                  Question {currentIndex + 1} of {questions.length}
                </CardTitle>
                <CardDescription>{selectedTopic?.name} - {quizTypeLabel(currentQuestion.questionType)}</CardDescription>
              </div>
              <Badge variant="outline">{answers.filter((answer) => answer.isCorrect).length} correct</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <QuestionView
              question={currentQuestion}
              inputAnswer={inputAnswer}
              selectedAnswer={selectedAnswer}
              showBack={showBack}
              disabled={Boolean(feedback) || saving}
              onInputAnswer={setInputAnswer}
              onSelectedAnswer={setSelectedAnswer}
              onShowBack={() => setShowBack(true)}
              onFlashcardRating={(rating) => submitAnswer(rating, rating)}
            />

            {feedback ? (
              <div
                className={
                  feedback.isCorrect
                    ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                    : "rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900"
                }
              >
                <div className="flex items-center gap-2 font-semibold">
                  {feedback.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  {feedback.isCorrect ? "Correct" : "Not quite"}
                </div>
                <p className="mt-1 text-sm">Correct answer: {feedback.question.correctAnswer}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {!feedback && currentQuestion.questionType !== "flashcard" ? (
                <Button
                  onClick={() => submitAnswer(currentQuestion.options ? selectedAnswer : inputAnswer)}
                  disabled={saving || (!selectedAnswer && !inputAnswer)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit answer
                </Button>
              ) : null}
              {feedback ? (
                <Button onClick={goNext} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentIndex + 1 >= questions.length ? "Finish quiz" : "Next question"}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuestionView({
  question,
  inputAnswer,
  selectedAnswer,
  showBack,
  disabled,
  onInputAnswer,
  onSelectedAnswer,
  onShowBack,
  onFlashcardRating
}: {
  question: LocalQuizQuestion;
  inputAnswer: string;
  selectedAnswer: string;
  showBack: boolean;
  disabled: boolean;
  onInputAnswer: (value: string) => void;
  onSelectedAnswer: (value: string) => void;
  onShowBack: () => void;
  onFlashcardRating: (rating: FlashcardRating) => void;
}) {
  if (question.questionType === "flashcard") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">Front</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{question.vocabulary.word}</p>
          <p className="mt-2 text-sm text-slate-500">{question.vocabulary.phonetic}</p>
        </div>
        {showBack ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-5">
            <p className="text-lg font-semibold text-teal-950">{question.vocabulary.meaningVi}</p>
            <p className="mt-1 text-sm text-teal-800">
              {question.vocabulary.partOfSpeech} {question.vocabulary.phonetic}
            </p>
            <p className="mt-3 text-sm font-medium text-teal-950">{question.vocabulary.exampleEn}</p>
            <p className="mt-1 text-sm text-teal-800">{question.vocabulary.exampleVi}</p>
          </div>
        ) : (
          <Button variant="outline" onClick={onShowBack}>
            <Eye className="h-4 w-4" />
            Show answer
          </Button>
        )}
        {showBack ? (
          <div className="grid gap-2 sm:grid-cols-4">
            <Button variant="outline" disabled={disabled} onClick={() => onFlashcardRating("forgot")}>
              Chưa nhớ
            </Button>
            <Button variant="outline" disabled={disabled} onClick={() => onFlashcardRating("almost")}>
              Hơi nhớ
            </Button>
            <Button variant="secondary" disabled={disabled} onClick={() => onFlashcardRating("remembered")}>
              Đã nhớ
            </Button>
            <Button disabled={disabled} onClick={() => onFlashcardRating("mastered")}>
              Rất thuộc
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  if (question.options) {
    return (
      <div className="space-y-4">
        <Prompt question={question} />
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onSelectedAnswer(option)}
              className={`rounded-lg border p-4 text-left text-sm font-medium transition ${
                selectedAnswer === option
                  ? "border-teal-500 bg-teal-50 text-teal-950"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Prompt question={question} />
      <div className="space-y-2">
        <Label htmlFor="answer">Your answer</Label>
        <Input
          id="answer"
          value={inputAnswer}
          disabled={disabled}
          onChange={(event) => onInputAnswer(event.target.value)}
          placeholder={question.questionType === "en-to-vi-type" ? "Type Vietnamese meaning..." : "Type English word..."}
        />
      </div>
    </div>
  );
}

function Prompt({ question }: { question: LocalQuizQuestion }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm font-medium text-slate-500">
        {question.questionType === "en-to-vi-type" || question.questionType === "en-to-vi-choice"
          ? "Choose or type the Vietnamese meaning"
          : question.questionType === "fill-blank"
            ? "Complete the sentence"
            : "Choose or type the English word"}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{question.blankSentence ?? question.prompt}</p>
    </div>
  );
}

function ratingLabel(rating: FlashcardRating) {
  const labels: Record<FlashcardRating, string> = {
    forgot: "Chưa nhớ",
    almost: "Hơi nhớ",
    remembered: "Đã nhớ",
    mastered: "Rất thuộc"
  };
  return labels[rating];
}
