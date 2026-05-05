/**
 * Keyword-based dynamic description generator.
 * Matches tokens in a project/section name (and optional parent name) to produce
 * a contextual one-liner. Falls back gracefully for any custom name.
 */

interface DescriptionRule {
  keys: string[];
  description: string;
}

const RULES: DescriptionRule[] = [
  // ── Reading / Learning ──────────────────────────────────────────────────────
  { keys: ["book", "podcast", "read", "listen"],
    description: "Track books and podcasts you're reading, on your list, or finished this year" },
  { keys: ["course", "courses", "class", "certification", "udemy", "coursera"],
    description: "Manage online courses, learning paths, and skills you're actively developing" },
  { keys: ["skill", "skills", "upskill", "learn", "study"],
    description: "Capture skills to build and resources to work through at your own pace" },
  { keys: ["hobby", "hobbies", "creative", "art", "craft", "music", "paint"],
    description: "Keep track of creative projects, hobbies, and new things you want to try" },
  { keys: ["growth", "personal growth", "self", "improvement"],
    description: "Set intentions for personal growth — what you want to read, learn, and explore" },

  // ── Groceries / Home ───────────────────────────────────────────────────────
  { keys: ["groceries", "grocery", "supermarket", "shop", "shopping"],
    description: "Build your grocery list, note pantry needs, and plan shopping runs" },
  { keys: ["order", "returns", "return", "delivery", "package", "amazon"],
    description: "Track online orders, pending deliveries, and items you need to return" },
  { keys: ["errand", "errands", "to-do", "pickup", "drop"],
    description: "Capture errands, pick-ups, and outside-the-home tasks to get done" },
  { keys: ["home", "house", "maintenance", "repair", "fix", "plumber", "contractor"],
    description: "Log home repairs, maintenance schedules, and service provider contacts" },
  { keys: ["decor", "furnish", "furniture", "interior", "ikea"],
    description: "Track decor ideas, furniture purchases, and home improvement projects" },
  { keys: ["supply", "supplies", "household"],
    description: "Keep track of household supplies, restock reminders, and essentials" },

  // ── Health & Wellness ──────────────────────────────────────────────────────
  { keys: ["health", "medical", "doctor", "clinic", "hospital"],
    description: "Manage medical appointments, prescriptions, and health records in one place" },
  { keys: ["appointment", "appointments", "checkup", "check-up"],
    description: "Stay on top of upcoming appointments, follow-ups, and health check-ins" },
  { keys: ["prescription", "medication", "refill", "pharmacy"],
    description: "Track prescriptions, refill schedules, and pharmacy reminders" },
  { keys: ["insurance", "claim", "coverage", "copay"],
    description: "Manage insurance claims, coverage details, and reimbursement follow-ups" },
  { keys: ["fitness", "workout", "exercise", "gym", "run", "yoga", "pilates", "swim"],
    description: "Log workouts, set fitness goals, and build consistency in your routine" },
  { keys: ["nutrition", "diet", "macro", "calorie", "meal prep"],
    description: "Track nutrition goals, meal prep plans, and healthy eating habits" },
  { keys: ["sleep", "recovery", "rest", "energy"],
    description: "Monitor sleep quality, recovery habits, and energy patterns" },
  { keys: ["self-care", "selfcare", "spa", "wellness", "mental health"],
    description: "Prioritize self-care — schedule downtime, relaxation, and wellness routines" },

  // ── Baby & Parenting ────────────────────────────────────────────────────────
  { keys: ["baby", "infant", "newborn", "feeding", "feed"],
    description: "Log feeding sessions, track schedules, and monitor your baby's daily routine" },
  { keys: ["parenting", "childcare", "nanny", "daycare", "preschool"],
    description: "Manage childcare logistics, providers, and parenting to-dos" },
  { keys: ["milestone", "development", "activity", "play"],
    description: "Track developmental milestones, activities, and fun ideas for your child" },
  { keys: ["gear", "stroller", "carrier", "registry", "toy"],
    description: "Keep track of baby gear, registry items, and supplies to buy or research" },

  // ── Family & Social ─────────────────────────────────────────────────────────
  { keys: ["family", "household"],
    description: "Coordinate family events, shared tasks, and household responsibilities" },
  { keys: ["birthday", "gift", "anniversary", "celebration"],
    description: "Never miss a birthday or anniversary — plan gifts and celebrations ahead" },
  { keys: ["playdate", "playgroup", "kids", "children"],
    description: "Schedule playdates, track RSVP'd events, and manage kid activities" },
  { keys: ["friend", "friends", "social", "catch-up", "coffee"],
    description: "Stay connected — log friend catch-ups, plans, and people you want to reach" },
  { keys: ["event", "events", "party", "gathering", "dinner"],
    description: "Plan and track upcoming events, gatherings, and social occasions" },

  // ── Travel ─────────────────────────────────────────────────────────────────
  { keys: ["travel", "trip", "vacation", "holiday", "journey"],
    description: "Plan upcoming trips — logistics, bookings, itineraries, and packing lists" },
  { keys: ["packing", "pack", "luggage", "suitcase"],
    description: "Build packing lists so nothing gets left behind on your next trip" },
  { keys: ["outing", "day out", "excursion", "hike", "park"],
    description: "Discover and plan local outings, day trips, and weekend adventures" },
  { keys: ["flight", "hotel", "airbnb", "booking", "reservation"],
    description: "Track travel bookings, confirmations, and reservation details" },

  // ── Finance ─────────────────────────────────────────────────────────────────
  { keys: ["finance", "financial", "money", "budget"],
    description: "Stay on top of your finances — budgets, bills, and financial goals" },
  { keys: ["bill", "bills", "subscription", "payment", "invoice"],
    description: "Track recurring bills, subscriptions, and due-date reminders" },
  { keys: ["tax", "taxes", "return", "irs", "filing"],
    description: "Organize tax documents, deadlines, and deductions each year" },
  { keys: ["investment", "invest", "stock", "portfolio", "saving"],
    description: "Monitor investments, savings goals, and financial planning milestones" },
  { keys: ["purchase", "buy", "big", "expensive", "splurge"],
    description: "Research and track large purchases before committing to buy" },
  { keys: ["admin", "administration", "paperwork", "document"],
    description: "Handle recurring admin tasks, important documents, and paperwork" },

  // ── Mental Load ─────────────────────────────────────────────────────────────
  { keys: ["mental load", "mental"],
    description: "Offload the mental load — capture decisions, open loops, and things to delegate" },
  { keys: ["decide", "decision", "choice"],
    description: "Park open decisions here so nothing stays stuck in your head" },
  { keys: ["research", "explore", "investigate", "look into"],
    description: "Collect topics to research before you need to act on them" },
  { keys: ["delegate", "delegatable", "assign", "handoff"],
    description: "Identify tasks you can hand off and track whether they've been done" },
  { keys: ["long-term", "longterm", "someday", "future", "goal"],
    description: "Capture long-term goals and aspirations to revisit when the time is right" },

  // ── Meals & Recipes ─────────────────────────────────────────────────────────
  { keys: ["recipe", "recipes", "cook", "dish", "cuisine"],
    description: "Save recipes you love, want to try, and rotate through your weekly menu" },
  { keys: ["menu", "weekly menu", "meal plan"],
    description: "Plan your weekly meals so you always know what's for dinner" },
  { keys: ["meal prep", "prep", "batch cook"],
    description: "Plan your batch cooking sessions and meal-prep tasks for the week" },
  { keys: ["meal", "meals", "food", "eat"],
    description: "Stay organized around food — recipes, menus, and what you're cooking this week" },

  // ── Work — Strategy / Planning ───────────────────────────────────────────────
  { keys: ["strategy", "strategic", "roadmap"],
    description: "Define your strategic direction, set the roadmap, and align the team" },
  { keys: ["vision", "mission", "north star"],
    description: "Articulate your vision and keep the north-star goals front and centre" },
  { keys: ["okr", "objective", "kpi", "quarterly"],
    description: "Set and track quarterly OKRs — from team goals to key results" },
  { keys: ["backlog", "feature", "idea", "wishlist"],
    description: "Maintain the feature backlog — capture ideas and prioritize what's next" },
  { keys: ["deprioritized", "deferred", "parked", "later"],
    description: "Park ideas that aren't a priority right now — revisit each quarter" },

  // ── Work — Execution ─────────────────────────────────────────────────────────
  { keys: ["sprint", "this week", "execution", "in progress"],
    description: "Keep your sprints on track — manage this week's commitments and blockers" },
  { keys: ["deliverable", "spec", "specs", "prd", "brief"],
    description: "Manage deliverables, write specs, and shepherd work through review to shipped" },
  { keys: ["shipped", "done", "released", "launched"],
    description: "Celebrate wins — a log of everything you've shipped and released" },
  { keys: ["bug", "triage", "issue", "fix", "defect"],
    description: "Track bugs, triage incoming issues, and assign fixes to the right sprint" },
  { keys: ["eng", "engineering", "handoff", "handoffs", "backend"],
    description: "Coordinate engineering handoffs, unblock the team, and close open loops" },
  { keys: ["blocked", "blocker", "waiting", "needs input"],
    description: "Surface blockers early — track what's stuck and who needs to act" },

  // ── Work — Stakeholder / Alignment ───────────────────────────────────────────
  { keys: ["stakeholder", "alignment", "sync"],
    description: "Stay aligned across teams — plan syncs, track follow-ups, and flag risks" },
  { keys: ["follow-up", "followup", "follow up", "nudge"],
    description: "Never let a follow-up fall through the cracks — log and track each one" },
  { keys: ["escalation", "escalations", "escalate"],
    description: "Track escalations that need immediate attention or leadership visibility" },

  // ── Work — Data / Experiments ─────────────────────────────────────────────────
  { keys: ["experiment", "experiments", "a/b", "xp", "test"],
    description: "Plan experiments, track results, and capture learnings to inform decisions" },
  { keys: ["data", "insight", "insights", "analytics", "metric", "metrics"],
    description: "Dig into the data — track analyses, metrics reviews, and key findings" },
  { keys: ["result", "results", "finding", "findings"],
    description: "Document experiment results and synthesize findings for the team" },

  // ── Work — Career / Growth ────────────────────────────────────────────────────
  { keys: ["career", "promo", "promotion", "leveling"],
    description: "Track career milestones, promotion prep, and growth conversations" },
  { keys: ["performance", "review", "review cycle", "perf"],
    description: "Prepare for performance reviews — log wins, feedback, and goals" },
  { keys: ["feedback", "1:1", "one-on-one", "manager"],
    description: "Run better 1:1s — log agenda items, feedback to share, and action items" },
  { keys: ["win", "wins", "impact", "achievement"],
    description: "Keep a running log of your wins and impact — useful for reviews and brag docs" },
  { keys: ["culture", "team", "social", "morale"],
    description: "Build a great team culture — events, shoutouts, and connection moments" },
  { keys: ["hiring", "interview", "recruit", "candidate"],
    description: "Manage the hiring pipeline — track candidates, interviews, and decisions" },
];

/**
 * Generate a contextual description for a project or section by name.
 * Optionally supply the parent project name for richer context.
 */
export function generateDescription(name: string, parentName = ""): string {
  const normalized = `${parentName} ${name}`.toLowerCase().replace(/[&\/\\]/g, " ");

  for (const rule of RULES) {
    if (rule.keys.some((k) => normalized.includes(k))) {
      return rule.description;
    }
  }

  // Generic fallback that still reads naturally
  const cleaned = name.replace(/[&\/\\]/g, "and").replace(/\s+/g, " ").trim();
  return `Organize and track your ${cleaned.toLowerCase()} tasks and notes`;
}
