import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where = projectId ? { projectId: parseInt(projectId, 10) } : {};
  const sections = await prisma.section.findMany({
    where,
    orderBy: { order: "asc" },
  });

  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, projectId, order } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  const section = await prisma.section.create({
    data: { name: name.trim(), projectId: parseInt(projectId, 10), order: order ?? 0 },
  });

  return NextResponse.json(section, { status: 201 });
}
