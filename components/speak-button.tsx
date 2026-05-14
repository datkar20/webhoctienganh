"use client";

import { Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { speakEnglish } from "@/lib/speech";

export function SpeakButton({
  text,
  label = "Listen",
  size = "sm",
  variant = "outline",
  className
}: {
  text: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  function handleSpeak() {
    const ok = speakEnglish(text);
    if (!ok) toast.error("Speech is not supported in this browser");
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleSpeak} aria-label={`Listen to ${text}`}>
      <Volume2 className="h-4 w-4" />
      {size === "icon" ? null : label}
    </Button>
  );
}
