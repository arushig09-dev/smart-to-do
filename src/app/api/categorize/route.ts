import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";
import OpenAI from "openai";

export interface CategorizeResult {
  projectId: number;
  projectName: string;
  projectEmoji: string | null;
  sectionId: number | null;
  sectionName: string | null;
  confidence: number;
  topLevelProjectId: number;
  topLevelProjectName: string;
  topLevelProjectEmoji: string | null;
}

// ─── Keyword fallback scoring ─────────────────────────────────────────────────

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
      "copay", "savings account", "direct deposit", "wire transfer"],
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

const STOP_WORDS = new Set([
  "the", "and", "but", "not", "for", "are", "was", "its", "you", "can",
  "all", "had", "one", "any", "this", "that", "with", "from", "have",
  "will", "she", "his", "her", "our", "out", "who", "get", "use", "new",
  "add", "via", "per", "etc", "put",
  "week", "next", "last", "soon", "today", "date", "time", "now", "ago", "set", "due",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function scoreName(titleTokens: string[], name: string): number {
  const nameTokens = tokenize(name);
  let score = 0;
  for (const tt of titleTokens) {
    for (const nt of nameTokens) {
      if (nt === tt) {
        score += tt.length * 2;
      } else if ((nt.includes(tt) || tt.includes(nt)) && Math.min(tt.length, nt.length) >= 5) {
        score += Math.min(tt.length, nt.length);
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
        if (w.includes(" ")) {
          return w.split(" ").some(
            (wt) => wt === tt || (tt.length >= 4 && wt.length >= 4 && (tt.includes(wt) || wt.includes(tt)))
          );
        }
        return w === tt || (tt.length >= 4 && w.length >= 4 && (tt.includes(w) || w.includes(tt)));
      })) {
        bonus += 4;
        break;
      }
    }
  }
  return bonus;
}

// ─── Embedding helpers ────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

function buildCandidateText(topLevelName: string, projectName: string, sectionName: string | null): string {
  const parts = [topLevelName, projectName];
  if (sectionName) parts.push(sectionName);
  return parts.join(" > ");
}

// ─── Correction boost ─────────────────────────────────────────────────────────
// When a user has previously overridden a suggestion, boost the chosen project
// for future tasks with overlapping tokens (Jaccard similarity × 6 points).

type CorrRow = { titleTokens: string; chosenProjId: number; chosenSectId: number | null };

function correctionBoost(
  tokens: string[],
  corr: CorrRow,
  candidateProjId: number,
  candidateSectId: number | null
): number {
  if (corr.chosenProjId !== candidateProjId) return 0;
  if (corr.chosenSectId !== null && corr.chosenSectId !== candidateSectId) return 0;
  let pastTokens: string[];
  try { pastTokens = JSON.parse(corr.titleTokens); } catch { return 0; }
  if (pastTokens.length === 0) return 0;
  const overlap = tokens.filter((t) => pastTokens.includes(t)).length;
  return (overlap / Math.max(pastTokens.length, tokens.length)) * 6;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const title: string = body.title ?? "";
  const filterTopLevelId: number | undefined = body.filterTopLevelId ?? undefined;

  if (!title.trim()) return NextResponse.json(null);

  const [projects, corrections] = await Promise.all([
    prisma.project.findMany({
      where: { isArchived: false, userId },
      include: { sections: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    }),
    prisma.categoryCorrection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const parentMap = new Map<number, number | null>(projects.map((p) => [p.id, p.parentId]));

  function getRootId(projectId: number): number {
    let current = projectId;
    let safety = 0;
    while (parentMap.get(current) != null && safety < 20) {
      current = parentMap.get(current)!;
      safety++;
    }
    return current;
  }

  type Candidate = {
    projectId: number; projectName: string; projectEmoji: string | null;
    sectionId: number | null; sectionName: string | null;
    rootId: number; candidateText: string;
  };

  const candidates: Candidate[] = [];
  for (const project of projects) {
    if (filterTopLevelId !== undefined && getRootId(project.id) !== filterTopLevelId) continue;
    if (project.parentId === null) continue; // skip root nodes
    const rootId = getRootId(project.id);
    const rootProject = projects.find((p) => p.id === rootId) ?? project;

    if (project.sections.length > 0) {
      for (const section of project.sections) {
        candidates.push({
          projectId: project.id, projectName: project.name, projectEmoji: project.emoji,
          sectionId: section.id, sectionName: section.name,
          rootId, candidateText: buildCandidateText(rootProject.name, project.name, section.name),
        });
      }
    } else {
      candidates.push({
        projectId: project.id, projectName: project.name, projectEmoji: project.emoji,
        sectionId: null, sectionName: null,
        rootId, candidateText: buildCandidateText(rootProject.name, project.name, null),
      });
    }
  }

  if (candidates.length === 0) return NextResponse.json(null);

  const titleTokens = tokenize(title);

  // ── Embedding-based ranking (when OPENAI_API_KEY is set) ──────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const inputs = [title, ...candidates.map((c) => c.candidateText)];
      const resp = await openai.embeddings.create({ model: "text-embedding-3-small", input: inputs });
      const embeddings = resp.data.map((d) => d.embedding);
      const titleVec = embeddings[0];

      let bestScore = -1;
      let bestIdx = -1;
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const corrBoost = corrections.reduce(
          (sum, corr) => sum + correctionBoost(titleTokens, corr, c.projectId, c.sectionId) * 0.01, 0
        );
        const score = cosine(titleVec, embeddings[i + 1]) + corrBoost;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }

      if (bestScore < 0.25) return NextResponse.json(null);

      const best = candidates[bestIdx];
      const rootProject = projects.find((p) => p.id === best.rootId)!;
      return NextResponse.json({
        projectId: best.projectId, projectName: best.projectName, projectEmoji: best.projectEmoji,
        sectionId: best.sectionId, sectionName: best.sectionName,
        confidence: Math.round(bestScore * 100),
        topLevelProjectId: best.rootId,
        topLevelProjectName: rootProject.name, topLevelProjectEmoji: rootProject.emoji,
      } satisfies CategorizeResult);
    } catch (e) {
      console.error("[categorize] OpenAI error, falling back to keyword scoring:", e);
    }
  }

  // ── Keyword fallback ──────────────────────────────────────────────────────
  let bestScore = 0;
  let best: CategorizeResult | null = null;

  for (const c of candidates) {
    const rootProject = projects.find((p) => p.id === c.rootId)!;
    const projectScore = scoreName(titleTokens, c.projectName) + domainBonus(titleTokens, c.projectName);
    const sectionScore = c.sectionName
      ? scoreName(titleTokens, c.sectionName) + domainBonus(titleTokens, c.sectionName)
      : 0;
    const corrBoost = corrections.reduce(
      (sum, corr) => sum + correctionBoost(titleTokens, corr, c.projectId, c.sectionId), 0
    );
    const total = projectScore + sectionScore * 1.5 + corrBoost;
    if (total > bestScore) {
      bestScore = total;
      best = {
        projectId: c.projectId, projectName: c.projectName, projectEmoji: c.projectEmoji,
        sectionId: c.sectionId, sectionName: c.sectionName,
        confidence: total,
        topLevelProjectId: c.rootId,
        topLevelProjectName: rootProject.name, topLevelProjectEmoji: rootProject.emoji,
      };
    }
  }

  const THRESHOLD = 5;
  return NextResponse.json(bestScore >= THRESHOLD ? best : null);
}
