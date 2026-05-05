export type ThemeDef = {
  id: string;
  name: string;
  emoji: string;
  // Accent / interactive colors
  brand: string;
  button: string;
  buttonOutline: string;
  activeNav: string;
  ring: string;
  // Surface colors — applied to sidebar, main content, borders, and nav hover
  sidebarBg: string;    // <aside> background
  mainBg: string;       // main content panels
  navHover: string;     // non-active sidebar nav item hover state
  borderColor: string;  // sidebar/header/divider borders (use with border-{side} modifier)
  // Swatch colors for the theme picker (light-mode single classes only)
  swatchSidebar: string;
  swatchMain: string;
};

// All class strings must be complete literals so Tailwind v4 includes them at build time.
export const THEMES: ThemeDef[] = [
  {
    id: "sage",
    name: "Sage",
    emoji: "🌿",
    brand: "bg-emerald-600",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition",
    activeNav: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium",
    ring: "focus:ring-2 focus:ring-emerald-500 focus:outline-none",
    sidebarBg: "bg-emerald-50 dark:bg-zinc-900",
    mainBg: "bg-white dark:bg-zinc-950",
    navHover: "hover:bg-emerald-100 dark:hover:bg-zinc-800",
    borderColor: "border-emerald-200 dark:border-zinc-800",
    swatchSidebar: "bg-emerald-50",
    swatchMain: "bg-white",
  },
  {
    id: "ocean",
    name: "Ocean",
    emoji: "🌊",
    brand: "bg-indigo-600",
    button: "bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition",
    activeNav: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-medium",
    ring: "focus:ring-2 focus:ring-indigo-500 focus:outline-none",
    sidebarBg: "bg-slate-100 dark:bg-slate-900",
    mainBg: "bg-white dark:bg-slate-950",
    navHover: "hover:bg-slate-200 dark:hover:bg-slate-800",
    borderColor: "border-slate-200 dark:border-slate-800",
    swatchSidebar: "bg-slate-100",
    swatchMain: "bg-white",
  },
  {
    id: "lavender",
    name: "Lavender",
    emoji: "🪻",
    brand: "bg-violet-600",
    button: "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60 transition",
    buttonOutline: "text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition",
    activeNav: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 font-medium",
    ring: "focus:ring-2 focus:ring-violet-500 focus:outline-none",
    sidebarBg: "bg-violet-50 dark:bg-zinc-900",
    mainBg: "bg-white dark:bg-zinc-950",
    navHover: "hover:bg-violet-100 dark:hover:bg-zinc-800",
    borderColor: "border-violet-200 dark:border-zinc-800",
    swatchSidebar: "bg-violet-50",
    swatchMain: "bg-white",
  },
  {
    id: "blush",
    name: "Blush",
    emoji: "🌸",
    brand: "bg-rose-500",
    button: "bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-60 transition",
    buttonOutline: "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition",
    activeNav: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 font-medium",
    ring: "focus:ring-2 focus:ring-rose-500 focus:outline-none",
    sidebarBg: "bg-rose-50 dark:bg-zinc-900",
    mainBg: "bg-white dark:bg-zinc-950",
    navHover: "hover:bg-rose-100 dark:hover:bg-zinc-800",
    borderColor: "border-rose-200 dark:border-zinc-800",
    swatchSidebar: "bg-rose-50",
    swatchMain: "bg-white",
  },
  {
    id: "linen",
    name: "Linen",
    emoji: "🌻",
    brand: "bg-amber-500",
    button: "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-60 transition",
    buttonOutline: "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition",
    activeNav: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium",
    ring: "focus:ring-2 focus:ring-amber-500 focus:outline-none",
    sidebarBg: "bg-amber-50 dark:bg-stone-900",
    mainBg: "bg-stone-50 dark:bg-stone-950",
    navHover: "hover:bg-amber-100 dark:hover:bg-stone-800",
    borderColor: "border-amber-200 dark:border-stone-800",
    swatchSidebar: "bg-amber-50",
    swatchMain: "bg-stone-50",
  },
];

export const DEFAULT_THEME = THEMES[0]; // sage
