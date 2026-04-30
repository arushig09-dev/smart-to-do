import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const views = await prisma.smartView.findMany({
    where: { userId: null }, // default views; user-specific views filtered by userId in Phase 3
    orderBy: { order: "asc" },
  });
  return NextResponse.json(views);
}
