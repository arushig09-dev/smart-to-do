/**
 * Keyword-based auto-suggestion for linking a habit to a project section.
 * Uses project/section *names* only — IDs are resolved at runtime against the
 * logged-in user's actual data so no stale hardcoded IDs can break creation.
 */

export type SuggestedLink = {
  projectName: string;
  sectionName: string;
  label: string; // display string e.g. "Fitness & Wellness › Self-care"
};

/** A resolved link that carries actual DB IDs (built from user's live data). */
export type ResolvedLink = SuggestedLink & {
  projectId: number;
  sectionId: number;
};

interface LinkRule {
  keys: string[];
  link: SuggestedLink;
}

const RULES: LinkRule[] = [
  // ── Fitness & Wellness > Workouts ────────────────────────────────────────
  {
    keys: ["workout", "exercise", "gym", "run", "running", "steps", "walk", "swim", "yoga",
           "pilates", "stretching", "stretch", "cycling", "hiit", "lifting", "strength"],
    link: { projectName: "Fitness & Wellness", sectionName: "Workouts",
            label: "Fitness & Wellness › Workouts" },
  },
  // ── Fitness & Wellness > Nutrition & Meal Prep ───────────────────────────
  {
    keys: ["hydration", "water", "drink", "nutrition", "diet", "eating", "meal prep",
           "vitamins", "supplements", "protein", "calorie", "macro"],
    link: { projectName: "Fitness & Wellness", sectionName: "Nutrition & Meal Prep",
            label: "Fitness & Wellness › Nutrition & Meal Prep" },
  },
  // ── Fitness & Wellness > Sleep & Recovery ────────────────────────────────
  {
    keys: ["sleep", "bedtime", "rest", "recovery", "no phone", "no screen", "screen",
           "wind down", "nap", "energy"],
    link: { projectName: "Fitness & Wellness", sectionName: "Sleep & Recovery",
            label: "Fitness & Wellness › Sleep & Recovery" },
  },
  // ── Fitness & Wellness > Self-care ───────────────────────────────────────
  {
    keys: ["meditation", "meditate", "mindfulness", "skincare", "skin care", "cold shower",
           "gratitude", "journaling", "journal", "breathe", "breathing", "self-care",
           "spa", "massage", "wellbeing", "wellness", "mental health"],
    link: { projectName: "Fitness & Wellness", sectionName: "Self-care",
            label: "Fitness & Wellness › Self-care" },
  },
  // ── Books & Podcasts > On the List ───────────────────────────────────────
  {
    keys: ["reading", "read", "book", "podcast", "audiobook", "kindle"],
    link: { projectName: "Books & Podcasts", sectionName: "On the List",
            label: "Books & Podcasts › On the List" },
  },
  // ── Courses & Skills > In Progress ───────────────────────────────────────
  {
    keys: ["language", "duolingo", "coding", "programming", "course", "learning", "study",
           "practice", "skill", "flashcard", "anki"],
    link: { projectName: "Courses & Skills", sectionName: "In Progress",
            label: "Courses & Skills › In Progress" },
  },
  // ── Personal Goals > Long-term Goals ─────────────────────────────────────
  {
    keys: ["goal", "writing", "creative", "hobby", "drawing", "painting", "music",
           "guitar", "piano", "photography"],
    link: { projectName: "Personal Goals", sectionName: "Long-term Goals",
            label: "Personal Goals › Long-term Goals" },
  },
  // ── Day-to-day Logistics > Home & Supplies ───────────────────────────────
  {
    keys: ["cooking", "cook", "meal", "food", "recipe"],
    link: { projectName: "Day-to-day Logistics", sectionName: "Home & Supplies",
            label: "Day-to-day Logistics › Home & Supplies" },
  },
];

/** Returns the name-based suggestion for a habit. No IDs — call resolveLink to get IDs. */
export function suggestHabitLink(name: string): SuggestedLink | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  for (const rule of RULES) {
    if (rule.keys.some((k) => normalized.includes(k))) return rule.link;
  }
  return null;
}

/** All unique name-based link options for the manual picker. */
export const ALL_LINK_RULES: SuggestedLink[] = RULES
  .map((r) => r.link)
  .filter((l, i, arr) => arr.findIndex((x) => x.label === l.label) === i);

type UserProject = { id: number; name: string; sections: { id: number; name: string }[] };

/**
 * Resolves a name-based suggestion to actual DB IDs using the logged-in user's
 * project/section list. Returns null if the project or section isn't found.
 */
export function resolveLink(
  suggestion: SuggestedLink,
  userProjects: UserProject[]
): ResolvedLink | null {
  const pName = suggestion.projectName.toLowerCase();
  const sName = suggestion.sectionName.toLowerCase();

  for (const proj of userProjects) {
    if (proj.name.toLowerCase() !== pName) continue;
    const sec = proj.sections.find((s) => s.name.toLowerCase() === sName);
    if (sec) {
      return { ...suggestion, projectId: proj.id, sectionId: sec.id };
    }
  }
  return null;
}

/**
 * Builds the full list of link options with resolved IDs for the user.
 * Options whose project/section can't be found in the user's data are omitted.
 */
export function buildLinkOptions(userProjects: UserProject[]): ResolvedLink[] {
  return ALL_LINK_RULES
    .map((rule) => resolveLink(rule, userProjects))
    .filter((r): r is ResolvedLink => r !== null);
}
