"use client";

import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { topicIconOptions, TopicIconView } from "@/components/topic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/firebase";
import type { Topic, TopicIcon } from "@/types";

const defaultForm = {
  name: "",
  description: "",
  icon: "Sparkles" as TopicIcon,
  color: "#14b8a6"
};

export function TopicFormDialog({
  open,
  userId,
  topic,
  onClose
}: {
  open: boolean;
  userId: string;
  topic?: Topic | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState(defaultForm);
  const [bulkTopics, setBulkTopics] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (topic) {
      setForm({
        name: topic.name,
        description: topic.description,
        icon: topic.icon,
        color: topic.color
      });
    } else {
      setForm(defaultForm);
      setBulkTopics("");
    }
  }, [topic, open]);

  function parseBulkTopics() {
    return bulkTopics
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, description = ""] = line.split("|").map((part) => part.trim());
        return { name, description };
      })
      .filter((item) => item.name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const bulkItems = topic ? [] : parseBulkTopics();
    if (!form.name.trim() && bulkItems.length === 0) {
      toast.error("Topic name is required");
      return;
    }

    setLoading(true);
    try {
      if (topic) {
        await updateDoc(doc(db, "users", userId, "topics", topic.id), {
          ...form,
          name: form.name.trim(),
          description: form.description.trim(),
          updatedAt: serverTimestamp()
        });
        toast.success("Topic updated");
      } else {
        const items = [
          ...(form.name.trim() ? [{ name: form.name.trim(), description: form.description.trim() }] : []),
          ...bulkItems
        ];
        for (const item of items) {
          await addDoc(collection(db, "users", userId, "topics"), {
            ...form,
            name: item.name,
            description: item.description,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        toast.success(items.length > 1 ? `${items.length} topics created` : "Topic created");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save topic");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={topic ? "Edit topic" : "Create topic"}
      description="Choose the learning area, visual icon, and color for this topic."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="topic-form" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save topic
          </Button>
        </div>
      }
    >
      <form id="topic-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic-name">Name</Label>
          <Input
            id="topic-name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="IELTS, Travel, Business..."
          />
        </div>
        {!topic ? (
          <div className="space-y-2">
            <Label htmlFor="bulk-topics">Add multiple topics</Label>
            <Textarea
              id="bulk-topics"
              value={bulkTopics}
              onChange={(event) => setBulkTopics(event.target.value)}
              placeholder={"Health | Medical and wellness vocabulary\nTechnology | Digital and software words\nIELTS | Academic English"}
            />
            <p className="text-xs text-slate-500">One topic per line. Use “Name | Description”. These will be created together.</p>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="topic-description">Description</Label>
          <Textarea
            id="topic-description"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="What will you learn in this topic?"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="topic-icon">Icon</Label>
            <Select
              id="topic-icon"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value as TopicIcon }))}
            >
              {topicIconOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic-color">Color</Label>
            <div className="flex gap-2">
              <Input
                id="topic-color"
                type="color"
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                className="h-10 w-16 p-1"
              />
              <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                <TopicIconView icon={form.icon} className="h-4 w-4" />
                {form.color}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
