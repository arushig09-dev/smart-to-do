import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export interface CategorizeResult {
  projectId: number;
  projectName: string;
  projectEmoji: string | null;
  sectionId: number | null;
  sectionName: string | null;
  confidence: number;
  /** Root ancestor project (e.g. "Work", "Personal") — null if project is already top-level */
  topLevelProjectId: number;
  topLevelProjectName: string;
  topLevelProjectEmoji: string | null;
}

// Maps common task words to project/section domain names for bonus scoring.
// Ordered from most specific to most general.
const DOMAIN_HINTS: { words: string[]; domains: string[] }[] = [
  {
    words: ["meeting", "prd", "sprint", "okr", "review", "deploy", "stakeholder",
      "eng", "feature", "roadmap", "spec", "bug", "feedback", "performance",
      "1:1", "launch", "milestone", "presentation", "sync", "retro", "handoff",
      "ticket", "jira", "pr", "diff", "commit", "release", "scope", "prioritize"],
    domains: ["work", "career", "strategy", "execution", "stakeholder", "product", "sprint"],
  },
  {
    words: ["doctor", "dentist", "appointment", "prescription", "medicine",
      "therapy", "clinic", "health", "medical", "vaccine", "checkup", "hospital",
      "insurance", "refill", "pharmacy"],
    domains: ["health", "medical", "wellness", "appointments"],
  },
  {
    words: ["grocery", "groceries", "buy", "order", "amazon", "pick up",
      "restock", "shopping", "errand", "post office", "return", "package",
      "costco", "walmart", "target", "trader", "safeway", "whole foods",
      "kroger", "cvs", "walgreens", "pharmacy run", "store run"],
    domains: ["grocery", "logistics", "daily", "errands", "supplies", "online"],
  },
  {
    words: ["repair", "fix", "plumber", "electrician", "leak", "broken",
      "contractor", "maintenance", "furnishing", "decor", "cleaning",
      "paint", "install", "carpet", "hvac"],
    domains: ["home", "maintenance", "repairs", "upkeep", "house", "decor"],
  },
  {
    words: ["birthday", "gift", "party", "event", "celebrate", "anniversary",
      "dinner", "playdate", "friend", "family", "brunch", "wedding", "reunion"],
    domains: ["family", "social", "friends", "events", "birthdays"],
  },
  {
    words: ["tax", "bill", "payment", "budget", "expense",
      "subscription", "invoice", "bank", "finance", "receipt", "reimburse",
      "reimbursement", "hsa", "fsa", "401k", "ira", "claim", "deductible",
      "copay", "flexible", "savings account", "direct deposit", "wire transfer"],
    domains: ["finance", "admin", "money", "bills", "taxes"],
  },
  {
    words: ["baby", "diaper", "formula", "nanny", "childcare", "pediatrician",
      "infant", "stroller", "feeding", "nursery", "solid", "weaning"],
    domains: ["baby", "parenting", "childcare", "gear"],
  },
  {
    words: ["book", "read", "podcast", "course", "learn", "study",
      "class", "tutorial", "video", "finish reading"],
    domains: ["learning", "reading", "growth", "books", "courses", "podcasts"],
  },
  {
    words: ["workout", "gym", "exercise", "yoga", "fitness",
      "walk", "nutrition", "meal prep", "sleep", "meditate", "running"],
    domains: ["fitness", "wellness", "workout", "nutrition", "sleep"],
  },
  {
    words: ["trip", "travel", "hotel", "flight", "vacation", "pack",
      "outing", "visit", "itinerary", "airbnb",
      "visa", "passport", "embassy", "consulate", "immigration",
      "permit", "ds-160", "border", "customs", "ticket booking",
      "check-in", "layover", "hostel", "resort"],
    domains: ["travel", "trip", "outing", "upcoming", "social"],
  },
  {
    words: ["meal", "recipe", "cook", "dinner", "lunch", "breakfast",
      "food", "menu", "puree", "batch cook"],
    domains: ["meal", "recipe", "cooking", "food", "menu", "feeding"],
  },
];

// Words that carry no category signal — common in task titles but should not
// influence which project/section wins (e.g. "fill form this week" would
// otherwise score highly against a "This Week" section purely on "this"+"week").
const STOP_WORDS = new Set([
  "the", "and", "but", "not", "for", "are", "was", "its", "you", "can",
  "all", "had", "one", "any", "this", "that", "with", "from", "have",
  "will", "she", "his", "her", "our", "out", "who", "get", "use", "new",
  "add", "out", "via", "per", "etc", "put",
  // time / schedule filler words
  "week", "next", "last", "soon", "today", "date", "time", "now", "ago",
  "set", "due",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreName(titleTokens: string[], name: string): number {
  const nameTokens = tokenize(name);
  let score = 0;
  for (const tt of titleTokens) {
    for (const nt of nameTokens) {
      if (nt === tt) {
        score += tt.length * 2;                             // exact word match — full credit
      } else if (
        (nt.includes(tt) || tt.includes(nt)) &&
        Math.min(tt.length, nt.length) >= 5                 // partial match only for longer words
      ) {
        score += Math.min(tt.length, nt.length);            // prevents "plan"→"planning" false hit
      }
    }
  }
  return score;
}

function domainBonus(titleTokens: string[], domainName: string): number {
  const domainLower = domainName.toLowerCase();
  let bonus = 0;
  for (const hint of DOMAIN_HINTS) {
    const matchesDomain = hint.domains.some((d) => domainLower.includes(d));
    if (!matchesDomain) continue;
    for (const tt of titleTokens) {
      if (hint.words.some((w) => {
        // Multi-word hint phrase (e.g. "meal prep", "post office")
        if (w.includes(" ")) {
          return w.split(" ").some(
            (wt) => wt === tt || (tt.length >= 4 && wt.length >= 4 && (tt.includes(wt) || wt.includes(tt)))
          );
        }
        // Single-word hint: exact match OR substring if both words are ≥ 4 chars
        // This lets "reimbursement" match hint "reimburse", "groceries" match "grocery", etc.
        return w === tt || (tt.length >= 4 && w.length >= 4 && (tt.includes(w) || w.includes(tt)));
      })) {
        bonus += 4;
        break; // one bonus per domain group per token
      }
    }
  }
  return bonus;
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const title: string = body.title ?? "";
  const filterTopLevelId: number | undefined = body.filterTopLevelId ?? undefined;

  if (!title.trim()) return NextResponse.json(null);

  const projects = await prisma.project.findMany({
    where: { isArchived: false, userId },
    include: { sections: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  // Build a parent-lookup map so we can walk up the tree to find root ancestors
  const parentMap = new Map<number, number | null>(
    projects.map((p) => [p.id, p.parentId])
  );

  function getRootId(projectId: number): number {
    let current = projectId;
    let safety = 0;
    while (parentMap.get(current) != null && safety < 20) {
      current = parentMap.get(current)!;
      safety++;
    }
    return current;
  }

  const titleTokens = tokenize(title);
  let bestScore = 0;
  let best: CategorizeResult | null = null;

  for (const project of projects) {
    // If a top-level filter is set, skip projects not under that root
    if (filterTopLevelId !== undefined && getRootId(project.id) !== filterTopLevelId) {
      continue;
    }

    const projectScore =
      scoreName(titleTokens, project.name) +
      domainBonus(titleTokens, project.name);

    const rootId = getRootId(project.id);
    const rootProject = projects.find((p) => p.id === rootId) ?? project;

    if (project.sections.length > 0) {
      for (const section of project.sections) {
        const sectionScore =
          scoreName(titleTokens, section.name) +
          domainBonus(titleTokens, section.name);
        const total = projectScore + sectionScore * 1.5;
        if (total > bestScore) {
          bestScore = total;
          best = {
            projectId: project.id,
            projectName: project.name,
            projectEmoji: project.emoji,
            sectionId: section.id,
            sectionName: section.name,
            confidence: total,
            topLevelProjectId: rootId,
            topLevelProjectName: rootProject.name,
            topLevelProjectEmoji: rootProject.emoji,
          };
        }
      }
    } else if (projectScore > bestScore) {
      bestScore = projectScore;
      best = {
        projectId: project.id,
        projectName: project.name,
        projectEmoji: project.emoji,
        sectionId: null,
        sectionName: null,
        confidence: projectScore,
        topLevelProjectId: rootId,
        topLevelProjectName: rootProject.name,
        topLevelProjectEmoji: rootProject.emoji,
      };
    }
  }

  const THRESHOLD = 5;  // raised from 4 to require a more meaningful keyword match
  return NextResponse.json(bestScore >= THRESHOLD ? best : null);
}
