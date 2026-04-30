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
      where: { id: sv.order + 1 }, // deterministic for re-runs
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
  // ║  WORK                                                            ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const work = await createProject("Work", "💼", "#6366f1", null, 0, true);

  // Strategy & Roadmap
  const strategy = await createProject("Strategy & Roadmap", "🗺️", "#8b5cf6", work.id, 0);
  await addSections(strategy.id, ["Vision & Goals", "Quarterly OKRs", "Feature Backlog", "Deprioritized"]);

  // Deliverables & Specs
  const deliverables = await createProject("Deliverables & Specs", "📄", "#3b82f6", work.id, 1);
  await addSections(deliverables.id, ["In Progress", "In Review", "Shipped", "On Hold"]);

  // Execution & Sprints
  const execution = await createProject("Execution & Sprints", "⚙️", "#06b6d4", work.id, 2);
  await addSections(execution.id, ["This Week", "Blocked / Needs Input", "Eng Handoffs", "Bug Triage"]);

  // Stakeholder & Alignment
  const stakeholder = await createProject("Stakeholder & Alignment", "🤝", "#f59e0b", work.id, 3);
  await addSections(stakeholder.id, ["Follow-ups Needed", "Waiting on Others", "To Sync", "Escalations"]);

  // Data & Insights (parent) → Experiments (child)
  const data = await createProject("Data & Insights", "📊", "#10b981", work.id, 4);
  const experiments = await createProject("Experiments", "🧪", "#10b981", data.id, 0);
  await addSections(experiments.id, ["Planning", "Running", "Results Analyzed", "Learnings"]);

  // Growth & Upskilling
  const growth = await createProject("Growth & Upskilling", "📚", "#f97316", work.id, 5);
  await addSections(growth.id, ["Currently Learning", "Reading List", "Courses", "To Explore"]);

  // Career & Performance
  const career = await createProject("Career & Performance", "🏆", "#eab308", work.id, 6);
  await addSections(career.id, ["Goals", "Wins & Impact Log", "1:1 Prep", "Feedback to Give / Get"]);

  // Culture & Social
  const culture = await createProject("Culture & Social", "🎉", "#ec4899", work.id, 7);
  await addSections(culture.id, ["Team Events", "Shoutouts", "Coffee Chats", "Hiring"]);

  // Admin & Ops
  const admin = await createProject("Admin & Ops", "🗂️", "#64748b", work.id, 8);
  await addSections(admin.id, ["Recurring", "Expenses & Travel", "Vendor Requests", "Meeting Prep"]);

  console.log("  ✓ Work folder structure");

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  PERSONAL                                                        ║
  // ╚══════════════════════════════════════════════════════════════════╝

  const personal = await createProject("Personal", "🏠", "#f43f5e", null, 1, true);

  // Daily Logistics
  const logistics = await createProject("Daily Logistics", "🛒", "#84cc16", personal.id, 0);
  await addSections(logistics.id, ["Groceries", "Online Orders & Returns", "Home Supplies", "Errands"]);

  // Baby & Parenting
  const baby = await createProject("Baby & Parenting", "👶", "#fb7185", personal.id, 1);
  await addSections(baby.id, [
    "Health & Checkups",
    "Gear & Supplies",
    "Development & Activities",
    "Childcare & Care Team",
  ]);

  // Health & Medical
  const health = await createProject("Health & Medical", "🏥", "#ef4444", personal.id, 2);
  await addSections(health.id, [
    "My Appointments",
    "Baby Appointments",
    "Prescriptions & Refills",
    "Insurance & Claims",
  ]);

  // Fitness & Wellness
  const fitness = await createProject("Fitness & Wellness", "💪", "#22c55e", personal.id, 3);
  await addSections(fitness.id, ["Workouts", "Nutrition & Meal Prep", "Sleep & Recovery", "Self-care"]);

  // Family & Social
  const family = await createProject("Family & Social", "👨‍👩‍👧", "#f97316", personal.id, 4);
  await addSections(family.id, ["Family Events", "Birthdays & Gifts", "Playdates", "Friends Catch-ups"]);

  // Travel & Outings
  const travel = await createProject("Travel & Outings", "✈️", "#0ea5e9", personal.id, 5);
  await addSections(travel.id, ["Upcoming Trips", "Trip Planning", "Day Outings", "Packing Lists"]);

  // Home & House → Renovation Projects (child)
  const home = await createProject("Home & House", "🏡", "#a16207", personal.id, 6);
  await addSections(home.id, ["Maintenance & Repairs", "Decor & Furnishing", "Service Providers"]);
  const reno = await createProject("Renovation Projects", "🔨", "#a16207", home.id, 0);
  await addSections(reno.id, ["Planning", "Active", "Completed", "Contractors & Quotes"]);

  // Finance & Admin
  const finance = await createProject("Finance & Admin", "💰", "#0d9488", personal.id, 7);
  await addSections(finance.id, [
    "Bills & Subscriptions",
    "Taxes & Documents",
    "Insurance",
    "Big Purchases",
  ]);

  // Learning & Personal Growth → sub-sub-projects
  const learning = await createProject("Learning & Personal Growth", "🎓", "#7c3aed", personal.id, 8);

  const books = await createProject("Books & Podcasts", "📖", "#7c3aed", learning.id, 0);
  await addSections(books.id, ["Currently Reading / Listening", "On the List", "Finished This Year"]);

  const courses = await createProject("Courses & Skills", "🧑‍💻", "#7c3aed", learning.id, 1);
  await addSections(courses.id, ["In Progress", "Planned", "Completed"]);

  const hobbies = await createProject("Hobbies & Creative", "🎨", "#7c3aed", learning.id, 2);
  await addSections(hobbies.id, ["Active", "Want to Try", "On Pause"]);

  // Mental Load
  const mental = await createProject("Mental Load", "🧘", "#6b7280", personal.id, 9);
  await addSections(mental.id, ["Things to Decide", "Research Needed", "Delegatable", "Long-term Goals"]);

  // Meal Planning → sub-sub-projects
  const meals = await createProject("Meal Planning", "🍽️", "#dc2626", personal.id, 10);

  const recipes = await createProject("Recipe Box", "📖", "#dc2626", meals.id, 0);
  await addSections(recipes.id, ["Quick & Easy", "Weekend Cooking", "Baby-Friendly", "Meal Prep", "Favourites"]);

  const menu = await createProject("Weekly Menu", "📅", "#dc2626", meals.id, 1);
  await addSections(menu.id, ["This Week", "Next Week", "Meal Prep Tasks", "Tried & Loved"]);

  const babyFeeding = await createProject("Baby Feeding", "🍼", "#dc2626", meals.id, 2);
  await addSections(babyFeeding.id, ["Today's Log", "Feeding Schedule", "Introducing Solids"]);

  console.log("  ✓ Personal folder structure");
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
