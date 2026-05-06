import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── helpers ────────────────────────────────────────────────────────────────

async function createProject(
  name: string,
  emoji: string,
  color: string,
  parentId: number | null,
  order: number,
  isFavorite = false
) {
  return prisma.project.create({
    data: { name, emoji, color, parentId: parentId ?? undefined, order, isFavorite },
  });
}

async function addSections(projectId: number, names: string[]) {
  for (let i = 0; i < names.length; i++) {
    await prisma.section.create({ data: { name: names[i], order: i, projectId } });
  }
}

// ─── seed ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database…");

  // ── Clean slate — remove all existing projects/sections (cascades to tasks) ──
  await prisma.section.deleteMany({});
  await prisma.project.deleteMany({});
  console.log("  ✓ Cleared old projects & sections");

  // ── Smart Views (always global, no userId) ──────────────────────────────
  const smartViews = [
    {
      name: "Due This Week",
      emoji: "📅",
      order: 0,
      isDefault: true,
      filterJson: { dueBefore: "endOfWeek", status: "open", groupBy: "project" },
    },
    {
      name: "Due Next Week",
      emoji: "📅",
      order: 1,
      isDefault: true,
      filterJson: {
        dueAfter: "endOfWeek",
        dueBefore: "endOfNextWeek",
        status: "open",
        groupBy: "project",
      },
    },
    {
      name: "Due in 30 Days",
      emoji: "📆",
      order: 2,
      isDefault: true,
      filterJson: { dueBefore: "30days", status: "open", groupBy: "project" },
    },
    {
      name: "High Priority",
      emoji: "🔥",
      order: 3,
      isDefault: true,
      filterJson: { priority: ["P0", "P1"], status: "open", groupBy: "project" },
    },
  ];

  for (const sv of smartViews) {
    await prisma.smartView.upsert({
      where: { id: sv.order + 1 },
      update: {},
      create: sv,
    });
  }
  console.log("  ✓ Smart views");

  // ── Default Labels ──────────────────────────────────────────────────────
  const labels = [
    { name: "urgent",      emoji: "🔥", color: "#ef4444" },
    { name: "waiting",     emoji: "⏳", color: "#f59e0b" },
    { name: "quick-win",   emoji: "⚡", color: "#22c55e" },
    { name: "needs-input", emoji: "🙋", color: "#3b82f6" },
    { name: "someday",     emoji: "🌙", color: "#8b5cf6" },
  ];

  for (const l of labels) {
    await prisma.label.upsert({
      where: { id: labels.indexOf(l) + 1 },
      update: {},
      create: l,
    });
  }
  console.log("  ✓ Labels");

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  WORK  (5 sub-projects)                                         ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const work = await createProject("Work", "💼", "#6366f1", null, 0, true);

  // Planning
  const planning = await createProject("Planning", "🗺️", "#8b5cf6", work.id, 0);
  await addSections(planning.id, ["Goals & OKRs", "Roadmap", "Backlog", "Someday"]);

  // Execution
  const execution = await createProject("Execution", "⚙️", "#06b6d4", work.id, 1);
  await addSections(execution.id, ["This Week", "In Progress", "Blocked", "Done"]);

  // Stakeholders
  const stakeholders = await createProject("Stakeholders", "🤝", "#f59e0b", work.id, 2);
  await addSections(stakeholders.id, ["Follow-ups", "Waiting On", "To Discuss", "Escalations"]);

  // Career
  const career = await createProject("Career", "🏆", "#eab308", work.id, 3);
  await addSections(career.id, ["Goals", "Wins", "1:1 Prep", "Learning"]);

  // Admin
  const admin = await createProject("Admin", "🗂️", "#64748b", work.id, 4);
  await addSections(admin.id, ["Recurring", "Expenses & Travel", "Meeting Prep", "Vendor Requests"]);

  console.log("  ✓ Work folder structure");

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  PERSONAL  (6 sub-projects)                                     ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const personal = await createProject("Personal", "🏠", "#f43f5e", null, 1, true);

  // Day-to-day Logistics
  const logistics = await createProject("Day-to-day Logistics", "🛒", "#84cc16", personal.id, 0);
  await addSections(logistics.id, ["Groceries & Shopping", "Home Maintenance", "Orders & Returns", "Other Errands"]);

  // Family & Kids — logistics only (removed social/events parts)
  const family = await createProject("Family & Kids", "👨‍👩‍👧", "#fb7185", personal.id, 1);
  await addSections(family.id, ["Baby & Parenting", "Appointments", "Playdates"]);

  // Health & Wellness
  const health = await createProject("Health & Wellness", "💪", "#22c55e", personal.id, 2);
  await addSections(health.id, ["Fitness", "Nutrition", "Appointments", "Self-care"]);

  // Finance
  const finance = await createProject("Finance", "💰", "#0d9488", personal.id, 3);
  await addSections(finance.id, ["Bills & Subscriptions", "Taxes & Docs", "Insurance", "Big Purchases"]);

  // Learning & Hobbies
  const learning = await createProject("Learning & Hobbies", "🎓", "#7c3aed", personal.id, 4);
  await addSections(learning.id, ["Reading", "Courses", "Hobbies", "Personal Goals"]);

  // Social & Events — task-type based, not relationship-based
  const social = await createProject("Social & Events", "🎉", "#ec4899", personal.id, 5);
  await addSections(social.id, ["Keeping in Touch", "Plans & Meetups", "Milestones"]);

  // Travel — trips only (social catchups moved to Social & Events)
  const travel = await createProject("Travel", "✈️", "#0ea5e9", personal.id, 6);
  await addSections(travel.id, ["Upcoming Trips", "Trip Planning", "Packing"]);

  console.log("  ✓ Personal folder structure");
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
