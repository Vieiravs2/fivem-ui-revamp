import React, { createContext, useContext, useState, useEffect, Context } from "react";

const ThemeCtx = createContext<ThemeProviderValue | null>(null);

interface ThemeProviderValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("conversation_link_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("conversation_link_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme: "dark" | "light") => {
    setThemeState(newTheme);
  };

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
};

export const useTheme = () =>
  useContext<ThemeProviderValue>(ThemeCtx as Context<ThemeProviderValue>);

