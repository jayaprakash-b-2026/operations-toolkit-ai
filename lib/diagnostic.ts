import { analyzeProblem } from "./analyzer";
import type { ProblemBrief } from "./problem-brief";

export type DiagnosticMode = "LOCAL AI" | "DEMO / FALLBACK";
export type DiagnosticPriority = "High" | "Medium" | "Low";
export type DiagnosticConfidence = "High" | "Moderate" | "Low";

export type OperationalContext = {
  problem: string;
  timePeriod: string;
  processInvolved: string;
  potentialContributingAreas: string[];
  stakeholders: string[];
};

export type CausalFactor = {
  title: string;
  description: string;
  priority: DiagnosticPriority;
  confidence: DiagnosticConfidence;
  evidence: string[];
  validationRequired: string[];
};

export type AppliedFramework = {
  name: string;
  reasonSelected: string;
  keyInsight: string;
  relevantFindings: string[];
};

export type EvidenceItem = {
  statement: string;
  status: "SUPPORTED" | "HYPOTHESIS" | "VALIDATION REQUIRED";
  source: string;
  relatedFactor?: string;
};

export type VisualNode = {
  id: string;
  label: string;
  kind: "problem" | "factor" | "contributor" | "outcome" | "validation";
  description?: string;
};

export type VisualRelationship = {
  from: string;
  to: string;
  label: string;
};

export type InvestigationPriority = {
  order: number;
  action: string;
  reason: string;
  whyItMatters?: string;
  evidenceRequired?: string;
};

export type RecommendedAction = {
  action: string;
  reason: string;
  expectedImpact: string;
  evidenceRequired: string;
  owner: string;
};

export type OperationsDiagnostic = {
  mode: DiagnosticMode;
  notice?: string;
  problemBrief: ProblemBrief;
  operationalContext: OperationalContext;
  frameworksApplied: AppliedFramework[];
  causalFactors: CausalFactor[];
  visualNodes: VisualNode[];
  visualRelationships: VisualRelationship[];
  evidenceItems: EvidenceItem[];
  hypotheses: string[];
  validationRequirements: string[];
  investigationPriorities: InvestigationPriority[];
  recommendedActions: RecommendedAction[];
  executiveSummary: string;
};

const unknown = "Unknown";

function bulletValues(value: string) {
  return value
    .split(/\n/)
    .map((item) => item.replace(/^[•*-]\s*/, "").trim())
    .filter((item) => item && item.toLowerCase() !== unknown.toLowerCase());
}

function contextTime(transcript: string) {
  const match = transcript.match(/\b(?:over|during|for)\s+(?:the\s+)?(?:last|past|previous)\s+[^,.!?]+/i);
  return match ? match[0].replace(/^(?:over|during|for)\s+/i, "").trim() : unknown;
}

function factorFromCause(cause: string, problem: string, index: number): CausalFactor {
  const title = cause.replace(/[.!?]+$/, "");
  const normalized = title.toLowerCase();
  const isApproval = normalized.includes("approval");
  const isResponse = normalized.includes("response");
  const evidence = isApproval
    ? ["The Problem Brief mentions approval stages or approval-process complexity."]
    : isResponse
      ? ["The Problem Brief mentions response time as a possible contributor."]
      : ["The Problem Brief identifies this as a possible cause, not an established fact."];
  const validation = isApproval
    ? ["Measure time spent at each approval stage and check for duplicate reviews."]
    : isResponse
      ? ["Compare current response time with historical performance."]
      : [`Compare ${title.toLowerCase()} with complaint categories over the stated period.`];
  return {
    title,
    description: `${title} may be contributing to the stated problem.`,
    priority: index < 2 ? "High" : "Medium",
    confidence: index === 0 ? "Moderate" : "Low",
    evidence,
    validationRequired: validation,
  };
}

export function buildFallbackDiagnostic(problemBrief: ProblemBrief, notice?: string): OperationsDiagnostic {
  const causes = bulletValues(problemBrief.possibleCauses);
  const problem = problemBrief.problemStatement === unknown
    ? "the stated operational issue"
    : problemBrief.problemStatement.replace(/[.!?]+$/, "");
  const factors = (causes.length ? causes : ["Process or capacity constraint"]).map((cause, index) =>
    factorFromCause(cause, problem, index),
  );
  const recommendations = analyzeProblem(problemBrief);
  const frameworksApplied = recommendations.slice(0, 5).map(({ framework, matchReason }) => ({
    name: framework.name,
    reasonSelected: matchReason,
    keyInsight: framework.description,
    relevantFindings: framework.steps.slice(0, 2).map((step) => step.replaceAll("{{problem}}", problem)),
  }));
  const nodes: VisualNode[] = [
    { id: "problem", label: problemBrief.problemStatement, kind: "problem", description: "Confirmed problem statement" },
    ...factors.map((factor, index) => ({ id: `factor-${index}`, label: factor.title, kind: "factor" as const })),
    { id: "outcome", label: "Operational impact", kind: "outcome", description: "Observed or stated impact" },
  ];
  const relationships = [
    ...factors.map((factor, index) => ({ from: `factor-${index}`, to: "problem", label: "may contribute to" })),
    { from: "problem", to: "outcome", label: "creates" },
  ];
  const validationRequirements = factors.flatMap((factor) => factor.validationRequired);
  const investigationPriorities = factors.slice(0, 5).map((factor, index) => ({
    order: index + 1,
    action: `Investigate ${factor.title.toLowerCase()}.`,
    reason: factor.validationRequired[0],
    whyItMatters: "This helps determine whether the suspected factor materially contributes to the stated problem.",
    evidenceRequired: factor.validationRequired[0],
  }));
  const evidenceItems: EvidenceItem[] = [
    { statement: problemBrief.problemStatement, status: "SUPPORTED", source: "user" },
    ...factors.map((factor) => ({ statement: factor.description, status: "HYPOTHESIS" as const, source: "ai_inference", relatedFactor: factor.title })),
    ...validationRequirements.map((statement) => ({ statement, status: "VALIDATION REQUIRED" as const, source: "required_data" })),
  ];
  return {
    mode: "DEMO / FALLBACK",
    ...(notice ? { notice } : {}),
    problemBrief,
    operationalContext: {
      problem: problemBrief.problemStatement,
      timePeriod: contextTime(`${problemBrief.businessContext} ${problemBrief.knownFacts}`),
      processInvolved: problemBrief.businessContext === unknown ? unknown : problemBrief.businessContext,
      potentialContributingAreas: causes.length ? causes : [unknown],
      stakeholders: bulletValues(problemBrief.stakeholders),
    },
    frameworksApplied,
    causalFactors: factors,
    visualNodes: nodes,
    visualRelationships: relationships,
    evidenceItems,
    hypotheses: factors.map((factor) => factor.description),
    validationRequirements,
    investigationPriorities,
    recommendedActions: factors.slice(0, 3).map((factor) => ({
      action: factor.validationRequired[0],
      reason: `Test whether ${factor.title.toLowerCase()} is contributing before changing the process.`,
      expectedImpact: "A clearer view of where improvement effort will matter.",
      evidenceRequired: factor.validationRequired[0],
      owner: "To be assigned",
    })),
    executiveSummary: `Based on the information provided, ${factors.map((factor) => factor.title.toLowerCase()).join(" and ")} ${factors.length === 1 ? "is a priority area" : "are priority areas"} to investigate. These are hypotheses, not confirmed root causes. Start with the highest-priority validation step and use the evidence to decide what to change.`,
  };
}

export function isOperationsDiagnostic(value: unknown): value is OperationsDiagnostic {
  if (typeof value !== "object" || value === null) return false;
  const diagnostic = value as Record<string, unknown>;
  const isStringArray = (items: unknown) => Array.isArray(items) && items.every((item) => typeof item === "string");
  const isBrief = (brief: unknown) =>
    typeof brief === "object" &&
    brief !== null &&
    ["problemStatement", "businessContext", "observableSymptoms", "knownFacts", "possibleCauses", "stakeholders", "desiredOutcome", "importantUnknowns", "assumptions"]
      .every((key) => typeof (brief as Record<string, unknown>)[key] === "string");
  const isFactor = (factor: unknown) => {
    if (typeof factor !== "object" || factor === null) return false;
    const item = factor as Record<string, unknown>;
    return typeof item.title === "string" && typeof item.description === "string"
      && ["High", "Medium", "Low"].includes(String(item.priority))
      && ["High", "Moderate", "Low"].includes(String(item.confidence))
      && isStringArray(item.evidence) && isStringArray(item.validationRequired);
  };
  const isFramework = (framework: unknown) => {
    if (typeof framework !== "object" || framework === null) return false;
    const item = framework as Record<string, unknown>;
    return typeof item.name === "string" && typeof item.reasonSelected === "string"
      && typeof item.keyInsight === "string" && isStringArray(item.relevantFindings);
  };
  const isEvidence = (item: unknown) => {
    if (typeof item !== "object" || item === null) return false;
    const evidence = item as Record<string, unknown>;
    return typeof evidence.statement === "string"
      && ["SUPPORTED", "HYPOTHESIS", "VALIDATION REQUIRED"].includes(String(evidence.status))
      && typeof evidence.source === "string";
  };
  return (
    (diagnostic.mode === "LOCAL AI" || diagnostic.mode === "DEMO / FALLBACK") &&
    isBrief(diagnostic.problemBrief) &&
    typeof diagnostic.operationalContext === "object" &&
    diagnostic.operationalContext !== null &&
    isStringArray((diagnostic.operationalContext as Record<string, unknown>).potentialContributingAreas) &&
    isStringArray((diagnostic.operationalContext as Record<string, unknown>).stakeholders) &&
    Array.isArray(diagnostic.frameworksApplied) &&
    diagnostic.frameworksApplied.every(isFramework) &&
    Array.isArray(diagnostic.causalFactors) &&
    diagnostic.causalFactors.every(isFactor) &&
    Array.isArray(diagnostic.visualNodes) &&
    diagnostic.visualNodes.every((node) => typeof node === "object" && node !== null && typeof (node as Record<string, unknown>).id === "string" && typeof (node as Record<string, unknown>).label === "string") &&
    Array.isArray(diagnostic.visualRelationships) &&
    diagnostic.visualRelationships.every((relationship) => typeof relationship === "object" && relationship !== null && typeof (relationship as Record<string, unknown>).from === "string" && typeof (relationship as Record<string, unknown>).to === "string" && typeof (relationship as Record<string, unknown>).label === "string") &&
    Array.isArray(diagnostic.evidenceItems) &&
    diagnostic.evidenceItems.every(isEvidence) &&
    Array.isArray(diagnostic.hypotheses) &&
    isStringArray(diagnostic.hypotheses) &&
    Array.isArray(diagnostic.validationRequirements) &&
    isStringArray(diagnostic.validationRequirements) &&
    Array.isArray(diagnostic.investigationPriorities) &&
    diagnostic.investigationPriorities.every((item) => typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).order === "number" && typeof (item as Record<string, unknown>).action === "string" && typeof (item as Record<string, unknown>).reason === "string") &&
    Array.isArray(diagnostic.recommendedActions) &&
    diagnostic.recommendedActions.every((item) => typeof item === "object" && item !== null && ["action", "reason", "expectedImpact", "evidenceRequired", "owner"].every((key) => typeof (item as Record<string, unknown>)[key] === "string")) &&
    typeof diagnostic.executiveSummary === "string"
  );
}
