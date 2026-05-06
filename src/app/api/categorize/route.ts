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
//
// DOMAIN_HINTS drive domainBonus(): for a candidate section/project name,
// we check if any entry's `domains` list contains a substring of that name.
// If so, we boost for every task-title token that matches the `words` list.
// ─ Organise hints in three tiers:
//   1. Work: broad + per-persona section-level groups
//   2. Personal: per-track section-level groups
//   3. Shared / catch-all utilities

const DOMAIN_HINTS: { words: string[]; domains: string[] }[] = [

  // ════════════════════════════════════════════════════════════════════════
  // TIER 1 — WORK: broad signal (covers common work project names)
  // ════════════════════════════════════════════════════════════════════════
  {
    words: [
      "meeting", "sync", "prd", "spec", "ticket", "jira", "okr", "review",
      "deploy", "eng", "feature", "bug", "performance", "1:1", "launch",
      "milestone", "presentation", "retro", "handoff", "pr", "diff", "commit",
      "release", "scope", "prioritize", "sprint", "roadmap", "stakeholder",
      "ship", "shipping", "backlog", "pipeline", "experiment", "hire", "hiring",
      "candidate", "investor", "pitch", "payroll", "invoice", "audit", "vendor",
      "compliance", "partner", "partnership", "outreach", "proposal", "portfolio",
      "assignment", "exam", "application", "networking", "course",
    ],
    domains: [
      // Work root + common sub-project names
      "work", "career", "strategy", "execution", "stakeholder", "product",
      "planning", "admin", "learning",
      // Maker
      "deep work", "reviews", "feedback",
      // Strategist
      "roadmap", "priorities", "discovery", "research", "comms", "launch", "gtm",
      // Coach
      "my team", "okrs", "hiring",
      // Pioneer
      "growth", "sales", "fundrais", "ops", "finance",
      // Explorer
      "coursework", "job search", "projects", "campus",
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // TIER 2 — WORK: section-level hints (one group per logical cluster)
  // ════════════════════════════════════════════════════════════════════════

  // ── Shipping & Delivery: "Shipping Now", "Pre-launch", "Launch Day", "Post-launch"
  {
    words: [
      "ship", "shipping", "deploy", "release", "launch", "go live", "prod",
      "production", "qa", "sign off", "merge", "green light", "cut release",
      "final review", "ready to ship", "tag", "rollout", "feature flag",
    ],
    domains: ["shipping", "pre-launch", "launch day", "post-launch"],
  },

  // ── Up Next / Backlog / Someday / Ideas & Exploration
  {
    words: [
      "plan", "prioritize", "queue", "upcoming", "next sprint", "next quarter",
      "schedule", "scope", "decide", "add to roadmap", "story", "groom",
    ],
    domains: ["up next", "next"],
  },
  {
    words: [
      "backlog", "triage", "deferred", "parking lot", "later", "tech debt",
      "someday", "nice to have", "low priority", "not urgent",
    ],
    domains: ["backlog", "someday"],
  },
  {
    words: [
      "idea", "explore", "brainstorm", "prototype", "spike", "research",
      "what if", "concept", "experiment", "investigate", "test out",
    ],
    domains: ["ideas", "exploration", "discovery"],
  },

  // ── Discovery & Research: "User Research", "Data & Insights", "Competitive Intel", "Open Questions"
  {
    words: [
      "user research", "user interview", "survey", "data", "insight", "metric",
      "dashboard", "analysis", "competitor", "competitive", "benchmark",
      "open question", "hypothesis", "findings", "tldr", "report", "analytics",
    ],
    domains: ["research", "insights", "intel", "questions", "data"],
  },

  // ── Stakeholders & Comms: "Follow-ups", "Waiting On", "To Discuss", "Escalations"
  {
    words: [
      "follow up", "nudge", "ping", "check on", "waiting", "blocked on",
      "dependency", "no response", "pending", "loop in", "align",
      "discuss", "decision needed", "raise", "update from", "escalate",
      "action item", "async", "response needed",
    ],
    domains: ["follow", "waiting", "discuss", "escalation", "comms", "stakeholder"],
  },

  // ── Launch & GTM: "Pre-launch", "Launch Day", "Post-launch", "Retrospective"
  {
    words: [
      "launch plan", "gtm", "announcement", "press release", "blog post",
      "changelog", "release notes", "notify", "rollout plan", "blast", "comms",
      "retrospective", "retro", "lessons learned", "post-mortem",
    ],
    domains: ["launch", "gtm", "retrospective", "retro"],
  },

  // ── My Team: "1:1s", "Performance", "Unblocking", "Recognition"
  {
    words: [
      "1:1", "direct report", "unblock", "blocker", "performance review",
      "shoutout", "kudos", "recognition", "morale", "standup", "check-in",
      "feedback for", "help team", "support", "my team",
    ],
    domains: ["my team", "team", "unblocking", "performance", "recognition", "1:1s"],
  },

  // ── Planning & OKRs: "Goals & OKRs", "Roadmap", "Backlog", "Retrospectives"
  {
    words: [
      "okr", "goal", "objective", "key result", "retro", "quarterly",
      "planning session", "roadmap review", "strategy", "vision", "north star",
    ],
    domains: ["okrs", "goals & okrs", "retrospectives", "planning & okrs"],
  },

  // ── Hiring: "Roles Open", "Interviews", "Offers", "Onboarding", "Open Roles"
  {
    words: [
      "hire", "hiring", "interview", "candidate", "offer letter", "recruiter",
      "headcount", "jd", "job description", "onboard", "new hire",
      "background check", "role open", "open role", "req",
    ],
    domains: ["hiring", "interviews", "offers", "onboarding", "roles", "team & hiring"],
  },

  // ── Growth & Sales: "Pipeline", "Outreach", "Marketing", "Partnerships"
  {
    words: [
      "revenue", "sales", "deal", "close", "lead", "prospect", "pipeline",
      "demo", "account", "retention", "churn", "arr", "mrr",
      "campaign", "ads", "seo", "content", "growth loop", "conversion",
    ],
    domains: ["growth", "sales", "pipeline", "marketing", "growth & sales"],
  },
  {
    words: [
      "partner", "partnership", "integration", "co-market", "alliance",
      "reseller", "affiliate", "co-sell", "joint", "collaboration", "mou",
    ],
    domains: ["partnerships", "partner"],
  },
  {
    words: [
      "cold email", "warm lead", "intro", "connect", "linkedin", "referral",
      "network", "reach out", "new contact",
    ],
    domains: ["outreach"],
  },

  // ── Fundraising: "Investors", "Due Diligence", "Pitch Prep", "Legal"
  {
    words: [
      "investor", "vc", "fundraise", "raise", "series a", "series b", "seed",
      "term sheet", "cap table", "valuation", "pitch deck", "deck", "pitch",
    ],
    domains: ["investor", "fundrais", "diligence", "pitch prep"],
  },

  // ── Ops & Finance: "Invoices", "Payroll", "Infrastructure", "Legal", "Compliance"
  {
    words: [
      "invoice", "billing", "payment terms", "net 30", "payroll", "salary",
      "runway", "burn rate", "cash", "budget", "forecast",
      "infrastructure", "server", "cloud", "aws", "gcp", "azure",
      "vendor", "contract", "renew", "procurement",
    ],
    domains: ["invoic", "payroll", "ops", "infrastructure", "cash", "ops & finance"],
  },
  {
    words: [
      "compliance", "audit", "soc2", "gdpr", "hipaa", "regulatory", "legal",
      "certification", "security review", "pen test", "policy", "nda",
    ],
    domains: ["compliance", "legal"],
  },

  // ── Career: "Goals", "Wins", "1:1 Prep", "Skills to Build", "Learning"
  {
    words: [
      "promo", "promotion", "raise", "skill", "gap", "1:1 prep", "mentor",
      "develop", "conference", "certification", "personal development",
    ],
    domains: ["career", "skills to build", "1:1 prep"],
  },
  {
    words: [
      "win", "shipped", "accomplished", "achievement", "launched", "completed",
      "closed", "hit goal", "exceeded", "beat target", "record high", "impact",
    ],
    domains: ["wins"],
  },

  // ── Execution: "In Progress", "Blocked", "This Sprint", "This Week", "Done"
  {
    words: [
      "finish", "complete", "working on", "blocked", "this week", "sprint",
      "by friday", "by eod", "wrap up", "almost done", "needs review", "wip",
    ],
    domains: ["in progress", "blocked", "this sprint", "this week", "execution", "deep work"],
  },

  // ── Reviews & Feedback: "To Review", "Feedback to Give", "Waiting for Review"
  {
    words: [
      "review", "code review", "feedback", "approve", "check", "lgtm",
      "comments", "sign off", "merge", "waiting for review",
    ],
    domains: ["to review", "waiting for review", "reviews & feedback", "feedback to give"],
  },

  // ── Admin: "Recurring", "Meeting Prep", "Expenses", "Misc"
  {
    words: [
      "recurring", "weekly", "monthly", "status update", "submit report",
      "meeting prep", "agenda", "expense", "reimburse", "receipts", "misc",
    ],
    domains: ["recurring", "meeting prep", "expenses", "misc", "expenses & travel"],
  },

  // ── Explorer: Coursework, Job Search, Projects, Campus & Social
  {
    words: [
      "assignment", "homework", "exam", "quiz", "study", "lab",
      "thesis", "paper", "professor", "class", "lecture",
    ],
    domains: ["assignments", "exams", "study groups", "coursework"],
  },
  {
    words: [
      "apply", "application", "resume", "cover letter", "offer",
      "internship", "recruiter", "job board", "linkedin",
    ],
    domains: ["applications", "networking", "job search"],
  },
  {
    words: [
      "side project", "portfolio", "personal project", "build", "ship it",
      "in progress", "ideas", "github",
    ],
    domains: ["side projects", "portfolio", "projects"],
  },
  {
    words: [
      "club", "activity", "event", "campus", "housing", "roommate",
      "dorm", "lease", "semester",
    ],
    domains: ["clubs", "activities", "campus & social", "housing"],
  },

  // ════════════════════════════════════════════════════════════════════════
  // TIER 3 — PERSONAL: section-level hints
  // ════════════════════════════════════════════════════════════════════════

  // ── Health & Medical
  {
    words: [
      "doctor", "dentist", "appointment", "prescription", "medicine",
      "therapy", "clinic", "health", "medical", "vaccine", "checkup", "hospital",
      "insurance", "refill", "pharmacy",
    ],
    domains: ["health", "medical", "wellness", "appointments"],
  },

  // ── Grocery & Errands
  {
    words: [
      "grocery", "groceries", "buy", "order", "amazon", "pick up",
      "restock", "shopping", "errand", "post office", "return", "package",
      "costco", "walmart", "target", "trader", "safeway", "whole foods",
      "kroger", "cvs", "walgreens", "pharmacy run", "store run",
    ],
    domains: ["grocery", "logistics", "daily", "errands", "supplies", "online"],
  },

  // ── Home Maintenance
  {
    words: [
      "repair", "fix", "plumber", "electrician", "leak", "broken",
      "contractor", "maintenance", "furnishing", "decor", "cleaning",
      "paint", "install", "carpet", "hvac",
    ],
    domains: ["home", "maintenance", "repairs", "upkeep", "house", "decor"],
  },

  // ── Social & Events
  {
    words: [
      "dinner", "lunch", "coffee", "brunch", "drinks", "party",
      "birthday", "anniversary", "wedding", "rsvp", "text",
      "call", "catch up", "gift", "invite", "gathering",
    ],
    domains: ["social", "events", "upcoming events"],
  },
  {
    words: [
      "reply", "respond", "text", "message", "email", "call", "ping",
      "reach out", "follow up", "check in", "touch base", "write to",
      "send note", "thank you note",
    ],
    domains: ["keeping", "touch", "plans to make"],
  },
  {
    words: [
      "dinner", "lunch", "coffee", "brunch", "drinks",
      "plan", "meet", "hang", "hangout", "outing", "get together",
      "catchup", "invite", "host", "reserve", "reservation",
      "book restaurant", "grab food", "grab coffee",
    ],
    domains: ["plans", "meetups", "plans to make"],
  },
  {
    words: [
      "birthday", "anniversary", "gift", "present", "card", "rsvp",
      "wedding", "graduation", "baby shower", "shower", "engagement",
      "celebrate", "congratulate", "wish", "party", "reunion",
    ],
    domains: ["milestone", "milestones", "birthdays", "gifts & cards", "rsvps"],
  },

  // ── Finance (Personal)
  {
    words: [
      "tax", "bill", "payment", "budget", "expense",
      "subscription", "bank", "receipt", "reimburse",
      "hsa", "fsa", "401k", "ira", "claim", "deductible",
      "copay", "savings account", "direct deposit",
    ],
    domains: ["finance", "money", "bills", "taxes", "bills & subscriptions", "taxes & docs",
      "big purchases", "insurance"],
  },

  // ── Baby & Parenting
  {
    words: [
      "baby", "diaper", "formula", "nanny", "childcare", "pediatrician",
      "infant", "stroller", "feeding", "nursery", "solid", "weaning",
    ],
    domains: ["baby", "parenting", "childcare", "gear"],
  },

  // ── Learning & Hobbies
  {
    words: [
      "book", "read", "podcast", "course", "learn", "study",
      "class", "tutorial", "video", "finish reading", "article",
    ],
    domains: ["learning", "reading", "growth", "books", "courses", "podcasts",
      "articles & reads", "hobbies", "personal goals"],
  },

  // ── Fitness & Wellness
  {
    words: [
      "workout", "gym", "exercise", "yoga", "fitness",
      "walk", "nutrition", "meal prep", "sleep", "meditate", "running",
    ],
    domains: ["fitness", "wellness", "workout", "nutrition", "sleep", "self-care"],
  },

  // ── Travel & Adventure
  {
    words: [
      "trip", "travel", "hotel", "flight", "vacation", "pack",
      "visit", "itinerary", "airbnb",
      "visa", "passport", "embassy", "consulate",
      "permit", "border", "customs", "layover", "hostel", "resort",
    ],
    domains: ["travel", "adventure", "upcoming trips", "trip planning", "packing", "bucket"],
  },

  // ── Meals & Recipes
  {
    words: [
      "meal", "recipe", "cook", "dinner", "lunch", "breakfast",
      "food", "menu", "puree", "batch cook",
    ],
    domains: ["meal", "recipe", "cooking", "food", "menu", "feeding"],
  },
];

const STOP_WORDS = new Set([
  "the", "and", "but", "not", "for", "are", "was", "its", "you", "can",
  "all", "had", "one", "any", "this", "that", "with", "from", "have",
  "will", "she", "his", "her", "our", "out", "who", "get", "use", "new",
  "add", "via", "per", "etc", "put",
  // Keep "next" and "now" OUT of stop words — they're useful for routing to
  // "Up Next", "Shipping Now" etc.
  "week", "last", "soon", "today", "date", "time", "ago", "set", "due",
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
