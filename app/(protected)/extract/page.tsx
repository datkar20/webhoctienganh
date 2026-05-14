"use client";

import Link from "next/link";
import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { ImagePlus, Loader2, Save, Wand2, X } from "lucide-react";
import Image from "next/image";
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
import { autoFillExtractedVocabulary } from "@/lib/auto-fill-vocabulary";
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
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillProgress, setAutoFillProgress] = useState(0);
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

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const selectedCount = useMemo(() => suggestions.filter((item) => item.selected && !item.exists).length, [suggestions]);

  async function handleExtract() {
    if (!text.trim()) {
      toast.error("Paste an English paragraph first");
      return;
    }
    setAutoFillLoading(true);
    setAutoFillProgress(0);
    try {
      const result = extractVocabularyFromText(
        text,
        vocabulary.map((item) => item.word)
      );
      const filled = await autoFillExtractedVocabulary(result, text, (done, total) => {
        setAutoFillProgress(Math.round((done / Math.max(total, 1)) * 100));
      });
      setSuggestions(filled);
      const translated = filled.filter((item) => item.meaningVi && !item.exists).length;
      toast.success(`Found ${filled.length} candidate words, auto-filled ${translated} meanings`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not extract and translate vocabulary");
    } finally {
      setAutoFillLoading(false);
    }
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    setImageFile(file);
    setOcrProgress(0);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setImageFile(null);
    setOcrProgress(0);
  }

  async function handleExtractFromImage() {
    if (!imageFile) {
      toast.error("Choose an image first");
      return;
    }

    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        }
      });
      const result = await worker.recognize(imageFile);
      await worker.terminate();
      const extractedText = result.data.text.trim();
      if (!extractedText) {
        toast.error("Could not find readable English text in this image");
        return;
      }
      setText((current) => (current.trim() ? `${current.trim()}\n\n${extractedText}` : extractedText));
      toast.success("Image text extracted. You can now filter vocabulary.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not extract text from image");
    } finally {
      setOcrLoading(false);
    }
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
          imageUrl: item.imageUrl.trim(),
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
              <CardDescription>Paste English text or upload an image containing English text.</CardDescription>
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                    Selected topic decides where new extracted words are saved and which existing words are considered duplicates.
                  </div>
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

              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="image">Image vocabulary filter</Label>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
                        <ImagePlus className="h-4 w-4" />
                        Choose image
                        <input id="image" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                      </label>
                      <Button type="button" onClick={handleExtractFromImage} disabled={!imageFile || ocrLoading}>
                        {ocrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                        {ocrLoading ? `Reading image ${ocrProgress}%` : "Extract text from image"}
                      </Button>
                      {imageFile ? (
                        <Button type="button" variant="ghost" onClick={clearImage} disabled={ocrLoading}>
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Best for screenshots, textbook pages, flashcards, or photos with clear English text. The recognized text is added to the paragraph box above.
                    </p>
                    {ocrLoading ? (
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${ocrProgress}%` }} />
                      </div>
                    ) : null}
                  </div>
                  {imagePreview ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white lg:w-56">
                      <Image src={imagePreview} alt="Uploaded vocabulary source" fill className="object-cover" unoptimized />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExtract} disabled={autoFillLoading}>
                  {autoFillLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {autoFillLoading ? `Extracting and translating ${autoFillProgress}%` : "Extract vocabulary"}
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
                      {item.imageUrl ? (
                        <div className="relative h-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 md:col-span-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl} alt={`Illustration for ${item.word}`} className="h-full w-full object-cover" />
                          <Badge className="absolute left-3 top-3 bg-white/90 text-slate-700" variant="outline">
                            Suggested illustration
                          </Badge>
                        </div>
                      ) : null}
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
                        value={item.imageUrl}
                        onChange={(event) => updateSuggestion(item.word, { imageUrl: event.target.value })}
                        placeholder="Illustration image URL"
                        className="md:col-span-2"
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
