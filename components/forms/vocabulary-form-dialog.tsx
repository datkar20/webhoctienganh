"use client";

import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { autoFillVocabularyFields } from "@/lib/auto-fill-vocabulary";
import { db } from "@/lib/firebase";
import type { Difficulty, MasteryLevel, VocabularyItem } from "@/types";

const defaultForm = {
  word: "",
  meaningVi: "",
  partOfSpeech: "",
  phonetic: "",
  imageUrl: "",
  exampleEn: "",
  exampleVi: "",
  difficulty: "medium" as Difficulty,
  masteryLevel: "new" as MasteryLevel
};

export function VocabularyFormDialog({
  open,
  userId,
  topicId,
  vocabulary,
  existingWords,
  onClose
}: {
  open: boolean;
  userId: string;
  topicId: string;
  vocabulary?: VocabularyItem | null;
  existingWords: string[];
  onClose: () => void;
}) {
  const [form, setForm] = useState(defaultForm);
  const [bulkWords, setBulkWords] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vocabulary) {
      setForm({
        word: vocabulary.word,
        meaningVi: vocabulary.meaningVi,
        partOfSpeech: vocabulary.partOfSpeech,
        phonetic: vocabulary.phonetic,
        imageUrl: vocabulary.imageUrl ?? "",
        exampleEn: vocabulary.exampleEn,
        exampleVi: vocabulary.exampleVi,
        difficulty: vocabulary.difficulty,
        masteryLevel: vocabulary.masteryLevel
      });
    } else {
      setForm(defaultForm);
      setBulkWords("");
    }
  }, [open, vocabulary]);

  function parseBulkWords() {
    return bulkWords
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [word, meaningVi = ""] = line.split("|").map((part) => part.trim());
        return { word: word.toLowerCase(), meaningVi };
      })
      .filter((item) => item.word);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const word = form.word.trim().toLowerCase();
    const bulkItems = vocabulary ? [] : parseBulkWords();
    if (!word && bulkItems.length === 0) {
      toast.error("Word is required");
      return;
    }

    setLoading(true);
    try {
      const existing = new Set(existingWords.map((item) => item.toLowerCase()));

      if (vocabulary) {
        const duplicate = existingWords.some(
          (existingWord) => existingWord.toLowerCase() === word && existingWord.toLowerCase() !== vocabulary.word.toLowerCase()
        );
        if (duplicate) {
          toast.error("This word already exists in the topic");
          return;
        }
        const autoFilled = await autoFillVocabularyFields({
          word,
          meaningVi: form.meaningVi,
          partOfSpeech: form.partOfSpeech,
          phonetic: form.phonetic,
          imageUrl: form.imageUrl,
          exampleEn: form.exampleEn,
          exampleVi: form.exampleVi,
          difficulty: form.difficulty
        });
        if (!autoFilled.meaningVi) {
          toast.error("Could not auto-translate this word. Please enter Vietnamese meaning.");
          return;
        }
        const payload = {
          ...autoFilled,
          masteryLevel: form.masteryLevel,
          updatedAt: serverTimestamp()
        };
        await updateDoc(doc(db, "users", userId, "topics", topicId, "vocabulary", vocabulary.id), payload);
        toast.success("Vocabulary updated");
      } else {
        const items = [
          ...(word ? [{ word, meaningVi: form.meaningVi.trim() }] : []),
          ...bulkItems
        ];
        const uniqueItems = items.filter((item, index, array) => {
          const normalized = item.word.toLowerCase();
          return !existing.has(normalized) && array.findIndex((candidate) => candidate.word.toLowerCase() === normalized) === index;
        });

        if (uniqueItems.length === 0) {
          toast.error("All words already exist in this topic");
          return;
        }

        let savedCount = 0;
        for (const item of uniqueItems) {
          const autoFilled = await autoFillVocabularyFields({
            word: item.word,
            meaningVi: item.meaningVi,
            partOfSpeech: form.partOfSpeech,
            phonetic: "",
            imageUrl: "",
            exampleEn: "",
            exampleVi: "",
            difficulty: form.difficulty
          });
          if (!autoFilled.meaningVi) continue;
          await addDoc(collection(db, "users", userId, "topics", topicId, "vocabulary"), {
            ...autoFilled,
            masteryLevel: form.masteryLevel,
            correctCount: 0,
            wrongCount: 0,
            lastReviewedAt: null,
            nextReviewAt: new Date(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          savedCount += 1;
        }
        if (savedCount === 0) {
          toast.error("Could not auto-fill these words. Please add meanings manually.");
          return;
        }
        toast.success(savedCount > 1 ? `${savedCount} words added` : "Vocabulary added");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save vocabulary");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={vocabulary ? "Edit vocabulary" : "Add vocabulary"}
      description="Store the meaning, examples, and learning status for this word."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="vocabulary-form" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save word
          </Button>
        </div>
      }
    >
      <form id="vocabulary-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="word">English word</Label>
            <Input
              id="word"
              value={form.word}
              onChange={(event) => setForm((current) => ({ ...current, word: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meaningVi">Vietnamese meaning</Label>
            <Input
              id="meaningVi"
              value={form.meaningVi}
              onChange={(event) => setForm((current) => ({ ...current, meaningVi: event.target.value }))}
            />
          </div>
        </div>
        {!vocabulary ? (
          <div className="space-y-2">
            <Label htmlFor="bulkWords">Add multiple words</Label>
            <Textarea
              id="bulkWords"
              value={bulkWords}
              onChange={(event) => setBulkWords(event.target.value)}
              placeholder={"environment\nimprovement | sự cải thiện\nnegotiate\nsustainable"}
            />
            <p className="text-xs text-slate-500">
              One word per line. Use “word | Vietnamese meaning” if you already know the meaning. Missing meanings and images are auto-filled.
            </p>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="partOfSpeech">Part of speech</Label>
            <Input
              id="partOfSpeech"
              value={form.partOfSpeech}
              onChange={(event) => setForm((current) => ({ ...current, partOfSpeech: event.target.value }))}
              placeholder="noun, verb..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phonetic">Phonetic</Label>
            <Input
              id="phonetic"
              value={form.phonetic}
              onChange={(event) => setForm((current) => ({ ...current, phonetic: event.target.value }))}
              placeholder="/word/"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              id="difficulty"
              value={form.difficulty}
              onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value as Difficulty }))}
            >
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="masteryLevel">Mastery level</Label>
          <Select
            id="masteryLevel"
            value={form.masteryLevel}
            onChange={(event) => setForm((current) => ({ ...current, masteryLevel: event.target.value as MasteryLevel }))}
          >
            <option value="new">new</option>
            <option value="learning">learning</option>
            <option value="familiar">familiar</option>
            <option value="mastered">mastered</option>
            <option value="weak">weak</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Illustration image URL</Label>
          <Input
            id="imageUrl"
            value={form.imageUrl}
            onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exampleEn">English example</Label>
          <Textarea
            id="exampleEn"
            value={form.exampleEn}
            onChange={(event) => setForm((current) => ({ ...current, exampleEn: event.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exampleVi">Vietnamese example</Label>
          <Textarea
            id="exampleVi"
            value={form.exampleVi}
            onChange={(event) => setForm((current) => ({ ...current, exampleVi: event.target.value }))}
          />
        </div>
      </form>
    </Modal>
  );
}
