/**
 * Keyword-based auto-suggestion for linking a habit to a project section.
 * All IDs are derived from the live database structure.
 */

export type SuggestedLink = {
  projectId: number;
  projectName: string;
  sectionId: number;
  sectionName: string;
  label: string; // display string e.g. "Fitness & Wellness › Self-care"
};

interface LinkRule {
  keys: string[];
  link: SuggestedLink;
}

const RULES: LinkRule[] = [
  // ── Fitness & Wellness > Workouts ─────────────────────────────────────────
  {
    keys: ["workout", "exercise", "gym", "run", "running", "steps", "walk", "swim", "yoga",
           "pilates", "stretching", "stretch", "cycling", "hiit", "lifting", "strength"],
    link: { projectId: 16, projectName: "Fitness & Wellness",
            sectionId: 49, sectionName: "Workouts",
            label: "Fitness & Wellness › Workouts" },
  },

  // ── Fitness & Wellness > Nutrition & Meal Prep ────────────────────────────
  {
    keys: ["hydration", "water", "drink", "nutrition", "diet", "eating", "meal prep",
           "vitamins", "supplements", "protein", "calorie", "macro"],
    link: { projectId: 16, projectName: "Fitness & Wellness",
            sectionId: 50, sectionName: "Nutrition & Meal Prep",
            label: "Fitness & Wellness › Nutrition & Meal Prep" },
  },

  // ── Fitness & Wellness > Sleep & Recovery ─────────────────────────────────
  {
    keys: ["sleep", "bedtime", "rest", "recovery", "no phone", "no screen", "screen",
           "wind down", "nap", "energy"],
    link: { projectId: 16, projectName: "Fitness & Wellness",
            sectionId: 51, sectionName: "Sleep & Recovery",
            label: "Fitness & Wellness › Sleep & Recovery" },
  },

  // ── Fitness & Wellness > Self-care ────────────────────────────────────────
  {
    keys: ["meditation", "meditate", "mindfulness", "skincare", "skin care", "cold shower",
           "gratitude", "journaling", "journal", "breathe", "breathing", "self-care",
           "spa", "massage", "wellbeing", "wellness", "mental health"],
    link: { projectId: 16, projectName: "Fitness & Wellness",
            sectionId: 52, sectionName: "Self-care",
            label: "Fitness & Wellness › Self-care" },
  },

  // ── Books & Podcasts > On the List ────────────────────────────────────────
  {
    keys: ["reading", "read", "book", "podcast", "audiobook", "kindle"],
    link: { projectId: 23, projectName: "Books & Podcasts",
            sectionId: 73, sectionName: "On the List",
            label: "Books & Podcasts › On the List" },
  },

  // ── Courses & Skills > In Progress ───────────────────────────────────────
  {
    keys: ["language", "duolingo", "coding", "programming", "course", "learning", "study",
           "practice", "skill", "flashcard", "anki"],
    link: { projectId: 24, projectName: "Courses & Skills",
            sectionId: 75, sectionName: "In Progress",
            label: "Courses & Skills › In Progress" },
  },

  // ── Mental Load > Long-term Goals ────────────────────────────────────────
  {
    keys: ["goal", "writing", "creative", "hobby", "drawing", "painting", "music",
           "guitar", "piano", "photography"],
    link: { projectId: 26, projectName: "Mental Load",
            sectionId: 84, sectionName: "Long-term Goals",
            label: "Mental Load › Long-term Goals" },
  },

  // ── Daily Logistics > Home Supplies (e.g. cooking habit) ─────────────────
  {
    keys: ["cooking", "cook", "meal", "food", "recipe"],
    link: { projectId: 13, projectName: "Daily Logistics",
            sectionId: 39, sectionName: "Home Supplies",
            label: "Daily Logistics › Home Supplies" },
  },
];

/**
 * Returns the best-matching section link for a habit by name.
 * Returns null if no keyword matches.
 */
export function suggestHabitLink(name: string): SuggestedLink | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  for (const rule of RULES) {
    if (rule.keys.some((k) => normalized.includes(k))) {
      return rule.link;
    }
  }
  return null;
}

/** All unique section options for the manual link picker, grouped by project. */
export type SectionOption = {
  projectId: number;
  projectName: string;
  sectionId: number;
  sectionName: string;
  label: string;
};

export const ALL_LINK_OPTIONS: SectionOption[] = RULES
  .map((r) => r.link)
  // deduplicate by sectionId
  .filter((l, i, arr) => arr.findIndex((x) => x.sectionId === l.sectionId) === i);
