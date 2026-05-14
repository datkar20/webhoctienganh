import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const safeValue = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-teal-500 transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
