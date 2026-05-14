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
    }
  }, [open, vocabulary]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const word = form.word.trim().toLowerCase();
    const meaningVi = form.meaningVi.trim();
    if (!word || !meaningVi) {
      toast.error("Word and Vietnamese meaning are required");
      return;
    }

    const duplicate = existingWords.some(
      (existingWord) => existingWord.toLowerCase() === word && existingWord.toLowerCase() !== vocabulary?.word.toLowerCase()
    );
    if (duplicate) {
      toast.error("This word already exists in the topic");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        word,
        meaningVi,
        partOfSpeech: form.partOfSpeech.trim(),
        phonetic: form.phonetic.trim(),
        imageUrl: form.imageUrl.trim(),
        exampleEn: form.exampleEn.trim(),
        exampleVi: form.exampleVi.trim(),
        difficulty: form.difficulty,
        masteryLevel: form.masteryLevel,
        updatedAt: serverTimestamp()
      };

      if (vocabulary) {
        await updateDoc(doc(db, "users", userId, "topics", topicId, "vocabulary", vocabulary.id), payload);
        toast.success("Vocabulary updated");
      } else {
        await addDoc(collection(db, "users", userId, "topics", topicId, "vocabulary"), {
          ...payload,
          correctCount: 0,
          wrongCount: 0,
          lastReviewedAt: null,
          nextReviewAt: new Date(),
          createdAt: serverTimestamp()
        });
        toast.success("Vocabulary added");
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meaningVi">Vietnamese meaning</Label>
            <Input
              id="meaningVi"
              value={form.meaningVi}
              onChange={(event) => setForm((current) => ({ ...current, meaningVi: event.target.value }))}
              required
            />
          </div>
        </div>
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
