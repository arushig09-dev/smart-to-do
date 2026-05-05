import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

export async function GET(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const where = projectId
    ? { projectId: parseInt(projectId, 10), project: { userId } }
    : { project: { userId } };
  const sections = await prisma.section.findMany({
    where,
    orderBy: { order: "asc" },
  });

  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json();
  const { name, projectId, order } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

  // Verify the project belongs to this user
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId, 10), userId },
  });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const section = await prisma.section.create({
    data: { name: name.trim(), projectId: parseInt(projectId, 10), order: order ?? 0 },
  });

  return NextResponse.json(section, { status: 201 });
}
