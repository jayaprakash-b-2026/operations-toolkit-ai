import { frameworks } from "./frameworks";
import { isOperationsDiagnostic, type OperationsDiagnostic } from "./diagnostic";
import type { ProblemBrief } from "./problem-brief";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen3.5:4b";

type DiagnosticContext = { rawProblem?: string; cleanedTranscript?: string };
type OllamaResponse = { message?: { content?: unknown } };

function frameworkCatalog() {
  return frameworks.map(({ name, category, description }) => ({
    name,
    category,
    purpose: description.slice(0, 35),
  }));
}

export const diagnosticJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["problem", "context", "evidenceStatus", "frameworksApplied", "causalFactors", "investigationPriorities", "recommendedActions", "executiveSummary"],
  properties: {
    problem: { type: "string", maxLength: 180 },
    context: {
      type: "object", additionalProperties: false, required: ["timePeriod", "processInvolved"],
      properties: {
        timePeriod: { type: "string", maxLength: 80 },
        processInvolved: { type: "string", maxLength: 100 },
        stakeholders: { type: "array", maxItems: 3, items: { type: "string", maxLength: 40 } },
      },
    },
    evidenceStatus: {
      type: "array", maxItems: 6,
      items: {
        type: "object", additionalProperties: false, required: ["statement", "status", "source"],
        properties: {
          statement: { type: "string", maxLength: 140 },
          status: { type: "string", enum: ["SUPPORTED", "HYPOTHESIS", "VALIDATION REQUIRED"] },
          source: { type: "string", enum: ["user", "ai_inference", "required_data"] },
        },
      },
    },
    frameworksApplied: {
      type: "array", minItems: 1, maxItems: 3,
      items: {
        type: "object", additionalProperties: false, required: ["name", "reasonSelected", "keyInsight"],
        properties: {
          name: { type: "string", maxLength: 50 }, reasonSelected: { type: "string", maxLength: 100 },
          keyInsight: { type: "string", maxLength: 120 },
          relevantFindings: { type: "array", maxItems: 1, items: { type: "string", maxLength: 70 } },
        },
      },
    },
    causalFactors: {
      type: "array", minItems: 1, maxItems: 4,
      items: {
        type: "object", additionalProperties: false, required: ["title", "description", "priority", "confidence"],
        properties: {
          title: { type: "string", maxLength: 50 }, description: { type: "string", maxLength: 120 },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
          confidence: { type: "string", enum: ["High", "Moderate", "Low"] },
          evidence: { type: "array", maxItems: 1, items: { type: "string", maxLength: 70 } },
          validationRequired: { type: "array", maxItems: 1, items: { type: "string", maxLength: 70 } },
        },
      },
    },
    investigationPriorities: {
      type: "array", minItems: 1, maxItems: 3,
      items: {
        type: "object", additionalProperties: false, required: ["order", "action", "reason", "whyItMatters", "evidenceRequired"],
        properties: {
          order: { type: "number" }, action: { type: "string", maxLength: 100 },
          reason: { type: "string", maxLength: 100 }, whyItMatters: { type: "string", maxLength: 100 },
          evidenceRequired: { type: "string", maxLength: 100 },
        },
      },
    },
    recommendedActions: {
      type: "array", minItems: 1, maxItems: 3,
      items: {
        type: "object", additionalProperties: false, required: ["action", "reason", "expectedImpact", "evidenceRequired", "owner"],
        properties: {
          action: { type: "string", maxLength: 100 }, reason: { type: "string", maxLength: 100 },
          expectedImpact: { type: "string", maxLength: 100 }, evidenceRequired: { type: "string", maxLength: 100 },
          owner: { type: "string", maxLength: 50 },
        },
      },
    },
    executiveSummary: { type: "string", maxLength: 240 },
  },
} as const;

export function buildOllamaPrompt(brief: ProblemBrief, context: DiagnosticContext) {
  const problem = (context.cleanedTranscript || context.rawProblem || brief.problemStatement).slice(0, 700);
  const short = (value: string) => value.slice(0, 180);
  const briefContext = {
    symptoms: short(brief.observableSymptoms),
    facts: short(brief.knownFacts),
    suspectedCauses: short(brief.possibleCauses),
    stakeholders: short(brief.stakeholders),
    outcome: short(brief.desiredOutcome),
    unknowns: short(brief.importantUnknowns),
  };
  return `Act as an operations consultant. Analyze; do not restate. Return only concise JSON.
SUPPORTED is user-stated. HYPOTHESIS is inferred. VALIDATION REQUIRED needs data. Never invent facts, causes, numbers, owners, or conclusions. Select 2-3 relevant frameworks. Keep every explanation under 10 words. Do not duplicate claims.
PROBLEM: ${problem}
BRIEF: ${JSON.stringify(briefContext)}
FRAMEWORKS: ${JSON.stringify(frameworkCatalog())}`;
}

export function buildRepairPrompt(invalidJson: string) {
  return `Return corrected JSON only. Match this schema exactly:
${JSON.stringify(diagnosticJsonSchema)}
INVALID JSON:
${invalidJson.slice(0, 10000)}`;
}

function extractJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Ollama returned no JSON object.");
  return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
}

function expandCompactDiagnostic(compact: Record<string, unknown>, brief: ProblemBrief): OperationsDiagnostic {
  const context = compact.context as { timePeriod?: string; processInvolved?: string; stakeholders?: string[] };
  const factors = (compact.causalFactors ?? []) as OperationsDiagnostic["causalFactors"];
  const frameworksApplied = (compact.frameworksApplied as Array<Record<string, unknown>> ?? []).map((item) => ({
    ...(item as OperationsDiagnostic["frameworksApplied"][number]),
    relevantFindings: (item as OperationsDiagnostic["frameworksApplied"][number]).relevantFindings ?? [],
  }));
  const evidenceItems = (compact.evidenceStatus ?? []) as OperationsDiagnostic["evidenceItems"];
  const nodes = [
    { id: "problem", label: String(compact.problem), kind: "problem" as const, description: "Confirmed problem" },
    ...factors.map((factor, index) => ({ id: `factor-${index}`, label: factor.title, kind: "factor" as const, description: factor.description })),
    { id: "outcome", label: "Operational impact", kind: "outcome" as const, description: "Observed impact" },
  ];
  return {
    mode: "LOCAL AI",
    problemBrief: brief,
    operationalContext: {
      problem: String(compact.problem),
      timePeriod: context.timePeriod ?? "Unknown",
      processInvolved: context.processInvolved ?? "Unknown",
      potentialContributingAreas: factors.map((factor) => factor.title),
      stakeholders: context.stakeholders ?? brief.stakeholders.split(",").map((item) => item.trim()).filter(Boolean),
    },
    frameworksApplied,
    causalFactors: factors,
    visualNodes: nodes,
    visualRelationships: [
      ...factors.map((_, index) => ({ from: `factor-${index}`, to: "problem", label: "may contribute to" })),
      { from: "problem", to: "outcome", label: "leads to" },
    ],
    evidenceItems,
    hypotheses: factors.map((factor) => factor.description),
    validationRequirements: factors.flatMap((factor) => factor.validationRequired ?? []),
    investigationPriorities: (compact.investigationPriorities ?? []) as OperationsDiagnostic["investigationPriorities"],
    recommendedActions: (compact.recommendedActions ?? []) as OperationsDiagnostic["recommendedActions"],
    executiveSummary: String(compact.executiveSummary),
  };
}

export function parseOllamaDiagnostic(content: string, problemBrief: ProblemBrief): OperationsDiagnostic {
  const diagnostic = expandCompactDiagnostic(extractJson(content), problemBrief);
  if (!isOperationsDiagnostic(diagnostic)) throw new Error("Ollama returned an invalid diagnostic shape.");
  return diagnostic;
}

export async function requestOllamaDiagnostic(
  brief: ProblemBrief,
  context: DiagnosticContext,
  options: { fetchImpl?: typeof fetch; baseUrl?: string; model?: string; repair?: boolean; invalidContent?: string } = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
  const model = options.model ?? process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL;
  const call = async (content: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model, stream: false, think: false, format: diagnosticJsonSchema,
          messages: [
            { role: "system", content: "Return only concise diagnostic JSON. Never reveal thinking." },
            { role: "user", content },
          ],
          options: { temperature: 0.2, num_ctx: 1536, num_predict: 350 },
        }),
      });
      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
      const payload = await response.json() as OllamaResponse;
      if (typeof payload.message?.content !== "string") throw new Error("Ollama returned no message content.");
      return payload.message.content;
    } finally {
      clearTimeout(timeout);
    }
  };
  const content = await call(options.repair && options.invalidContent ? buildRepairPrompt(options.invalidContent) : buildOllamaPrompt(brief, context));
  try {
    return parseOllamaDiagnostic(content, brief);
  } catch (error) {
    if (options.repair) throw error;
    const repaired = await call(buildRepairPrompt(content));
    return parseOllamaDiagnostic(repaired, brief);
  }
}
