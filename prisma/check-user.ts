import { prisma } from "../src/lib/prisma";

async function main() {
  const u = await prisma.user.findUnique({ where: { email: "annugupta202@gmail.com" } });
  if (u) {
    console.log("FOUND:", JSON.stringify({ id: u.id, name: u.name, email: u.email, onboardingDone: u.onboardingDone }));
  } else {
    console.log("NOT FOUND — email is free to sign up");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
