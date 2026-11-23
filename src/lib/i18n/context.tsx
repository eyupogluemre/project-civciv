"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Locale } from "../types";
import { dictionary, type Dictionary } from "./dictionary";

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = "civciv_locale";

const I18nContext = createContext<I18nContextValue>({
  locale: "tr",
  t: dictionary.tr,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "tr" || saved === "en") {
          setLocaleState(saved);
          document.documentElement.lang = saved;
          return;
        }
        const browserLang = (navigator.language || "tr").toLowerCase();
        const detected: Locale = browserLang.startsWith("tr") ? "tr" : "en";
        setLocaleState(detected);
        document.documentElement.lang = detected;
      } catch {
        // Keep default TR
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // Non-fatal
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "tr" ? "en" : "tr");
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        t: dictionary[locale],
        setLocale,
        toggleLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
