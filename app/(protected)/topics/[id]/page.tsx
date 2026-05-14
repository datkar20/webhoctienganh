"use client";

import Link from "next/link";
import { deleteDoc, doc } from "firebase/firestore";
import { ArrowLeft, Dumbbell, Edit2, Plus, Search, Trash2, Wand2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { VocabularyFormDialog } from "@/components/forms/vocabulary-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { useTopics, useVocabulary } from "@/lib/firestore-hooks";
import { formatDate, masteryLabel } from "@/lib/utils";
import type { MasteryLevel, VocabularyItem } from "@/types";

const filters: ("all" | MasteryLevel)[] = ["all", "new", "learning", "familiar", "mastered", "weak"];

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const topicId = params.id;
  const { user } = useAuth();
  const { topics } = useTopics(user?.uid);
  const topic = topics.find((item) => item.id === topicId);
  const { vocabulary, loading } = useVocabulary(user?.uid, topicId);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MasteryLevel>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingVocabulary, setEditingVocabulary] = useState<VocabularyItem | null>(null);
  const [deletingVocabulary, setDeletingVocabulary] = useState<VocabularyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredVocabulary = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vocabulary.filter((item) => {
      const matchesQuery =
        !query ||
        item.word.toLowerCase().includes(query) ||
        item.meaningVi.toLowerCase().includes(query) ||
        item.exampleEn.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || item.masteryLevel === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, search, vocabulary]);

  function openCreate() {
    setEditingVocabulary(null);
    setFormOpen(true);
  }

  function openEdit(item: VocabularyItem) {
    setEditingVocabulary(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!user || !deletingVocabulary) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users", user.uid, "topics", topicId, "vocabulary", deletingVocabulary.id));
      toast.success("Vocabulary deleted");
      setDeletingVocabulary(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete vocabulary");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
            <Link href="/topics">
              <ArrowLeft className="h-4 w-4" />
              Topics
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-950">{topic?.name ?? "Topic detail"}</h1>
          <p className="text-sm text-slate-500">{topic?.description ?? "Manage vocabulary in this topic."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/extract?topicId=${topicId}`}>
              <Wand2 className="h-4 w-4" />
              Extract from text
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/practice?topicId=${topicId}`}>
              <Dumbbell className="h-4 w-4" />
              Practice this topic
            </Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add word
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search word, meaning, or example..."
              className="pl-9"
            />
          </div>
          <Select value={filter} onChange={(event) => setFilter(event.target.value as "all" | MasteryLevel)}>
            {filters.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "All mastery levels" : masteryLabel(item)}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingState label="Loading vocabulary..." />
      ) : filteredVocabulary.length === 0 ? (
        <EmptyState
          title={vocabulary.length === 0 ? "No words in this topic" : "No matching words"}
          description={
            vocabulary.length === 0
              ? "Add words manually or extract vocabulary from an English paragraph."
              : "Adjust your search or mastery filter to find more words."
          }
          action={
            vocabulary.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add first word
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredVocabulary.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.word}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {item.phonetic || "No phonetic"} {item.partOfSpeech ? `- ${item.partOfSpeech}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit word">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingVocabulary(item)}
                      aria-label="Delete word"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={item.masteryLevel === "weak" ? "rose" : item.masteryLevel === "mastered" ? "green" : "teal"}>
                    {masteryLabel(item.masteryLevel)}
                  </Badge>
                  <Badge variant="outline">{item.difficulty}</Badge>
                  <Badge variant="outline">
                    {item.correctCount} correct / {item.wrongCount} wrong
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Meaning</p>
                  <p className="text-sm text-slate-600">{item.meaningVi}</p>
                </div>
                {item.exampleEn ? (
                  <div className="rounded-md bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-slate-800">{item.exampleEn}</p>
                    <p className="mt-1 text-slate-500">{item.exampleVi}</p>
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">Next review: {formatDate(item.nextReviewAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user ? (
        <VocabularyFormDialog
          open={formOpen}
          userId={user.uid}
          topicId={topicId}
          vocabulary={editingVocabulary}
          existingWords={vocabulary.map((item) => item.word)}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deletingVocabulary)}
        title="Delete vocabulary"
        description={`Delete "${deletingVocabulary?.word ?? "this word"}" from this topic?`}
        confirmText="Delete word"
        loading={deleting}
        onCancel={() => setDeletingVocabulary(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
