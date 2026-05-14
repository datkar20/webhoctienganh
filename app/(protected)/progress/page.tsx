"use client";

import Link from "next/link";
import { BarChart3, Target, Trophy } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { useAllVocabulary, useQuizAttempts, useTopics } from "@/lib/firestore-hooks";
import { vocabularyProgressPercent } from "@/lib/progress";

export default function ProgressPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { topics, loading: topicsLoading } = useTopics(user?.uid);
  const { vocabulary, loading: vocabularyLoading } = useAllVocabulary(user?.uid, topics);
  const { attempts, loading: attemptsLoading } = useQuizAttempts(user?.uid, 50);

  const stats = useMemo(() => {
    const totalCorrect = vocabulary.reduce((sum, item) => sum + (item.correctCount ?? 0), 0);
    const totalWrong = vocabulary.reduce((sum, item) => sum + (item.wrongCount ?? 0), 0);
    const mastered = vocabulary.filter((item) => item.masteryLevel === "mastered").length;
    const weak = vocabulary.filter((item) => item.masteryLevel === "weak" || item.wrongCount >= 3).length;
    const accuracy = totalCorrect + totalWrong === 0 ? 0 : Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100);
    const topWrong = [...vocabulary].sort((a, b) => b.wrongCount - a.wrongCount).slice(0, 5);
    const topicProgress = topics.map((topic) => {
      const words = vocabulary.filter((item) => item.topicId === topic.id);
      const masteredWords = words.filter((item) => item.masteryLevel === "mastered").length;
      return {
        topic,
        total: words.length,
        mastered: masteredWords,
        progress: vocabularyProgressPercent(words)
      };
    });
    return { mastered, weak, accuracy, topWrong, topicProgress };
  }, [topics, vocabulary]);

  if (topicsLoading || vocabularyLoading || attemptsLoading) return <LoadingState label={t("loadingProgress")} />;

  if (vocabulary.length === 0) {
    return (
      <EmptyState
        title={t("noProgressData")}
        description={t("noProgressDataDesc")}
        action={
          <Button asChild>
            <Link href="/dashboard">{t("openDashboard")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{t("progressTitle")}</h1>
        <p className="text-sm text-slate-500">{t("progressSubtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric title={t("totalWords")} value={vocabulary.length} icon={<BarChart3 className="h-5 w-5" />} />
        <Metric title={t("mastered")} value={stats.mastered} icon={<Trophy className="h-5 w-5" />} />
        <Metric title={t("weakWordsTitle")} value={stats.weak} icon={<Target className="h-5 w-5" />} />
        <Metric title={t("accuracy")} value={`${stats.accuracy}%`} icon={<Target className="h-5 w-5" />} />
        <Metric title={t("quizAttempts")} value={attempts.length} icon={<BarChart3 className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("topicProgress")}</CardTitle>
            <CardDescription>{t("topicProgressDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topicProgress.map(({ topic, total, mastered, progress }) => (
              <div key={topic.id} className="space-y-2">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">{topic.name}</span>
                  <span className="text-slate-500">
                    {progress}% {t("learned")} - {mastered}/{total} {t("mastered").toLowerCase()}
                  </span>
                </div>
                <Progress value={progress} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("topWrongWords")}</CardTitle>
            <CardDescription>{t("topWrongWordsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topWrong.filter((item) => item.wrongCount > 0).length === 0 ? (
              <EmptyState title={t("noWrongAnswers")} description={t("noWrongAnswersDesc")} />
            ) : (
              stats.topWrong
                .filter((item) => item.wrongCount > 0)
                .map((item) => (
                  <div key={`${item.topicId}-${item.id}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">{item.word}</p>
                        <p className="text-sm text-slate-500">{item.topicName}</p>
                      </div>
                      <Badge variant="rose">{item.wrongCount} wrong</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.meaningVi}</p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-md bg-teal-50 p-2 text-teal-700">{icon}</div>
      </CardContent>
    </Card>
  );
}
