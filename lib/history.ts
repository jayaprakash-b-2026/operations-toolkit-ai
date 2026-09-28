import { isProblemBrief, type ProblemBrief } from "./problem-brief";
import {
  isFiveWhysWorkspaceData,
  type FiveWhysWorkspaceData,
} from "./five-whys";
import { isOperationsDiagnostic, type OperationsDiagnostic } from "./diagnostic";

export type AnalysisHistoryEntry = {
  problem: string;
  date: string;
  recommendations: string[];
  problemBrief?: ProblemBrief;
  fiveWhys?: FiveWhysWorkspaceData;
  diagnostic?: OperationsDiagnostic;
};

export interface HistoryRepository {
  load(): Promise<AnalysisHistoryEntry[]>;
  save(entries: AnalysisHistoryEntry[]): Promise<void>;
}

const storageKey = "operations-toolkit-history";

function isHistoryEntry(value: unknown): value is AnalysisHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.problem === "string" &&
    typeof entry.date === "string" &&
    Array.isArray(entry.recommendations) &&
    entry.recommendations.every((id) => typeof id === "string") &&
    (entry.problemBrief === undefined || isProblemBrief(entry.problemBrief)) &&
    (entry.fiveWhys === undefined || isFiveWhysWorkspaceData(entry.fiveWhys))
    && (entry.diagnostic === undefined || isOperationsDiagnostic(entry.diagnostic))
  );
}

export function attachFiveWhysWorkspace(
  entries: AnalysisHistoryEntry[],
  analysisDate: string,
  workspace: FiveWhysWorkspaceData,
): AnalysisHistoryEntry[] | null {
  let matched = false;
  const updated = entries.map((entry) => {
    if (
      !matched &&
      entry.date === analysisDate &&
      entry.problem === workspace.problemBrief.problemStatement
    ) {
      matched = true;
      return {
        ...entry,
        problemBrief: { ...workspace.problemBrief },
        fiveWhys: workspace,
      };
    }
    return entry;
  });
  return matched ? updated : null;
}

export const browserHistoryRepository: HistoryRepository = {
  async load() {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isHistoryEntry)) {
      throw new Error("Saved analysis history has an invalid format.");
    }
    return parsed;
  },
  async save(entries) {
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  },
};
