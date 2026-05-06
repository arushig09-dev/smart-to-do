import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { id: "desc" },
    take: 6,
    include: { _count: { select: { projects: true } } },
  });
  for (const u of users) {
    console.log(`id=${u.id} email=${u.email} onboarding=${u.onboardingDone} projects=${u._count.projects}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
