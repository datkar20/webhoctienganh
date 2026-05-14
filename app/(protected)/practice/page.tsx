"use client";

import { addDoc, collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { CheckCircle2, Eye, Loader2, Play, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
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
  const { language, t } = useLanguage();
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

  if (topicsLoading) return <LoadingState label={t("loadingTopics")} />;
  if (topicsError) {
    return (
      <EmptyState
        title={t("couldNotLoadTopics")}
        description={topicsError.message}
        action={
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{t("practiceTitle")}</h1>
        <p className="text-sm text-slate-500">{t("practiceSubtitle")}</p>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title={t("noTopicsPractice")}
          description={t("noTopicsPracticeDesc")}
        />
      ) : !inQuiz ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("quizSetup")}</CardTitle>
            <CardDescription>
              {retryWordIds.length > 0
                ? `Retry mode: ${retryWordIds.length} selected wrong words.`
                : t("practiceAll")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="topic">{t("topic")}</Label>
                <Select id="topic" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quizType">{t("quizType")}</Label>
                <Select id="quizType" value={quizType} onChange={(event) => setQuizType(event.target.value as QuizType)}>
                  {quizTypes.map((type) => (
                    <option key={type} value={type}>
                      {localizedQuizTypeLabel(type, language)}
                    </option>
                  ))}
                </Select>
                {quizType === "mixed" ? <p className="text-xs leading-5 text-slate-500">{t("randomHint")}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="count">{t("questions")}</Label>
                <Select id="count" value={String(questionCount)} onChange={(event) => setQuestionCount(Number(event.target.value))}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </Select>
              </div>
            </div>
            {vocabularyLoading ? (
              <LoadingState label={t("loadingVocabulary")} className="min-h-24" />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  {t("availableWords")}: <span className="font-semibold text-slate-900">{availableVocabulary.length}</span>
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
              {t("startQuiz")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>
                  {t("question")} {currentIndex + 1} {t("of")} {questions.length}
                </CardTitle>
                <CardDescription>{selectedTopic?.name} - {localizedQuizTypeLabel(currentQuestion.questionType, language)}</CardDescription>
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
              onChoiceAnswer={(answer) => submitAnswer(answer)}
              onShowBack={() => setShowBack(true)}
              onFlashcardRating={(rating) => submitAnswer(rating, rating)}
              t={t}
            />

            {feedback ? (
              <FeedbackOverlay feedback={feedback} saving={saving} isLast={currentIndex + 1 >= questions.length} onNext={goNext} t={t} />
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              {!feedback && currentQuestion.questionType !== "flashcard" && !currentQuestion.options ? (
                <Button
                  onClick={() => submitAnswer(currentQuestion.options ? selectedAnswer : inputAnswer)}
                  disabled={saving || (!selectedAnswer && !inputAnswer)}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("submitAnswer")}
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
  onChoiceAnswer,
  onShowBack,
  onFlashcardRating,
  t
}: {
  question: LocalQuizQuestion;
  inputAnswer: string;
  selectedAnswer: string;
  showBack: boolean;
  disabled: boolean;
  onInputAnswer: (value: string) => void;
  onChoiceAnswer: (value: string) => void;
  onShowBack: () => void;
  onFlashcardRating: (rating: FlashcardRating) => void;
  t: (key: Parameters<ReturnType<typeof useLanguage>["t"]>[0]) => string;
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
            {question.vocabulary.imageUrl ? (
              <div className="mb-4 h-44 overflow-hidden rounded-lg border border-teal-100 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.vocabulary.imageUrl}
                  alt={`Illustration for ${question.vocabulary.word}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
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
        <Prompt question={question} t={t} />
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChoiceAnswer(option)}
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
      <Prompt question={question} t={t} />
      <div className="space-y-2">
        <Label htmlFor="answer">{t("yourAnswer")}</Label>
        <Input
          id="answer"
          value={inputAnswer}
          disabled={disabled}
          onChange={(event) => onInputAnswer(event.target.value)}
          placeholder={question.questionType === "en-to-vi-type" ? t("typeVi") : t("typeEn")}
        />
      </div>
    </div>
  );
}

function Prompt({ question, t }: { question: LocalQuizQuestion; t?: (key: Parameters<ReturnType<typeof useLanguage>["t"]>[0]) => string }) {
  const translate = t ?? ((key: string) => key);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <p className="text-sm font-medium text-slate-500">
        {question.questionType === "en-to-vi-type" || question.questionType === "en-to-vi-choice"
          ? translate(question.questionType === "en-to-vi-choice" ? "chooseVi" : "typeVi")
          : question.questionType === "fill-blank"
            ? translate("completeSentence")
            : translate(question.questionType === "vi-to-en-choice" ? "chooseEn" : "typeEn")}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{question.blankSentence ?? question.prompt}</p>
    </div>
  );
}

function FeedbackOverlay({
  feedback,
  saving,
  isLast,
  onNext,
  t
}: {
  feedback: AnswerRecord;
  saving: boolean;
  isLast: boolean;
  onNext: () => void;
  t: (key: Parameters<ReturnType<typeof useLanguage>["t"]>[0]) => string;
}) {
  const imageUrl = feedback.question.vocabulary.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-soft transition ${
          feedback.isCorrect ? "border-emerald-200" : "border-rose-200"
        }`}
      >
        {imageUrl ? (
          <div className="h-52 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={`Illustration for ${feedback.question.vocabulary.word}`} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="p-6 text-center">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              feedback.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {feedback.isCorrect ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          </div>
          <h3 className="mt-4 text-2xl font-bold text-slate-950">{feedback.isCorrect ? t("correct") : t("notQuite")}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {t("correctAnswer")}: <span className="font-semibold text-slate-900">{feedback.question.correctAnswer}</span>
          </p>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left">
            <p className="text-lg font-semibold text-slate-950">{feedback.question.vocabulary.word}</p>
            <p className="text-sm text-slate-600">{feedback.question.vocabulary.meaningVi}</p>
            <p className="mt-2 text-xs text-slate-500">{feedback.question.vocabulary.partOfSpeech} {feedback.question.vocabulary.phonetic}</p>
          </div>
          <Button className="mt-5 w-full" onClick={onNext} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLast ? t("finishQuiz") : t("nextQuestion")}
          </Button>
        </div>
      </div>
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

function localizedQuizTypeLabel(type: QuizType, language: "en" | "vi") {
  if (language === "vi") {
    const labels: Record<QuizType, string> = {
      "en-to-vi-choice": "Trắc nghiệm Anh -> Việt",
      "vi-to-en-choice": "Trắc nghiệm Việt -> Anh",
      "en-to-vi-type": "Gõ nghĩa tiếng Việt",
      "vi-to-en-type": "Gõ từ tiếng Anh",
      "fill-blank": "Điền từ vào câu",
      flashcard: "Flashcard tự ôn",
      mixed: "Random thông minh"
    };
    return labels[type];
  }

  return quizTypeLabel(type);
}
