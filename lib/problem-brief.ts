export type ProblemBrief = {
  problemStatement: string;
  businessContext: string;
  observableSymptoms: string;
  knownFacts: string;
  possibleCauses: string;
  stakeholders: string;
  desiredOutcome: string;
  importantUnknowns: string;
  assumptions: string;
};

export type ProblemBriefFieldKind = "FACT" | "POSSIBLE CAUSE" | "USER INTENT" | "UNKNOWN" | "ASSUMPTION";

export const problemBriefFields: Array<{ key: keyof ProblemBrief; label: string; kind: ProblemBriefFieldKind }> = [
  { key: "problemStatement", label: "Problem Statement", kind: "FACT" },
  { key: "businessContext", label: "Business Context", kind: "FACT" },
  { key: "observableSymptoms", label: "Observable Symptoms", kind: "FACT" },
  { key: "knownFacts", label: "Known Facts", kind: "FACT" },
  { key: "possibleCauses", label: "Possible Causes Mentioned", kind: "POSSIBLE CAUSE" },
  { key: "stakeholders", label: "Stakeholders", kind: "FACT" },
  { key: "desiredOutcome", label: "Desired Outcome", kind: "USER INTENT" },
  { key: "importantUnknowns", label: "Important Unknowns", kind: "UNKNOWN" },
  { key: "assumptions", label: "Assumptions", kind: "ASSUMPTION" },
];

export function isProblemBrief(value: unknown): value is ProblemBrief {
  if (typeof value !== "object" || value === null) return false;
  const brief = value as Record<string, unknown>;
  return problemBriefFields.every(({ key }) => typeof brief[key] === "string");
}

export function problemBriefText(brief: ProblemBrief) {
  return problemBriefFields
    .filter(({ key }) => key !== "assumptions")
    .map(({ key, label }) => `${label}: ${brief[key]}`)
    .join("\n");
}
