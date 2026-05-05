import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function GET() {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const { projectId } = body;
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const existing = await prisma.favorite.findFirst({
    where: { projectId: parseInt(projectId, 10), userId },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    await prisma.project.update({
      where: { id: parseInt(projectId, 10) },
      data: { isFavorite: false },
    });
    return NextResponse.json({ favorited: false });
  }

  const favorite = await prisma.favorite.create({
    data: { projectId: parseInt(projectId, 10), userId },
  });
  await prisma.project.update({
    where: { id: parseInt(projectId, 10) },
    data: { isFavorite: true },
  });

  return NextResponse.json({ favorited: true, favorite }, { status: 201 });
}
