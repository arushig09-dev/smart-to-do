import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl || null;
  if (body.ingredients !== undefined) data.ingredients = body.ingredients;
  if (body.steps !== undefined) data.steps = body.steps || null;
  if (body.servings !== undefined) data.servings = body.servings ? parseInt(body.servings, 10) : null;
  if (body.prepMins !== undefined) data.prepMins = body.prepMins ? parseInt(body.prepMins, 10) : null;
  if (body.tags !== undefined) data.tags = body.tags;

  const recipe = await prisma.recipe.update({ where: { id: recipeId }, data });
  return NextResponse.json(recipe);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recipeId = parseInt(id, 10);
  if (isNaN(recipeId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.recipe.delete({ where: { id: recipeId } });
  return NextResponse.json({ ok: true });
}
