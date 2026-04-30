import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const favorites = await prisma.favorite.findMany({
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, userId } = body;

  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  // Toggle: if already favorited, remove; otherwise add
  const existing = await prisma.favorite.findFirst({
    where: { projectId: parseInt(projectId, 10), userId: userId || null },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    // Also unfavorite the project itself
    await prisma.project.update({
      where: { id: parseInt(projectId, 10) },
      data: { isFavorite: false },
    });
    return NextResponse.json({ favorited: false });
  }

  const favorite = await prisma.favorite.create({
    data: { projectId: parseInt(projectId, 10), userId: userId || null },
  });
  await prisma.project.update({
    where: { id: parseInt(projectId, 10) },
    data: { isFavorite: true },
  });

  return NextResponse.json({ favorited: true, favorite }, { status: 201 });
}
