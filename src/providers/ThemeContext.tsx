"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "baiano";

interface ThemeCtx {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (t: string) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) ?? "dark";
    applyTheme(stored);
    setThemeState(stored);
  }, []);

  const setTheme = (t: string) => {
    const next = t as Theme;
    localStorage.setItem("theme", next);
    applyTheme(next);
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark", "baiano");
  root.classList.add(t);
}

export const useTheme = () => useContext(ThemeContext);
