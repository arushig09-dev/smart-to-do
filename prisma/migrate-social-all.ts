/**
 * prisma/migrate-social-all.ts
 *
 * Runs the Social & Events restructure for ALL Personal root projects
 * (i.e. all user accounts), not just the first one found.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config"; // loads DATABASE_URL from .env

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function migratePersonal(personalId: number) {
  const personal = await prisma.project.findUnique({
    where: { id: personalId },
    include: { children: { include: { sections: true } } },
  });
  if (!personal) return;

  console.log(`\n── Personal id=${personalId} ──`);

  // 1. Rename "Travel & Social" → "Travel", remove "Friends Catch-ups"
  const travelSocial = personal.children.find((c) => c.name === "Travel & Social");
  if (travelSocial) {
    await prisma.project.update({ where: { id: travelSocial.id }, data: { name: "Travel" } });
    console.log(`  ✓ Renamed "Travel & Social" (id=${travelSocial.id}) → "Travel"`);

    const friendsCatchup = travelSocial.sections.find((s) =>
      s.name.toLowerCase().includes("friend")
    );
    if (friendsCatchup) {
      const taskCount = await prisma.task.count({ where: { sectionId: friendsCatchup.id } });
      if (taskCount === 0) {
        await prisma.section.delete({ where: { id: friendsCatchup.id } });
        console.log(`  ✓ Removed empty "Friends Catch-ups" section (id=${friendsCatchup.id})`);
      } else {
        console.log(`  ⚠️  "Friends Catch-ups" (id=${friendsCatchup.id}) has ${taskCount} task(s) — kept`);
      }
    }
  } else if (personal.children.find((c) => c.name === "Travel")) {
    console.log(`  ↩  "Travel" already renamed`);
  }

  // 2. Remove "Events & Birthdays" from Family & Kids
  const familyKids = personal.children.find((c) => c.name === "Family & Kids");
  if (familyKids) {
    const eventsSection = familyKids.sections.find(
      (s) => s.name.toLowerCase().includes("event") || s.name.toLowerCase().includes("birthday")
    );
    if (eventsSection) {
      const taskCount = await prisma.task.count({ where: { sectionId: eventsSection.id } });
      if (taskCount === 0) {
        await prisma.section.delete({ where: { id: eventsSection.id } });
        console.log(`  ✓ Removed empty "${eventsSection.name}" section (id=${eventsSection.id}) from Family & Kids`);
      } else {
        console.log(`  ⚠️  "${eventsSection.name}" (id=${eventsSection.id}) has ${taskCount} task(s) — kept`);
      }
    }
  }

  // 3. Create "Social & Events" if it doesn't exist
  const existing = personal.children.find((c) => c.name === "Social & Events");
  if (existing) {
    console.log(`  ↩  "Social & Events" already exists (id=${existing.id})`);
    // Ensure all 3 sections exist
    const sectionNames = ["Keeping in Touch", "Plans & Meetups", "Milestones"];
    for (let i = 0; i < sectionNames.length; i++) {
      const name = sectionNames[i];
      const alreadyHas = existing.sections?.find((s: { name: string }) => s.name === name);
      if (!alreadyHas) {
        // Need to re-fetch sections for existing
        const freshExisting = await prisma.project.findUnique({
          where: { id: existing.id },
          include: { sections: true },
        });
        if (!freshExisting?.sections.find((s) => s.name === name)) {
          await prisma.section.create({ data: { name, order: i, projectId: existing.id } });
          console.log(`  ✓ Added missing section "${name}"`);
        }
      }
    }
  } else {
    const social = await prisma.project.create({
      data: {
        name: "Social & Events",
        emoji: "🎉",
        color: "#ec4899",
        parentId: personal.id,
        userId: personal.userId,  // inherit from parent so it shows up for the right user
        order: 5,
      },
    });
    console.log(`  ✓ Created "Social & Events" (id=${social.id})`);
    const sections = ["Keeping in Touch", "Plans & Meetups", "Milestones"];
    for (let i = 0; i < sections.length; i++) {
      await prisma.section.create({ data: { name: sections[i], order: i, projectId: social.id } });
    }
    console.log(`  ✓ Added sections: ${sections.join(" · ")}`);
  }
}

async function main() {
  console.log("Running Social & Events migration for ALL users…");

  const personalProjects = await prisma.project.findMany({
    where: { parentId: null, name: "Personal" },
    select: { id: true },
  });

  console.log(`Found ${personalProjects.length} Personal root project(s): ${personalProjects.map((p) => p.id).join(", ")}`);

  for (const { id } of personalProjects) {
    await migratePersonal(id);
  }

  console.log("\n✅  All users migrated.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
