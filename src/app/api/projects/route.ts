import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";

  const projects = await prisma.project.findMany({
    where: includeArchived ? {} : { isArchived: false },
    include: { sections: { orderBy: { order: "asc" } }, children: true },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, emoji, color, parentId, order, isFavorite } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      emoji: emoji || null,
      color: color || "#6366f1",
      parentId: parentId || null,
      order: order ?? 0,
      isFavorite: !!isFavorite,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
