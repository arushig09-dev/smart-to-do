import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDescription } from "@/lib/descriptionGenerator";

export type OverviewCard = {
  id: number;
  type: "project" | "section";
  name: string;
  emoji: string | null;
  color: string | null;
  description: string;
  taskCount: number;
  sectionNames: string[];
  topTasks: { id: number; title: string }[];
};

export type ProjectOverviewData = {
  project: {
    id: number;
    name: string;
    emoji: string | null;
    color: string | null;
  };
  cards: OverviewCard[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = parseInt(id, 10);
  if (isNaN(projectId))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sections: { orderBy: { order: "asc" } },
      children: {
        where: { isArchived: false },
        orderBy: { order: "asc" },
        include: {
          sections: { orderBy: { order: "asc" } },
          _count: { select: { tasks: { where: { status: { not: "done" } } } } },
        },
      },
    },
  });

  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let cards: OverviewCard[];

  if (project.children.length > 0) {
    // Folder project — show child projects as cards
    // Fetch top 3 open tasks per child project (for preview)
    const childIds = project.children.map((c) => c.id);
    const topTaskRows = await prisma.task.findMany({
      where: { projectId: { in: childIds }, status: { not: "done" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, projectId: true },
      take: childIds.length * 3,
    });
    const tasksByProject = new Map<number, { id: number; title: string }[]>();
    for (const t of topTaskRows) {
      if (!t.projectId) continue;
      const arr = tasksByProject.get(t.projectId) ?? [];
      if (arr.length < 3) arr.push({ id: t.id, title: t.title });
      tasksByProject.set(t.projectId, arr);
    }

    cards = project.children.map((child) => ({
      id: child.id,
      type: "project",
      name: child.name,
      emoji: child.emoji,
      color: child.color,
      description: generateDescription(child.name, project.name),
      taskCount: child._count.tasks,
      sectionNames: child.sections.map((s) => s.name),
      topTasks: tasksByProject.get(child.id) ?? [],
    }));
  } else {
    // Leaf project with sections — show sections as cards
    const sectionIds = project.sections.map((s) => s.id);
    const taskRows = await prisma.task.findMany({
      where: {
        projectId,
        sectionId: { in: sectionIds },
        status: { not: "done" },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, sectionId: true },
    });

    const tasksBySection = new Map<number, { id: number; title: string }[]>();
    const countBySection = new Map<number, number>();
    for (const t of taskRows) {
      if (!t.sectionId) continue;
      const arr = tasksBySection.get(t.sectionId) ?? [];
      tasksBySection.set(t.sectionId, [...arr, { id: t.id, title: t.title }]);
      countBySection.set(t.sectionId, (countBySection.get(t.sectionId) ?? 0) + 1);
    }

    cards = project.sections.map((sec) => ({
      id: sec.id,
      type: "section",
      name: sec.name,
      emoji: null,
      color: null,
      description: generateDescription(sec.name, project.name),
      taskCount: countBySection.get(sec.id) ?? 0,
      sectionNames: [],
      topTasks: (tasksBySection.get(sec.id) ?? []).slice(0, 3),
    }));
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      emoji: project.emoji,
      color: project.color,
    },
    cards,
  } satisfies ProjectOverviewData);
}
