"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { THEMES, DEFAULT_THEME, type ThemeDef } from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeDef;
  setThemeId: (id: string) => void;
  themes: ThemeDef[];
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setThemeId: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME.id);

  useEffect(() => {
    const saved = localStorage.getItem("st-theme");
    if (saved && THEMES.find((t) => t.id === saved)) {
      setThemeIdState(saved);
    }
  }, []);

  function setThemeId(id: string) {
    setThemeIdState(id);
    localStorage.setItem("st-theme", id);
  }

  const theme = THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
