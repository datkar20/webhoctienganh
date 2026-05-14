"use client";

import { ClipboardCheck, PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { evaluateWritingTask, type WritingEvaluation, type WritingTaskType } from "@/lib/writing-feedback";

const samplePrompt =
  "You recently joined an English course. Write a letter to your friend and tell him/her about the course, your teacher, and why you like it.";

export default function WritingPage() {
  const { language, t } = useLanguage();
  const [taskType, setTaskType] = useState<WritingTaskType>("letter");
  const [prompt, setPrompt] = useState(samplePrompt);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<WritingEvaluation | null>(null);

  const targetHint = useMemo(() => taskType === "letter" ? t("letterTask") : t("essayTask"), [t, taskType]);

  function handleEvaluate() {
    setResult(evaluateWritingTask(taskType, prompt, answer, language));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">{t("writingTitle")}</h1>
          <p className="text-sm text-slate-500">{t("writingSubtitle")}</p>
        </div>
        <Badge variant="teal" className="w-fit">{targetHint}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-teal-700" />
              {t("writingPrompt")}
            </CardTitle>
            <CardDescription>
              {t("requiredStructure")}:{" "}
              {taskType === "letter"
                ? language === "vi" ? "Chào - Lý do - Nội dung - Kết" : "Greeting - Reason - Content - Closing"
                : language === "vi" ? "Mở - Thân 1 - Thân 2 - Kết" : "Introduction - Body 1 - Body 2 - Conclusion"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taskType">{t("writingTaskType")}</Label>
              <Select id="taskType" value={taskType} onChange={(event) => setTaskType(event.target.value as WritingTaskType)}>
                <option value="letter">{t("letterTask")}</option>
                <option value="essay">{t("essayTask")}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">{t("writingPrompt")}</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t("writingPromptPlaceholder")}
                className="min-h-32"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">{t("yourWriting")}</Label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder={t("yourWritingPlaceholder")}
                className="min-h-72"
              />
            </div>
            <Button onClick={handleEvaluate} disabled={!answer.trim()}>
              <ClipboardCheck className="h-4 w-4" />
              {t("evaluateWriting")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("overallScore")}</CardTitle>
            <CardDescription>{result ? `${t("wordCount")}: ${result.wordCount}` : targetHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {result ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Score label={t("overallScore")} value={result.score} highlight />
                  <Score label={t("taskAchievement")} value={result.taskAchievement} />
                  <Score label={t("organization")} value={result.organization} />
                  <Score label={t("vocabularyScore")} value={result.vocabulary} />
                  <Score label={t("grammar")} value={result.grammar} />
                </div>

                <Section title={t("requiredStructure")} items={result.structure} tone="slate" />
                <Section title={t("strengths")} items={result.strengths} tone="emerald" />
                <Section title={t("feedback")} items={result.feedback.length ? result.feedback : [t("sentenceLooksGood")]} tone="rose" />

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">{t("modelRevision")}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{result.revisedSample}</p>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                {t("writingSubtitle")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Score({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-teal-800" : "text-slate-950"}`}>{value}/10</p>
    </div>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone: "slate" | "emerald" | "rose" }) {
  const colors = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800"
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
