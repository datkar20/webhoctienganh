"use client";

import Link from "next/link";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { db } from "@/lib/firebase";
import { formatDate, quizTypeLabel } from "@/lib/utils";
import type { QuizAttempt, QuizQuestionRecord } from "@/types";

export default function QuizResultPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params.id;
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !attemptId) return;

    async function loadResult() {
      setLoading(true);
      const attemptRef = doc(db, "users", user!.uid, "quizAttempts", attemptId);
      const attemptSnapshot = await getDoc(attemptRef);
      if (attemptSnapshot.exists()) {
        setAttempt({ id: attemptSnapshot.id, ...attemptSnapshot.data() } as QuizAttempt);
        const questionsSnapshot = await getDocs(query(collection(attemptRef, "questions"), orderBy("createdAt", "asc")));
        setQuestions(
          questionsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() }) as QuizQuestionRecord)
        );
      }
      setLoading(false);
    }

    void loadResult();
  }, [attemptId, user]);

  const wrongQuestions = useMemo(() => questions.filter((question) => !question.isCorrect), [questions]);
  const retryHref =
    attempt && wrongQuestions.length
      ? `/practice?topicId=${attempt.topicId}&wordIds=${wrongQuestions.map((question) => question.vocabularyId).join(",")}`
      : "/practice";

  if (loading) return <LoadingState label="Loading quiz result..." />;

  if (!attempt) {
    return <EmptyState title="Result not found" description="This quiz attempt does not exist in your account." />;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Result</CardTitle>
            <CardDescription>
              {attempt.topicName} - {quizTypeLabel(attempt.quizType)} - {formatDate(attempt.createdAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="text-center">
              <p className="text-sm text-slate-500">Score</p>
              <p className="text-6xl font-bold text-teal-700">{attempt.score}%</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{attempt.correctAnswers}</p>
                <p className="text-xs text-emerald-900">Correct</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4 text-center">
                <p className="text-2xl font-bold text-rose-700">{attempt.totalQuestions - attempt.correctAnswers}</p>
                <p className="text-xs text-rose-900">Wrong</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild disabled={wrongQuestions.length === 0}>
                <Link href={retryHref}>
                  <RotateCcw className="h-4 w-4" />
                  Retry wrong words
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wrong Answers</CardTitle>
            <CardDescription>Review these words first in your next practice round.</CardDescription>
          </CardHeader>
          <CardContent>
            {wrongQuestions.length === 0 ? (
              <EmptyState title="Clean round" description="No wrong answers in this attempt." />
            ) : (
              <div className="space-y-3">
                {wrongQuestions.map((question) => (
                  <div key={question.id} className="rounded-lg border border-rose-100 bg-rose-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="rose">Wrong</Badge>
                      <Badge variant="outline">{quizTypeLabel(question.questionType)}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900">{question.prompt}</p>
                    <p className="mt-2 text-sm text-rose-900">Your answer: {question.userAnswer || "No answer"}</p>
                    <p className="text-sm text-emerald-900">Correct answer: {question.correctAnswer}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
