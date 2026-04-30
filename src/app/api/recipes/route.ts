import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (tag) where.tags = { has: tag };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, sourceUrl, ingredients, steps, servings, prepMins, tags } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!ingredients?.trim()) return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });

  const recipe = await prisma.recipe.create({
    data: {
      title: title.trim(),
      sourceUrl: sourceUrl || null,
      ingredients: ingredients.trim(),
      steps: steps || null,
      servings: servings ? parseInt(servings, 10) : null,
      prepMins: prepMins ? parseInt(prepMins, 10) : null,
      tags: tags || [],
    },
  });

  return NextResponse.json(recipe, { status: 201 });
}
