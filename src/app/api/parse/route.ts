import { NextRequest, NextResponse } from "next/server";
import { parseTask } from "@/lib/nlp";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const result = parseTask(text);
  return NextResponse.json(result);
}
