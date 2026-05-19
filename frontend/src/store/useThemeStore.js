import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("converse-theme") || "cupcake",
  setTheme: (theme) => {
    localStorage.setItem("converse-theme", theme);
    set({ theme });
  },
}));
