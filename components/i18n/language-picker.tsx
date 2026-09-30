"use client";

import { Chip } from "@/components/soko/chip";
import { LOCALES } from "@/lib/i18n/messages";
import { useLocale, useT, writeLocale } from "@/lib/i18n/use-t";

export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useT();
  return (
    <section className={compact ? "mt-4" : "mt-8"}>
      {compact ? null : <h2 className="text-sm text-muted">{t("settings.language")}</h2>}
      <div className={`mt-2 flex flex-wrap gap-2 ${compact ? "justify-center" : ""}`}>
        {LOCALES.map((option) => (
          <Chip key={option.id} selected={locale === option.id} onClick={() => writeLocale(option.id)}>
            {option.label}
          </Chip>
        ))}
      </div>
    </section>
  );
}
