import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  Layers3,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  { label: "Study modes", value: "6" },
  { label: "Demo words", value: "60+" },
  { label: "Dictionary", value: "80" }
];

const workflow = [
  {
    icon: Layers3,
    title: "Build topic-based vaults",
    description: "Organize English words by IELTS, TOEIC, work, travel, or your own custom goals."
  },
  {
    icon: Sparkles,
    title: "Extract useful words from text",
    description: "Paste real English passages, review suggested vocabulary, then save only what matters."
  },
  {
    icon: BarChart3,
    title: "Practice with measurable progress",
    description: "Track weak words, review due items, quiz accuracy, and mastery by topic."
  }
];

export function AuthMarketingPanel({ mode }: { mode: "login" | "register" }) {
  const headline =
    mode === "register"
      ? "A focused workspace for serious vocabulary growth."
      : "Return to a vocabulary system built around your goals.";
  const subcopy =
    mode === "register"
      ? "Create a private Firebase-backed account, add your first topic, and turn every practice session into structured progress."
      : "Pick up where you left off with topic libraries, smart review queues, and quizzes that adapt to weak words.";

  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
      <div className="pointer-events-none absolute right-[-160px] top-[-160px] h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-180px] left-[-180px] h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-soft">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight">VocabVault</p>
          <p className="text-sm text-slate-300">English vocabulary learning, organized.</p>
        </div>
      </div>

      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-teal-100">
          <ShieldCheck className="h-4 w-4" />
          Private per-user learning data
        </div>
        <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">{headline}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{subcopy}</p>

        <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-400">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", index === 1 ? "bg-sky-400 text-slate-950" : "bg-teal-400 text-slate-950")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-6 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-teal-300" />
          Firebase Authentication
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-teal-300" />
          Cloud Firestore
        </div>
      </div>
    </section>
  );
}
