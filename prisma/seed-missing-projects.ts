import { prisma } from "../src/lib/prisma";
import { seedUserProjectsWithPersona } from "../src/lib/userOnboarding";

async function main() {
  const usersWithNoProjects = await prisma.user.findMany({
    where: { projects: { none: {} } },
    select: { id: true, email: true },
  });

  console.log(`Found ${usersWithNoProjects.length} user(s) with no projects`);

  for (const user of usersWithNoProjects) {
    console.log(`Seeding default projects for user ${user.id} (${user.email})…`);
    await seedUserProjectsWithPersona(user.id, "default", [
      "logistics", "family", "health", "finance", "learning", "social", "travel",
    ]);
    console.log(`  Done.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
