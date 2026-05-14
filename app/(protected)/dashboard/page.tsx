"use client";

import Link from "next/link";
import { BookOpenCheck, Brain, CalendarClock, Database, Dumbbell, Loader2, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { createDemoData } from "@/lib/demo-data";
import { useAllVocabulary, useQuizAttempts, useTopics } from "@/lib/firestore-hooks";
import { formatDate, isDueToday, percent, quizTypeLabel } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const { topics, loading: topicsLoading } = useTopics(user?.uid);
  const { vocabulary, loading: vocabularyLoading } = useAllVocabulary(user?.uid, topics);
  const { attempts, loading: attemptsLoading } = useQuizAttempts(user?.uid, 5);
  const [creatingDemo, setCreatingDemo] = useState(false);

  const stats = useMemo(() => {
    const mastered = vocabulary.filter((item) => item.masteryLevel === "mastered").length;
    const learning = vocabulary.filter((item) => item.masteryLevel === "learning").length;
    const weak = vocabulary.filter((item) => item.masteryLevel === "weak" || item.wrongCount >= 3).length;
    const due = vocabulary.filter((item) => isDueToday(item.nextReviewAt)).length;
    return {
      mastered,
      learning,
      weak,
      due,
      totalWords: vocabulary.length,
      topicCount: topics.length
    };
  }, [topics.length, vocabulary]);

  async function handleCreateDemoData() {
    if (!user) return;
    setCreatingDemo(true);
    try {
      const result = await createDemoData(user.uid, user.email);
      toast.success(`Created ${result.topics} demo topics and ${result.words} words`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create demo data");
    } finally {
      setCreatingDemo(false);
    }
  }

  const loading = topicsLoading || vocabularyLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-teal-700">VocabVault</p>
          <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">Track your topics, review queue, and recent quiz activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/topics">Manage topics</Link>
          </Button>
          <Button onClick={handleCreateDemoData} disabled={creatingDemo}>
            {creatingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Create demo data
          </Button>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading dashboard..." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard title="Topics" value={stats.topicCount} icon={<BookOpenCheck className="h-5 w-5" />} />
            <StatCard title="Words" value={stats.totalWords} icon={<Brain className="h-5 w-5" />} />
            <StatCard title="Mastered" value={stats.mastered} icon={<BookOpenCheck className="h-5 w-5" />} />
            <StatCard title="Learning" value={stats.learning} icon={<Dumbbell className="h-5 w-5" />} />
            <StatCard title="Weak" value={stats.weak} icon={<ShieldAlert className="h-5 w-5" />} />
            <StatCard title="Review today" value={stats.due} icon={<CalendarClock className="h-5 w-5" />} />
          </div>

          {stats.totalWords === 0 ? (
            <EmptyState
              title="No vocabulary yet"
              description="Create a topic and add words manually, extract from text, or generate demo data to explore the app."
              action={
                <Button onClick={handleCreateDemoData} disabled={creatingDemo}>
                  {creatingDemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  Create demo data
                </Button>
              }
            />
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <CardHeader>
                <CardTitle>Topic Progress</CardTitle>
                <CardDescription>Mastered percentage by topic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topics.length === 0 ? (
                  <EmptyState
                    title="No topics"
                    description="Topics group your words by theme, exam goal, or personal learning plan."
                  />
                ) : (
                  topics.slice(0, 6).map((topic) => {
                    const topicWords = vocabulary.filter((item) => item.topicId === topic.id);
                    const mastered = topicWords.filter((item) => item.masteryLevel === "mastered").length;
                    const progress = percent(mastered, topicWords.length);
                    return (
                      <div key={topic.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <Link href={`/topics/${topic.id}`} className="font-medium text-slate-800 hover:text-teal-700">
                            {topic.name}
                          </Link>
                          <span className="text-slate-500">{progress}%</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Quizzes</CardTitle>
                <CardDescription>Your latest saved attempts.</CardDescription>
              </CardHeader>
              <CardContent>
                {attemptsLoading ? (
                  <LoadingState label="Loading attempts..." className="min-h-32" />
                ) : attempts.length === 0 ? (
                  <EmptyState
                    title="No quiz attempts"
                    description="Practice a topic to save score, questions, and wrong answers."
                    action={
                      <Button variant="outline" asChild>
                        <Link href="/practice">Start practice</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {attempts.map((attempt) => (
                      <Link
                        key={attempt.id}
                        href={`/practice/results/${attempt.id}`}
                        className="block rounded-md border border-slate-200 p-3 transition hover:border-teal-200 hover:bg-teal-50/50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{attempt.topicName}</p>
                            <p className="text-xs text-slate-500">{quizTypeLabel(attempt.quizType)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-teal-700">{attempt.score}%</p>
                            <p className="text-xs text-slate-500">{formatDate(attempt.createdAt)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
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
