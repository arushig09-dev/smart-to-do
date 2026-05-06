/**
 * prisma/migrate-social.ts
 *
 * One-time migration: restructure the Personal project tree for
 * the Social & Events Option C/2 redesign.
 *
 * SAFE — additive only:
 *   ✓ Creates "Social & Events" with 3 sections (if it doesn't exist)
 *   ✓ Renames "Travel & Social" → "Travel" and removes "Friends Catch-ups"
 *   ✓ Removes "Events & Birthdays" from Family & Kids
 *   ✗ Does NOT delete or reassign any existing tasks
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Running Social & Events migration…\n");

  // ── 1. Find the Personal root project ──────────────────────────────────────
  const personal = await prisma.project.findFirst({
    where: { parentId: null, name: "Personal" },
    include: { children: { include: { sections: true } } },
  });

  if (!personal) {
    console.error("❌  Could not find a top-level 'Personal' project. Aborting.");
    process.exit(1);
  }

  console.log(`Found Personal (id=${personal.id})`);

  // ── 2. Rename "Travel & Social" → "Travel", remove "Friends Catch-ups" ──────
  const travelSocial = personal.children.find((c) => c.name === "Travel & Social");
  if (travelSocial) {
    await prisma.project.update({
      where: { id: travelSocial.id },
      data: { name: "Travel" },
    });
    console.log(`  ✓ Renamed "Travel & Social" → "Travel"`);

    const friendsCatchup = travelSocial.sections.find((s) =>
      s.name.toLowerCase().includes("friend")
    );
    if (friendsCatchup) {
      const taskCount = await prisma.task.count({ where: { sectionId: friendsCatchup.id } });
      if (taskCount === 0) {
        await prisma.section.delete({ where: { id: friendsCatchup.id } });
        console.log(`  ✓ Removed empty "Friends Catch-ups" section`);
      } else {
        console.log(
          `  ⚠️  "Friends Catch-ups" has ${taskCount} task(s) — section kept, please re-categorize manually`
        );
      }
    }
  } else {
    const alreadyTravel = personal.children.find((c) => c.name === "Travel");
    if (alreadyTravel) {
      console.log(`  ↩  "Travel" already exists — skipping rename`);
    } else {
      console.log(`  ⚠️  Could not find "Travel & Social" — skipping`);
    }
  }

  // ── 3. Remove "Events & Birthdays" from Family & Kids ──────────────────────
  const familyKids = personal.children.find((c) => c.name === "Family & Kids");
  if (familyKids) {
    const eventsBirthdays = familyKids.sections.find((s) =>
      s.name.toLowerCase().includes("event") || s.name.toLowerCase().includes("birthday")
    );
    if (eventsBirthdays) {
      const taskCount = await prisma.task.count({ where: { sectionId: eventsBirthdays.id } });
      if (taskCount === 0) {
        await prisma.section.delete({ where: { id: eventsBirthdays.id } });
        console.log(`  ✓ Removed empty "Events & Birthdays" section from Family & Kids`);
      } else {
        console.log(
          `  ⚠️  "Events & Birthdays" has ${taskCount} task(s) — section kept, please re-categorize manually`
        );
      }
    }
  }

  // ── 4. Create "Social & Events" if it doesn't exist ────────────────────────
  const alreadySocial = personal.children.find((c) => c.name === "Social & Events");
  if (alreadySocial) {
    console.log(`  ↩  "Social & Events" already exists (id=${alreadySocial.id}) — skipping`);
  } else {
    // Place it at order=5, bump Travel up to 6
    const social = await prisma.project.create({
      data: {
        name: "Social & Events",
        emoji: "🎉",
        color: "#ec4899",
        parentId: personal.id,
        order: 5,
      },
    });
    console.log(`  ✓ Created "Social & Events" (id=${social.id})`);

    const sections = ["Keeping in Touch", "Plans & Meetups", "Milestones"];
    for (let i = 0; i < sections.length; i++) {
      await prisma.section.create({
        data: { name: sections[i], order: i, projectId: social.id },
      });
    }
    console.log(`  ✓ Added sections: ${sections.join(" · ")}`);

    // Push Travel's order to 6
    const travel = personal.children.find(
      (c) => c.name === "Travel" || c.name === "Travel & Social"
    );
    if (travel) {
      await prisma.project.update({ where: { id: travel.id }, data: { order: 6 } });
    }
  }

  console.log("\n✅  Migration complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
