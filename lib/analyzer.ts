import { frameworks, type Framework } from "./frameworks";
import type { ProblemBrief } from "./problem-brief";

export type Recommendation = {
  framework: Framework;
  score: number;
  matchReason: string;
};

type ProblemInput = string | ProblemBrief;

function getProblemSections(problem: ProblemInput) {
  if (typeof problem === "string") {
    return [{ text: problem, weight: 3 }];
  }
  return [
    { text: problem.problemStatement, weight: 3 },
    { text: problem.observableSymptoms, weight: 5 },
    { text: problem.possibleCauses, weight: 5 },
    { text: problem.businessContext, weight: 2 },
    { text: problem.knownFacts, weight: 3 },
    { text: problem.stakeholders, weight: 2 },
    { text: problem.desiredOutcome, weight: 3 },
  ].filter(({ text }) => text.toLowerCase() !== "unknown");
}

export function analyzeProblem(problem: ProblemInput): Recommendation[] {
  const sections = getProblemSections(problem);
  const normalized = sections.map(({ text }) => text).join(" ").toLowerCase();
  const ranked = frameworks.map((framework) => {
    const matchedTerms = framework.keywords.filter((keyword) =>
      sections.some(({ text }) => text.toLowerCase().includes(keyword)),
    );
    const score = matchedTerms.reduce(
      (total, keyword) =>
        total +
        sections.reduce(
          (sectionScore, section) =>
            sectionScore + (section.text.toLowerCase().includes(keyword) ? section.weight : 0),
          0,
        ),
      0,
    );
    return { framework, score };
  });
  const relevant = ranked
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.framework.name.localeCompare(right.framework.name))
    .slice(0, 3);
  const selected =
    relevant.length > 0
      ? relevant
      : [
          ...ranked
            .filter(({ framework }) => ["five-whys", "process-mapping", "pdca"].includes(framework.id))
            .map((item) => ({ ...item, score: 1 })),
        ];

  return selected.map(({ framework, score }) => ({
    framework,
    score,
    matchReason: buildMatchReason(framework, normalized),
  }));
}

function buildMatchReason(framework: Framework, normalizedProblem: string) {
  const matchedKeyword = framework.keywords.find((keyword) => normalizedProblem.includes(keyword));
  if (matchedKeyword) {
    const labels: Record<string, string> = {
      "root cause": "getting to the underlying cause",
      "supply chain": "mapping an end-to-end supply challenge",
      inventory: "making inventory decisions more deliberate",
      "running out": "improving item availability and replenishment",
      "run out": "improving item availability and replenishment",
      "out of stock": "improving item availability and replenishment",
      "best-selling": "protecting availability for high-demand products",
      "too long": "locating delays and constraints in the process",
      "taking too long": "locating delays and constraints in the process",
      "order fulfillment": "making order flow, handoffs, and delivery performance clearer",
      fulfillment: "making order flow, handoffs, and delivery performance clearer",
      complaint: "understanding and reducing customer complaints",
      complaints: "understanding and reducing customer complaints",
      bottleneck: "finding what is holding up the flow",
      capacity: "comparing workload with available capacity",
      delay: "understanding where time is being lost",
      defect: "reducing quality issues at their source",
      workflow: "making the work and handoffs visible",
      competitor: "understanding the forces behind competition",
      market: "making sense of market conditions",
      growth: "clarifying strategic choices",
      customer: "connecting process outcomes to customer needs",
      demand: "balancing demand with the resources available",
      stock: "improving how stock is managed",
    };
    return `Your challenge mentions ${matchedKeyword}, so this can help with ${labels[matchedKeyword] ?? framework.description.toLowerCase()}`;
  }
  return `A practical starting point for breaking down “${normalizedProblem.slice(0, 64)}${normalizedProblem.length > 64 ? "…" : ""}”`;
}

export function recommendFrameworks(problem: string): Recommendation[] {
  return analyzeProblem(problem);
}
