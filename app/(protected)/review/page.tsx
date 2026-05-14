"use client";

import Link from "next/link";
import { CalendarClock, Dumbbell, PenLine } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAllVocabulary, useTopics } from "@/lib/firestore-hooks";
import { formatDate, isDueToday, masteryLabel } from "@/lib/utils";

export default function ReviewPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { topics, loading: topicsLoading } = useTopics(user?.uid);
  const { vocabulary, loading: vocabularyLoading } = useAllVocabulary(user?.uid, topics);

  const groupedDue = useMemo(() => {
    const dueWords = vocabulary.filter((item) => isDueToday(item.nextReviewAt));
    return topics
      .map((topic) => ({
        topic,
        words: dueWords.filter((item) => item.topicId === topic.id)
      }))
      .filter((group) => group.words.length > 0);
  }, [topics, vocabulary]);

  if (topicsLoading || vocabularyLoading) return <LoadingState label={t("loadingVocabulary")} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{t("reviewTitle")}</h1>
        <p className="text-sm text-slate-500">{t("reviewSubtitle")}</p>
      </div>

      {groupedDue.length === 0 ? (
        <EmptyState
          title={t("nothingDueToday")}
          description={t("nothingDueTodayDesc")}
          action={
            <Button variant="outline" asChild>
              <Link href="/practice">{t("openPractice")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedDue.map(({ topic, words }) => {
            const wordIds = words.map((word) => word.id).join(",");
            return (
              <Card key={topic.id}>
                <CardHeader>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-teal-700" />
                        {topic.name}
                      </CardTitle>
                      <CardDescription>{words.length} {t("wordsDueForReview")}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" asChild>
                        <Link href={`/practice?topicId=${topic.id}&wordIds=${wordIds}&quizType=mixed`}>
                          <Dumbbell className="h-4 w-4" />
                          {t("smartReview")}
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href={`/practice?topicId=${topic.id}&wordIds=${wordIds}&quizType=sentence-writing`}>
                          <PenLine className="h-4 w-4" />
                          {t("sentenceDrill")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {words.map((item) => (
                    <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{item.word}</p>
                        <Badge variant={item.masteryLevel === "weak" ? "rose" : "outline"}>
                          {masteryLabel(item.masteryLevel)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.meaningVi}</p>
                      <p className="mt-2 text-xs text-slate-500">{t("due")}: {formatDate(item.nextReviewAt)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
