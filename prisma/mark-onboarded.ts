import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.user.updateMany({
    where: { onboardingDone: false },
    data: { onboardingDone: true },
  });
  console.log(`Marked ${result.count} existing user(s) as onboardingDone = true`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
