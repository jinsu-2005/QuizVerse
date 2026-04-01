import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "quizverse-theme";
const ThemeContext = createContext({
  theme: "dark",
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

function getInitialTheme() {
  if (typeof window === "undefined") return "dark";

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
  } catch (error) {
    console.error("Could not read theme preference:", error);
  }

  return "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Could not save theme preference:", error);
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
