"use client";

import { createContext, useContext } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Locale, t } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("he");

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleContext.Provider value="he">{children}</LocaleContext.Provider>
    </AuthProvider>
  );
}

export function useTranslation() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: string) => t(locale, key),
  };
}
