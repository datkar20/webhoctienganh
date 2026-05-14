"use client";

import Link from "next/link";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { Loader2, Save, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import { extractVocabularyFromText } from "@/lib/extract";
import { useTopics, useVocabulary } from "@/lib/firestore-hooks";
import type { Difficulty, ExtractedVocabulary } from "@/types";

const sampleText =
  "Technology can improve education by giving students access to software, databases, and interactive applications. However, schools need a clear strategy to protect privacy and support digital literacy.";

export default function ExtractPage() {
  const { user } = useAuth();
  const { topics, loading: topicsLoading, error: topicsError } = useTopics(user?.uid);
  const [topicId, setTopicId] = useState("");
  const { vocabulary } = useVocabulary(user?.uid, topicId);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<ExtractedVocabulary[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialTopicId = params.get("topicId");
    if (initialTopicId) setTopicId(initialTopicId);
  }, []);

  useEffect(() => {
    if (!topicId && topics.length > 0) setTopicId(topics[0].id);
  }, [topicId, topics]);

  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const selectedCount = useMemo(() => suggestions.filter((item) => item.selected && !item.exists).length, [suggestions]);

  function handleExtract() {
    if (!text.trim()) {
      toast.error("Paste an English paragraph first");
      return;
    }
    const result = extractVocabularyFromText(
      text,
      vocabulary.map((item) => item.word)
    );
    setSuggestions(result);
    toast.success(`Found ${result.length} candidate words`);
  }

  function updateSuggestion(word: string, patch: Partial<ExtractedVocabulary>) {
    setSuggestions((current) => current.map((item) => (item.word === word ? { ...item, ...patch } : item)));
  }

  async function handleSave() {
    if (!user || !topicId) return;
    const selected = suggestions.filter((item) => item.selected && !item.exists);
    if (selected.length === 0) {
      toast.error("Select at least one new word");
      return;
    }
    const invalid = selected.find((item) => !item.meaningVi.trim());
    if (invalid) {
      toast.error(`Add Vietnamese meaning for "${invalid.word}"`);
      return;
    }

    setSaving(true);
    try {
      const vocabularyCollection = collection(db, "users", user.uid, "topics", topicId, "vocabulary");
      const latestSnapshot = await getDocs(vocabularyCollection);
      const latestWords = new Set(
        latestSnapshot.docs.map((document) => String(document.data().word ?? "").toLowerCase())
      );

      let saved = 0;
      for (const item of selected) {
        const word = item.word.toLowerCase();
        if (latestWords.has(word)) continue;
        await addDoc(vocabularyCollection, {
          word,
          meaningVi: item.meaningVi.trim(),
          partOfSpeech: item.partOfSpeech.trim(),
          phonetic: item.phonetic.trim(),
          exampleEn: item.exampleEn.trim(),
          exampleVi: item.exampleVi.trim(),
          difficulty: item.difficulty,
          masteryLevel: "new",
          correctCount: 0,
          wrongCount: 0,
          lastReviewedAt: null,
          nextReviewAt: new Date(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        saved += 1;
      }

      toast.success(`Saved ${saved} words to ${selectedTopic?.name ?? "topic"}`);
      setSuggestions((current) =>
        current.map((item) => (selected.some((selectedItem) => selectedItem.word === item.word) ? { ...item, exists: true, selected: false } : item))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save extracted words");
    } finally {
      setSaving(false);
    }
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Extract Vocabulary</h1>
          <p className="text-sm text-slate-500">Paste English text, remove stop words, and save important words to a topic.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/topics">Manage topics</Link>
        </Button>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          title="Create a topic first"
          description="Extracted words need a destination topic before they can be saved."
          action={
            <Button asChild>
              <Link href="/topics">Create topic</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Source Text</CardTitle>
              <CardDescription>Words shorter than four characters and common stop words are removed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[260px_1fr]">
                <div className="space-y-2">
                  <Label htmlFor="topic">Target topic</Label>
                  <Select id="topic" value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                    {topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text">English paragraph</Label>
                  <Textarea
                    id="text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={sampleText}
                    className="min-h-36"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExtract}>
                  <Wand2 className="h-4 w-4" />
                  Extract vocabulary
                </Button>
                <Button type="button" variant="outline" onClick={() => setText(sampleText)}>
                  Use sample text
                </Button>
              </div>
            </CardContent>
          </Card>

          {suggestions.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Suggested Words</CardTitle>
                    <CardDescription>Edit meanings before saving. Duplicate words are locked.</CardDescription>
                  </div>
                  <Button onClick={handleSave} disabled={saving || selectedCount === 0}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save selected ({selectedCount})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.map((item) => (
                  <div key={item.word} className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={item.exists}
                          onChange={(event) => updateSuggestion(item.word, { selected: event.target.checked })}
                          className="h-4 w-4 accent-teal-600"
                        />
                        <span className="text-lg font-semibold text-slate-950">{item.word}</span>
                        <Badge variant="outline">{item.frequency}x</Badge>
                        {item.exists ? <Badge variant="amber">Already saved</Badge> : null}
                      </label>
                      <Select
                        value={item.difficulty}
                        onChange={(event) => updateSuggestion(item.word, { difficulty: event.target.value as Difficulty })}
                        className="md:w-36"
                      >
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </Select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={item.meaningVi}
                        onChange={(event) => updateSuggestion(item.word, { meaningVi: event.target.value })}
                        placeholder="Vietnamese meaning"
                      />
                      <Input
                        value={item.partOfSpeech}
                        onChange={(event) => updateSuggestion(item.word, { partOfSpeech: event.target.value })}
                        placeholder="Part of speech"
                      />
                      <Input
                        value={item.exampleEn}
                        onChange={(event) => updateSuggestion(item.word, { exampleEn: event.target.value })}
                        placeholder="English example"
                      />
                      <Input
                        value={item.exampleVi}
                        onChange={(event) => updateSuggestion(item.word, { exampleVi: event.target.value })}
                        placeholder="Vietnamese example"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No extracted words yet"
              description="Paste a paragraph and run extraction to see suggested vocabulary here."
            />
          )}
        </>
      )}
    </div>
  );
}
