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
  // ── Health & Wellness > Fitness ───────────────────────────────────────────
  {
    keys: ["workout", "exercise", "gym", "run", "running", "steps", "walk", "swim", "yoga",
           "pilates", "stretching", "stretch", "cycling", "hiit", "lifting", "strength"],
    link: { projectName: "Health & Wellness", sectionName: "Fitness",
            label: "Health & Wellness › Fitness" },
  },
  // ── Health & Wellness > Nutrition ─────────────────────────────────────────
  {
    keys: ["hydration", "water", "drink", "nutrition", "diet", "eating", "meal prep",
           "vitamins", "supplements", "protein", "calorie", "macro",
           "cooking", "cook", "meal", "food", "recipe"],
    link: { projectName: "Health & Wellness", sectionName: "Nutrition",
            label: "Health & Wellness › Nutrition" },
  },
  // ── Health & Wellness > Self-care ─────────────────────────────────────────
  {
    keys: ["meditation", "meditate", "mindfulness", "skincare", "skin care", "cold shower",
           "gratitude", "journaling", "journal", "breathe", "breathing", "self-care",
           "spa", "massage", "wellbeing", "wellness", "mental health",
           "sleep", "bedtime", "rest", "recovery", "no phone", "no screen", "screen",
           "wind down", "nap", "energy"],
    link: { projectName: "Health & Wellness", sectionName: "Self-care",
            label: "Health & Wellness › Self-care" },
  },
  // ── Learning & Hobbies > Reading ──────────────────────────────────────────
  {
    keys: ["reading", "read", "book", "podcast", "audiobook", "kindle"],
    link: { projectName: "Learning & Hobbies", sectionName: "Reading",
            label: "Learning & Hobbies › Reading" },
  },
  // ── Learning & Hobbies > Courses ──────────────────────────────────────────
  {
    keys: ["language", "duolingo", "coding", "programming", "course", "learning", "study",
           "practice", "skill", "flashcard", "anki"],
    link: { projectName: "Learning & Hobbies", sectionName: "Courses",
            label: "Learning & Hobbies › Courses" },
  },
  // ── Learning & Hobbies > Personal Goals ───────────────────────────────────
  {
    keys: ["goal", "writing", "creative", "hobby", "drawing", "painting", "music",
           "guitar", "piano", "photography"],
    link: { projectName: "Learning & Hobbies", sectionName: "Personal Goals",
            label: "Learning & Hobbies › Personal Goals" },
  },
  // ── Day-to-day Logistics > Home Maintenance ───────────────────────────────
  {
    keys: ["cleaning", "clean", "laundry", "chores", "tidying", "organiz"],
    link: { projectName: "Day-to-day Logistics", sectionName: "Home Maintenance",
            label: "Day-to-day Logistics › Home Maintenance" },
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
