const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const typescript = require("typescript");

require.extensions[".ts"] = (loadedModule, fileName) => {
  const source = fs.readFileSync(fileName, "utf8");
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
    },
  });
  loadedModule._compile(compiled.outputText, fileName);
};

const {
  createFiveWhysWorkspace,
  isFiveWhysWorkspaceData,
} = require("../lib/five-whys.ts");
const { attachFiveWhysWorkspace } = require("../lib/history.ts");

const problemBrief = {
  problemStatement: "Project deadlines are being missed.",
  businessContext: "Unknown",
  observableSymptoms: "• Projects are missing deadlines.",
  knownFacts: "• The team has missed project deadlines.",
  possibleCauses: "• Too many approval stages\n• Understaffing",
  stakeholders: "• Project team",
  desiredOutcome: "Identify the causes of delays.",
  importantUnknowns: "• Which cause contributes most?",
  assumptions: "Unknown",
};

test("starts with the confirmed brief and leaves all causal conclusions blank", () => {
  const workspace = createFiveWhysWorkspace(problemBrief);

  assert.equal(workspace.workingProblemStatement, problemBrief.problemStatement);
  assert.deepEqual(workspace.problemBrief, problemBrief);
  assert.equal(workspace.answers.length, 5);
  assert.ok(workspace.answers.every(({ answer, evidence }) => !answer && !evidence));
  assert.equal(workspace.rootCause, "");
  assert.equal(workspace.countermeasure, "");
  assert.equal(workspace.completedAt, "");
  assert.equal(isFiveWhysWorkspaceData(workspace), true);
});

test("preserves every answer and note when a saved workspace is reopened", () => {
  const workspace = createFiveWhysWorkspace(problemBrief);
  workspace.answers[0] = {
    answer: "Orders wait for manager approval.",
    evidence: "Approval queue report, week 38.",
  };
  workspace.answers[2] = { answer: "One approver is shared.", evidence: "" };
  workspace.rootCause = "Shared approver capacity is insufficient.";
  workspace.owner = "Operations manager";
  workspace.completedAt = "2026-09-28T05:00:00.000Z";

  const reopened = createFiveWhysWorkspace(problemBrief, workspace);
  reopened.answers[0].answer = "Edited answer";

  assert.equal(workspace.answers[0].answer, "Orders wait for manager approval.");
  assert.equal(reopened.answers[0].evidence, "Approval queue report, week 38.");
  assert.equal(reopened.answers[2].answer, "One approver is shared.");
  assert.equal(reopened.rootCause, workspace.rootCause);
  assert.equal(reopened.owner, workspace.owner);
});

test("saves the completed workspace on its original confirmed analysis", () => {
  const workspace = createFiveWhysWorkspace(problemBrief);
  workspace.answers[0].answer = "The team waits for approval.";
  workspace.completedAt = "2026-09-28T05:00:00.000Z";
  const entry = {
    problem: problemBrief.problemStatement,
    date: "2026-09-28T04:00:00.000Z",
    recommendations: ["five-whys"],
    problemBrief,
  };

  const saved = attachFiveWhysWorkspace([entry], entry.date, workspace);

  assert.ok(saved);
  assert.deepEqual(saved[0].problemBrief, problemBrief);
  assert.equal(saved[0].fiveWhys, workspace);
  assert.equal(saved[0].fiveWhys.answers[0].answer, "The team waits for approval.");
  assert.equal(attachFiveWhysWorkspace([entry], "missing-date", workspace), null);
});

test("workspace provides editable problem, five answer/evidence steps, and action fields", () => {
  const component = fs.readFileSync(
    path.resolve(__dirname, "../components/five-whys-workspace.tsx"),
    "utf8",
  );

  assert.match(component, /Why \$\{step \+ 1\} of 5/);
  assert.match(component, /setStep\(\(current\) => Math\.max\(0, current - 1\)\)/);
  assert.match(component, /setStep\(\(current\) => Math\.min\(whyPrompts\.length, current \+ 1\)\)/);
  assert.match(component, /value=\{currentAnswer\.answer\}/);
  assert.match(component, /value=\{currentAnswer\.evidence\}/);
  assert.match(component, /value=\{workspace\.workingProblemStatement\}/);
  assert.match(component, /Root cause/);
  assert.match(component, /Countermeasure \/ action/);
  assert.match(component, /Target date/);
  assert.match(component, /does not infer or recommend a root cause/);
});
