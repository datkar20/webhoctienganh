"use client";

import Link from "next/link";
import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { Dumbbell, Edit2, Eye, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TopicFormDialog } from "@/components/forms/topic-form-dialog";
import { TopicIconView } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/components/i18n/language-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { db } from "@/lib/firebase";
import { useAllVocabulary, useTopics } from "@/lib/firestore-hooks";
import { vocabularyProgressPercent } from "@/lib/progress";
import type { Topic } from "@/types";

export default function TopicsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { topics, loading: topicsLoading, error: topicsError } = useTopics(user?.uid);
  const { vocabulary, loading: vocabularyLoading } = useAllVocabulary(user?.uid, topics);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [deleting, setDeleting] = useState(false);

  const topicStats = useMemo(() => {
    return topics.reduce<Record<string, { words: number; mastered: number; progress: number }>>((acc, topic) => {
      const words = vocabulary.filter((item) => item.topicId === topic.id);
      const mastered = words.filter((item) => item.masteryLevel === "mastered").length;
      acc[topic.id] = {
        words: words.length,
        mastered,
        progress: vocabularyProgressPercent(words)
      };
      return acc;
    }, {});
  }, [topics, vocabulary]);

  function openCreate() {
    setEditingTopic(null);
    setFormOpen(true);
  }

  function openEdit(topic: Topic) {
    setEditingTopic(topic);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!user || !deletingTopic) return;
    setDeleting(true);
    try {
      const vocabularySnapshot = await getDocs(
        collection(db, "users", user.uid, "topics", deletingTopic.id, "vocabulary")
      );
      const batch = writeBatch(db);
      vocabularySnapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
      await deleteDoc(doc(db, "users", user.uid, "topics", deletingTopic.id));
      toast.success("Topic deleted");
      setDeletingTopic(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete topic");
    } finally {
      setDeleting(false);
    }
  }

  const loading = topicsLoading || vocabularyLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">{t("topicsTitle")}</h1>
          <p className="text-sm text-slate-500">{t("topicsSubtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("newTopic")}
        </Button>
      </div>

      {topicsError ? (
        <EmptyState
          title={t("couldNotLoadTopics")}
          description={topicsError.message}
          action={
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              {t("retry")}
            </Button>
          }
        />
      ) : loading ? (
        <LoadingState label={t("loadingTopics")} />
      ) : topics.length === 0 ? (
        <EmptyState
          title={t("noTopicsYet")}
          description={t("noTopicsYetDesc")}
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("createTopic")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => {
            const stats = topicStats[topic.id] ?? { words: 0, progress: 0, mastered: 0 };
            return (
              <Card key={topic.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: topic.color }} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-md text-white"
                        style={{ backgroundColor: topic.color }}
                      >
                        <TopicIconView icon={topic.icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{topic.name}</CardTitle>
                        <CardDescription>{stats.words} {t("words")}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(topic)} aria-label="Edit topic">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTopic(topic)}
                        aria-label="Delete topic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="min-h-10 text-sm text-slate-500">{topic.description || t("noDescriptionYet")}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{t("progress")}</span>
                      <span>{stats.progress}% {t("learned")}</span>
                    </div>
                    <Progress value={stats.progress} />
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/topics/${topic.id}`}>
                      <Eye className="h-4 w-4" />
                      {t("viewWords")}
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href={`/practice?topicId=${topic.id}`}>
                      <Dumbbell className="h-4 w-4" />
                      {t("practice")}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {user ? (
        <TopicFormDialog open={formOpen} userId={user.uid} topic={editingTopic} onClose={() => setFormOpen(false)} />
      ) : null}
      <ConfirmDialog
        open={Boolean(deletingTopic)}
        title={t("deleteTopic")}
        description={`Delete "${deletingTopic?.name ?? "this topic"}" and all words inside it?`}
        confirmText={t("deleteTopic")}
        loading={deleting}
        onCancel={() => setDeletingTopic(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
