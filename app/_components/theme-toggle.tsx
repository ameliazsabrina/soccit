"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./providers";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      className="flex h-10 w-10 items-center justify-center text-foreground/70 transition-colors hover:text-purple focus-visible:ring-2 focus-visible:ring-purple focus-visible:ring-offset-2"
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
