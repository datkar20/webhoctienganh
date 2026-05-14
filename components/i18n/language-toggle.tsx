"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === "en" ? "vi" : "en";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setLanguage(nextLanguage)}
      title={t("language")}
      aria-label={t("language")}
    >
      <Languages className="h-4 w-4" />
      {language.toUpperCase()}
    </Button>
  );
}
