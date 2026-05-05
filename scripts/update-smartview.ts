import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const view = await prisma.smartView.findFirst({ where: { name: "High Priority" } });
  if (!view) { console.log("High Priority view not found"); return; }
  const updated = await prisma.smartView.update({
    where: { id: view.id },
    data: { filterJson: { priority: ["P0"], status: "open", groupBy: "project" } }
  });
  console.log("Updated:", updated.name, JSON.stringify(updated.filterJson));
}
main().catch(console.error).finally(() => prisma.$disconnect());
