"use client";

import Link from "next/link";
import { Dumbbell, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useAllVocabulary, useTopics } from "@/lib/firestore-hooks";
import { formatDate } from "@/lib/utils";

export default function WeakWordsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { topics, loading: topicsLoading } = useTopics(user?.uid);
  const { vocabulary, loading: vocabularyLoading } = useAllVocabulary(user?.uid, topics);
  const [topicId, setTopicId] = useState("all");

  const weakWords = useMemo(() => {
    return vocabulary
      .filter((item) => item.masteryLevel === "weak" || item.wrongCount >= 3)
      .filter((item) => topicId === "all" || item.topicId === topicId)
      .sort((a, b) => b.wrongCount - a.wrongCount);
  }, [topicId, vocabulary]);

  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const practiceHref =
    topicId !== "all"
      ? `/practice?topicId=${topicId}&wordIds=${weakWords.map((item) => item.id).join(",")}`
      : weakWords[0]
        ? `/practice?topicId=${weakWords[0].topicId}&wordIds=${weakWords
            .filter((item) => item.topicId === weakWords[0].topicId)
            .map((item) => item.id)
            .join(",")}`
        : "/practice";

  if (topicsLoading || vocabularyLoading) return <LoadingState label={t("loadingVocabulary")} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">{t("weakWordsPageTitle")}</h1>
          <p className="text-sm text-slate-500">{t("weakWordsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={topicId} onChange={(event) => setTopicId(event.target.value)} className="w-56">
            <option value="all">All topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </Select>
          <Button asChild disabled={weakWords.length === 0}>
            <Link href={practiceHref}>
              <Dumbbell className="h-4 w-4" />
              Practice weak words
            </Link>
          </Button>
        </div>
      </div>

      {weakWords.length === 0 ? (
        <EmptyState
          title="No weak words"
          description="Words will appear here after incorrect answers or when they are manually marked as weak."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{selectedTopic ? selectedTopic.name : "All weak words"}</CardTitle>
            <CardDescription>{weakWords.length} words need attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weakWords.map((item) => (
              <div key={`${item.topicId}-${item.id}`} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <p className="text-lg font-semibold text-slate-950">{item.word}</p>
                      <Badge variant="rose">{item.wrongCount} wrong</Badge>
                      <Badge variant="outline">{item.topicName}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.meaningVi}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.exampleEn}</p>
                  </div>
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p>{item.correctCount} correct</p>
                    <p>Next review: {formatDate(item.nextReviewAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
