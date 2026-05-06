import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await prisma.user.deleteMany({
    where: { email: "annugupta202@gmail.com" },
  });
  console.log(`Deleted ${result.count} user(s)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
