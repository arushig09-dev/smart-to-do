import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/requireUser";

const STOP_WORDS = new Set([
  "the", "and", "but", "not", "for", "are", "was", "its", "you", "can",
  "all", "had", "one", "any", "this", "that", "with", "from", "have",
  "will", "she", "his", "her", "our", "out", "who", "get", "use", "new",
  "add", "via", "per", "etc", "put", "week", "next", "last", "soon",
  "today", "date", "time", "now", "ago", "set", "due",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { title, suggestedProjId, suggestedSectId, chosenProjId, chosenSectId } = body;

  if (!title || !chosenProjId) return NextResponse.json({ ok: false }, { status: 400 });

  const tokens = tokenize(title);
  if (tokens.length === 0) return NextResponse.json({ ok: true });

  await prisma.categoryCorrection.create({
    data: {
      userId,
      titleTokens: JSON.stringify(tokens),
      suggestedProjId: suggestedProjId ?? null,
      suggestedSectId: suggestedSectId ?? null,
      chosenProjId,
      chosenSectId: chosenSectId ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
