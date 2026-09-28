import { isProblemBrief, type ProblemBrief } from "./problem-brief";

export type FiveWhysAnswer = {
  answer: string;
  evidence: string;
};

export type FiveWhysWorkspaceData = {
  problemBrief: ProblemBrief;
  workingProblemStatement: string;
  answers: FiveWhysAnswer[];
  rootCause: string;
  countermeasure: string;
  owner: string;
  targetDate: string;
  completedAt: string;
};

export function createFiveWhysWorkspace(
  problemBrief: ProblemBrief,
  saved?: FiveWhysWorkspaceData,
): FiveWhysWorkspaceData {
  if (saved) {
    return {
      ...saved,
      problemBrief: { ...saved.problemBrief },
      workingProblemStatement: saved.workingProblemStatement,
      answers: saved.answers.map((item) => ({ ...item })),
    };
  }

  return {
    problemBrief: { ...problemBrief },
    workingProblemStatement: problemBrief.problemStatement,
    answers: Array.from({ length: 5 }, () => ({ answer: "", evidence: "" })),
    rootCause: "",
    countermeasure: "",
    owner: "",
    targetDate: "",
    completedAt: "",
  };
}

export function isFiveWhysWorkspaceData(
  value: unknown,
): value is FiveWhysWorkspaceData {
  if (typeof value !== "object" || value === null) return false;
  const workspace = value as Record<string, unknown>;
  return (
    isProblemBrief(workspace.problemBrief) &&
    typeof workspace.workingProblemStatement === "string" &&
    Array.isArray(workspace.answers) &&
    workspace.answers.length === 5 &&
    workspace.answers.every(
      (answer) =>
        typeof answer === "object" &&
        answer !== null &&
        typeof (answer as Record<string, unknown>).answer === "string" &&
        typeof (answer as Record<string, unknown>).evidence === "string",
    ) &&
    typeof workspace.rootCause === "string" &&
    typeof workspace.countermeasure === "string" &&
    typeof workspace.owner === "string" &&
    typeof workspace.targetDate === "string" &&
    typeof workspace.completedAt === "string"
  );
}
