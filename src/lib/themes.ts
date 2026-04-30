export type ThemeDef = {
  id: string;
  name: string;
  emoji: string;
  brand: string;
  button: string;
  buttonOutline: string;
  activeNav: string;
  ring: string;
};

// All class strings must be complete literals so Tailwind v4 includes them at build time.
export const THEMES: ThemeDef[] = [
  {
    id: "emerald",
    name: "Emerald",
    emoji: "🌿",
    brand: "bg-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition",
    activeNav:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium",
    ring: "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
  },
  {
    id: "indigo",
    name: "Indigo",
    emoji: "💙",
    brand: "bg-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition",
    activeNav:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium",
    ring: "focus:ring-2 focus:ring-indigo-500 focus:outline-none",
  },
  {
    id: "violet",
    name: "Violet",
    emoji: "🪻",
    brand: "bg-violet-600",
    button: "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition",
    activeNav:
      "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-medium",
    ring: "focus:ring-2 focus:ring-violet-500 focus:outline-none",
  },
  {
    id: "rose",
    name: "Rose",
    emoji: "🌸",
    brand: "bg-rose-500",
    button: "bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-60 transition",
    buttonOutline: "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition",
    activeNav: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 font-medium",
    ring: "focus:ring-2 focus:ring-rose-500 focus:outline-none",
  },
  {
    id: "amber",
    name: "Amber",
    emoji: "🌻",
    brand: "bg-amber-500",
    button: "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition",
    buttonOutline: "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition",
    activeNav:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium",
    ring: "focus:ring-2 focus:ring-amber-500 focus:outline-none",
  },
];

export const DEFAULT_THEME = THEMES[0]; // emerald
