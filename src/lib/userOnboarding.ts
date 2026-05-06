import { prisma } from "@/lib/prisma";

type SectionName = string;
type ProjectTemplate = {
  name: string;
  emoji: string;
  color: string;
  order: number;
  isFavorite?: boolean;
  sections: SectionName[];
  children?: Omit<ProjectTemplate, "isFavorite">[];
};

// ─── Personal track definitions ───────────────────────────────────────────────
// Keys match what the onboarding page sends in `personalTracks[]`.
const PERSONAL_TRACK_MAP: Record<string, ProjectTemplate> = {
  logistics: {
    name: "Day-to-day Logistics", emoji: "🛒", color: "#84cc16", order: 0,
    sections: ["Groceries & Shopping", "Home Maintenance", "Orders & Returns", "Other Errands"],
  },
  family: {
    name: "Family & Kids", emoji: "👨‍👩‍👧", color: "#fb7185", order: 1,
    sections: ["Baby & Parenting", "Appointments", "Events & Birthdays", "Playdates"],
  },
  health: {
    name: "Health & Wellness", emoji: "💪", color: "#22c55e", order: 2,
    sections: ["Fitness", "Nutrition", "Appointments", "Self-care"],
  },
  finance: {
    name: "Finance", emoji: "💰", color: "#0d9488", order: 3,
    sections: ["Bills & Subscriptions", "Taxes & Docs", "Insurance", "Big Purchases"],
  },
  learning: {
    name: "Learning & Hobbies", emoji: "🎓", color: "#7c3aed", order: 4,
    sections: ["Reading", "Courses", "Hobbies", "Personal Goals"],
  },
  social: {
    name: "Social & Events", emoji: "🎉", color: "#f97316", order: 5,
    sections: ["Upcoming Events", "Plans to Make", "Gifts & Cards", "RSVPs"],
  },
  travel: {
    name: "Travel & Adventure", emoji: "✈️", color: "#0ea5e9", order: 6,
    sections: ["Upcoming Trips", "Trip Planning", "Packing", "Bucket List"],
  },
};

const ALL_PERSONAL_TRACKS = ["logistics", "family", "health", "finance", "learning", "social", "travel"];

// ─── Work persona templates ────────────────────────────────────────────────────

const WORK_PERSONAS: Record<string, ProjectTemplate[]> = {
  // 🔨 Maker — IC, engineer, designer, analyst
  maker: [
    {
      name: "Deep Work", emoji: "🎯", color: "#6366f1", order: 0,
      sections: ["This Sprint", "In Progress", "Blocked", "Done"],
    },
    {
      name: "Reviews & Feedback", emoji: "🔍", color: "#06b6d4", order: 1,
      sections: ["To Review", "Feedback to Give", "Waiting for Review", "Done"],
    },
    {
      name: "Learning", emoji: "📚", color: "#7c3aed", order: 2,
      sections: ["Courses", "Articles & Reads", "Experiments", "Notes"],
    },
    {
      name: "Career", emoji: "🏆", color: "#eab308", order: 3,
      sections: ["Goals", "Wins", "1:1 Prep", "Skills to Build"],
    },
    {
      name: "Admin", emoji: "🗂️", color: "#64748b", order: 4,
      sections: ["Recurring", "Expenses", "Meeting Prep", "Misc"],
    },
  ],

  // 🗺️ Strategist — PM, TPM, ops
  strategist: [
    {
      name: "Roadmap & Priorities", emoji: "🗺️", color: "#8b5cf6", order: 0,
      sections: ["Shipping Now", "Up Next", "Backlog", "Ideas & Exploration"],
    },
    {
      name: "Discovery & Research", emoji: "🔍", color: "#06b6d4", order: 1,
      sections: ["User Research", "Data & Insights", "Competitive Intel", "Open Questions"],
    },
    {
      name: "Stakeholders & Comms", emoji: "🤝", color: "#f59e0b", order: 2,
      sections: ["Follow-ups", "Waiting On", "To Discuss", "Escalations"],
    },
    {
      name: "Launch & GTM", emoji: "🚀", color: "#22c55e", order: 3,
      sections: ["Pre-launch", "Launch Day", "Post-launch", "Retrospective"],
    },
    {
      name: "Admin", emoji: "🗂️", color: "#64748b", order: 4,
      sections: ["Recurring", "Meeting Prep", "Expenses", "Misc"],
    },
  ],

  // 🧭 Coach — manager, team lead
  coach: [
    {
      name: "My Team", emoji: "👥", color: "#6366f1", order: 0,
      sections: ["1:1s", "Performance", "Unblocking", "Recognition"],
    },
    {
      name: "Planning & OKRs", emoji: "📋", color: "#8b5cf6", order: 1,
      sections: ["Goals & OKRs", "Roadmap", "Backlog", "Retrospectives"],
    },
    {
      name: "Hiring", emoji: "🎯", color: "#f59e0b", order: 2,
      sections: ["Roles Open", "Interviews", "Offers", "Onboarding"],
    },
    {
      name: "Admin", emoji: "🗂️", color: "#64748b", order: 3,
      sections: ["Recurring", "Meeting Prep", "Escalations", "Expenses"],
    },
  ],

  // 🚀 Pioneer — founder, operator
  pioneer: [
    {
      name: "Product", emoji: "🛠️", color: "#6366f1", order: 0,
      sections: ["Shipping Now", "Up Next", "Backlog", "Customer Feedback"],
    },
    {
      name: "Growth & Sales", emoji: "📈", color: "#22c55e", order: 1,
      sections: ["Pipeline", "Outreach", "Marketing", "Partnerships"],
    },
    {
      name: "Fundraising", emoji: "💰", color: "#eab308", order: 2,
      sections: ["Investors", "Due Diligence", "Pitch Prep", "Legal"],
    },
    {
      name: "Ops & Finance", emoji: "⚙️", color: "#0d9488", order: 3,
      sections: ["Invoices", "Payroll", "Legal", "Infrastructure"],
    },
    {
      name: "Team & Hiring", emoji: "👥", color: "#f59e0b", order: 4,
      sections: ["Open Roles", "Interviews", "1:1s", "Culture"],
    },
  ],

  // 🌱 Explorer — student, early career
  explorer: [
    {
      name: "Coursework", emoji: "📖", color: "#6366f1", order: 0,
      sections: ["Assignments", "Exams", "Study Groups", "Research"],
    },
    {
      name: "Job Search", emoji: "💼", color: "#f59e0b", order: 1,
      sections: ["Applications", "Networking", "Interviews", "Offers"],
    },
    {
      name: "Projects", emoji: "🛠️", color: "#22c55e", order: 2,
      sections: ["Side Projects", "Portfolio", "Ideas", "In Progress"],
    },
    {
      name: "Campus & Social", emoji: "🎓", color: "#fb7185", order: 3,
      sections: ["Clubs & Activities", "Events", "Housing", "Finance"],
    },
  ],

  // ✏️ Default / Start fresh — generic structure
  default: [
    {
      name: "Planning", emoji: "🗺️", color: "#8b5cf6", order: 0,
      sections: ["Goals & OKRs", "Roadmap", "Backlog", "Someday"],
    },
    {
      name: "Execution", emoji: "⚙️", color: "#06b6d4", order: 1,
      sections: ["This Week", "In Progress", "Blocked", "Done"],
    },
    {
      name: "Stakeholders", emoji: "🤝", color: "#f59e0b", order: 2,
      sections: ["Follow-ups", "Waiting On", "To Discuss", "Escalations"],
    },
    {
      name: "Career", emoji: "🏆", color: "#eab308", order: 3,
      sections: ["Goals", "Wins", "1:1 Prep", "Learning"],
    },
    {
      name: "Admin", emoji: "🗂️", color: "#64748b", order: 4,
      sections: ["Recurring", "Expenses & Travel", "Meeting Prep", "Vendor Requests"],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createProjectWithSections(
  template: ProjectTemplate,
  userId: number,
  parentId?: number
) {
  const project = await prisma.project.create({
    data: {
      name: template.name,
      emoji: template.emoji,
      color: template.color,
      order: template.order,
      isFavorite: template.isFavorite ?? false,
      userId,
      parentId: parentId ?? null,
    },
  });

  for (let i = 0; i < template.sections.length; i++) {
    await prisma.section.create({
      data: { name: template.sections[i], order: i, projectId: project.id },
    });
  }

  if (template.children) {
    for (const child of template.children) {
      await createProjectWithSections(child, userId, project.id);
    }
  }

  return project;
}

// ─── Main entry points ────────────────────────────────────────────────────────

/**
 * Called from the onboarding API after persona selection.
 * Creates work projects based on persona, and personal projects based on selected tracks.
 * customTracks: free-text names the user typed in themselves.
 */
export async function seedUserProjectsWithPersona(
  userId: number,
  workPersona: string,
  personalTracks: string[],
  customTracks: string[] = []
): Promise<void> {
  const workChildren = WORK_PERSONAS[workPersona] ?? WORK_PERSONAS.default;

  // Work root
  const work = await prisma.project.create({
    data: { name: "Work", emoji: "💼", color: "#6366f1", order: 0, isFavorite: true, userId },
  });
  for (const child of workChildren) {
    await createProjectWithSections(child, userId, work.id);
  }

  // Personal root
  const personal = await prisma.project.create({
    data: { name: "Personal", emoji: "🏠", color: "#f43f5e", order: 1, isFavorite: true, userId },
  });

  // Use selected tracks; fall back to all tracks if nothing selected
  const tracksToSeed = personalTracks.length > 0 ? personalTracks : ALL_PERSONAL_TRACKS;
  let personalOrder = 0;
  for (const trackKey of tracksToSeed) {
    const template = PERSONAL_TRACK_MAP[trackKey];
    if (!template) continue;
    await createProjectWithSections({ ...template, order: personalOrder++ }, userId, personal.id);
  }

  // Custom tracks the user typed in
  for (const customName of customTracks) {
    if (!customName.trim()) continue;
    const proj = await prisma.project.create({
      data: { name: customName.trim(), emoji: "📁", color: "#94a3b8", order: personalOrder++, userId, parentId: personal.id },
    });
    await prisma.section.create({ data: { name: "Tasks", order: 0, projectId: proj.id } });
  }
}

/**
 * Legacy path — used when a user is created outside the onboarding flow (e.g. old signup).
 * Seeds the default full taxonomy.
 */
export async function seedUserProjects(userId: number): Promise<void> {
  await seedUserProjectsWithPersona(userId, "default", ALL_PERSONAL_TRACKS);
}
