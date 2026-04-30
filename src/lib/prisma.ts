import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  return new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL!,
  }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
