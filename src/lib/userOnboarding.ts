import { prisma } from "@/lib/prisma";

// ─── Template structure ───────────────────────────────────────────────────────
// Mirrors the seed.ts structure but scoped to a specific userId.
// Called once when a new user account is created.

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

const WORK_CHILDREN: ProjectTemplate[] = [
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
];

const PERSONAL_CHILDREN: ProjectTemplate[] = [
  {
    name: "Day-to-day Logistics", emoji: "🛒", color: "#84cc16", order: 0,
    sections: ["Groceries & Shopping", "Home Maintenance", "Orders & Returns", "Other Errands"],
  },
  {
    name: "Family & Kids", emoji: "👨‍👩‍👧", color: "#fb7185", order: 1,
    sections: ["Baby & Parenting", "Appointments", "Events & Birthdays", "Playdates"],
  },
  {
    name: "Health & Wellness", emoji: "💪", color: "#22c55e", order: 2,
    sections: ["Fitness", "Nutrition", "Appointments", "Self-care"],
  },
  {
    name: "Finance", emoji: "💰", color: "#0d9488", order: 3,
    sections: ["Bills & Subscriptions", "Taxes & Docs", "Insurance", "Big Purchases"],
  },
  {
    name: "Learning & Hobbies", emoji: "🎓", color: "#7c3aed", order: 4,
    sections: ["Reading", "Courses", "Hobbies", "Personal Goals"],
  },
  {
    name: "Travel & Social", emoji: "✈️", color: "#0ea5e9", order: 5,
    sections: ["Upcoming Trips", "Trip Planning", "Friends Catch-ups", "Packing"],
  },
];

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

export async function seedUserProjects(userId: number): Promise<void> {
  // Work root
  const work = await prisma.project.create({
    data: { name: "Work", emoji: "💼", color: "#6366f1", order: 0, isFavorite: true, userId },
  });
  for (const child of WORK_CHILDREN) {
    await createProjectWithSections(child, userId, work.id);
  }

  // Personal root
  const personal = await prisma.project.create({
    data: { name: "Personal", emoji: "🏠", color: "#f43f5e", order: 1, isFavorite: true, userId },
  });
  for (const child of PERSONAL_CHILDREN) {
    await createProjectWithSections(child, userId, personal.id);
  }
}
