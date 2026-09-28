const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const typescript = require("typescript");

require.extensions[".ts"] = (loadedModule, fileName) => {
  const source = fs.readFileSync(fileName, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
  });
  loadedModule._compile(compiled.outputText, fileName);
};

const { buildFallbackDiagnostic } = require("../lib/diagnostic.ts");
const {
  buildOllamaPrompt,
  buildRepairPrompt,
  parseOllamaDiagnostic,
  requestOllamaDiagnostic,
  DEFAULT_OLLAMA_MODEL,
} = require("../lib/diagnostic-provider.ts");

const brief = {
  problemStatement: "Invoice processing delays have increased.",
  businessContext: "Finance operations process supplier invoices.",
  observableSymptoms: "• Average processing time increased from 2 days to nearly 5 days.",
  knownFacts: "• Payment delays and vendor follow-ups have increased.",
  possibleCauses: "• Incomplete invoice information\n• Multiple approval stages\n• Manual data entry",
  stakeholders: "• Finance operations\n• Vendors\n• Business teams",
  desiredOutcome: "Identify the main bottlenecks and improve processing.",
  importantUnknowns: "• Which factor contributes most?",
  assumptions: "Unknown",
};

function diagnosticJson() {
  return JSON.stringify({
    problem: brief.problemStatement,
    context: { timePeriod: "three months", processInvolved: "Invoice processing", stakeholders: ["Finance operations", "Vendors"] },
    evidenceStatus: [{ statement: "Processing time increased.", status: "SUPPORTED", source: "user" }],
    frameworksApplied: [{ name: "Bottleneck Analysis", reasonSelected: "Find the limiting stage.", keyInsight: "Stage timing is needed.", relevantFindings: ["Measure each stage."] }, { name: "Process Mapping", reasonSelected: "Expose handoffs.", keyInsight: "Map invoice flow.", relevantFindings: ["Map approval waits."] }],
    causalFactors: [
      { title: "Incomplete information", description: "Missing fields may create rework.", priority: "High", confidence: "Moderate", evidence: ["User mentioned incomplete information."], validationRequired: ["Count rejected invoices."] },
      { title: "Approval waits", description: "Multiple approvals may add queue time.", priority: "High", confidence: "Low", evidence: ["User mentioned approval stages."], validationRequired: ["Measure approval wait time."] },
      { title: "Manual entry", description: "Manual work may slow throughput.", priority: "Medium", confidence: "Low", evidence: ["User mentioned manual entry."], validationRequired: ["Measure entry time."] },
    ],
    investigationPriorities: [
      { order: 1, action: "Measure stage time.", reason: "Locate delay.", whyItMatters: "Find bottleneck.", evidenceRequired: "Stage timestamps." },
      { order: 2, action: "Count rework.", reason: "Test data quality.", whyItMatters: "Quantify rework.", evidenceRequired: "Rejection data." },
    ],
    recommendedActions: [
      { action: "Map invoice flow.", reason: "Expose waits.", expectedImpact: "Clearer focus.", evidenceRequired: "Process timestamps.", owner: "To be assigned" },
      { action: "Review approvals.", reason: "Test queue time.", expectedImpact: "Reduce waiting.", evidenceRequired: "Approval logs.", owner: "To be assigned" },
    ],
    executiveSummary: "Invoice delays are confirmed; the dominant contributor remains unproven. Measure stage time first.",
  });
}

test("fallback remains clearly separate from local AI", () => {
  assert.equal(buildFallbackDiagnostic(brief).mode, "DEMO / FALLBACK");
});

test("Ollama request uses local chat API, model, JSON mode, and full context", async () => {
  let calledUrl = "";
  let calledBody;
  const response = {
    ok: true,
    json: async () => ({ message: { content: diagnosticJson() } }),
  };
  const result = await requestOllamaDiagnostic(brief, {
    rawProblem: "Raw invoice problem",
    cleanedTranscript: "Edited invoice problem",
  }, {
    fetchImpl: async (url, init) => {
      calledUrl = url;
      calledBody = JSON.parse(init.body);
      return response;
    },
    baseUrl: "http://localhost:11434",
  });

  assert.equal(result.mode, "LOCAL AI");
  assert.equal(calledUrl, "http://localhost:11434/api/chat");
  assert.equal(calledBody.model, DEFAULT_OLLAMA_MODEL);
  assert.equal(calledBody.format.type, "object");
  assert.ok(calledBody.format.properties.causalFactors);
  assert.equal(calledBody.stream, false);
  assert.equal(calledBody.think, false);
  assert.equal(calledBody.options.num_predict, 350);
  assert.equal(calledBody.options.temperature, 0.2);
  assert.match(calledBody.messages[1].content, /Edited invoice problem/);
  assert.match(calledBody.messages[1].content, /FRAMEWORKS/);
});

test("invalid Ollama JSON is rejected and repair prompts remain JSON-only", () => {
  assert.throws(() => parseOllamaDiagnostic("not json", brief));
  assert.match(buildRepairPrompt("not json"), /corrected JSON only/);
});

test("route no longer contains cloud OpenAI configuration", () => {
  const route = fs.readFileSync(path.resolve(__dirname, "../app/api/diagnostic/route.ts"), "utf8");
  assert.doesNotMatch(route, /OPENAI/);
  assert.match(route, /requestOllamaDiagnostic/);
});
