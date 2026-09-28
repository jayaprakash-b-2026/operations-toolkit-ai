import { NextResponse } from "next/server";
import { buildFallbackDiagnostic } from "@/lib/diagnostic";
import { requestOllamaDiagnostic } from "@/lib/diagnostic-provider";
import { isProblemBrief } from "@/lib/problem-brief";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    problemBrief?: unknown;
    rawProblem?: unknown;
    cleanedTranscript?: unknown;
  } | null;
  if (!body || !isProblemBrief(body.problemBrief)) {
    return NextResponse.json({ error: "A valid Problem Brief is required." }, { status: 400 });
  }

  const context = {
    rawProblem: typeof body.rawProblem === "string" ? body.rawProblem : undefined,
    cleanedTranscript: typeof body.cleanedTranscript === "string" ? body.cleanedTranscript : undefined,
  };

  try {
    return NextResponse.json(await requestOllamaDiagnostic(body.problemBrief, context));
  } catch {
    return NextResponse.json(buildFallbackDiagnostic(
      body.problemBrief,
      "Local AI is unavailable. Start Ollama and try again.",
    ), { status: 200 });
  }
}
