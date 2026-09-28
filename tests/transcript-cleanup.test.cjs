const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const typescript = require("typescript");

const servicePath = path.resolve(__dirname, "../lib/transcript-cleanup.ts");
const serviceModule = new Module(servicePath, module);
serviceModule.filename = servicePath;
serviceModule.paths = module.paths;
serviceModule._compile(
  typescript.transpileModule(fs.readFileSync(servicePath, "utf8"), {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020,
    },
  }).outputText,
  servicePath,
);

const { transcriptCleanupService } = serviceModule.exports;

test("removes discourse fillers but retains uncertainty", () => {
  const raw =
    "Um, basically, our customer complaints have, you know, increased a lot over the last three months. I mean, I'm not really sure whether it's because of response time or maybe product quality.";

  assert.equal(
    transcriptCleanupService.clean(raw),
    "Our customer complaints have increased a lot over the last 3 months. I'm not really sure whether it's because of response time or maybe product quality.",
  );
});

test("removes obvious duplicated words and phrases", () => {
  assert.equal(
    transcriptCleanupService.clean("The the delivery delivery team team missed missed the the deadlines deadlines."),
    "The delivery team missed the deadlines.",
  );
  assert.equal(
    transcriptCleanupService.clean("We discussed the approval process, the approval process, yesterday."),
    "We discussed the approval process, yesterday.",
  );
});

test("repairs clear speech-recognition grammar errors", () => {
  assert.equal(
    transcriptCleanupService.clean(
      "So I'm customers complaint have increased a lot in the last you know 3 months and no I will not know whom to actually blame.",
    ),
    "Our customer complaints have increased a lot in the last 3 months. I'm not sure what to blame.",
  );
});

test("preserves uncertain statements as uncertain", () => {
  const cleaned = transcriptCleanupService.clean(
    "I think the approval process might be causing delays, but I'm not completely sure.",
  );

  assert.equal(cleaned, "I think the approval process might be causing delays, but I'm not completely sure.");
  assert.match(cleaned, /\bI think\b/);
  assert.match(cleaned, /\bmight be\b/);
  assert.match(cleaned, /\bnot completely sure\b/);
});

test("keeps competing possible causes attributed to their speakers", () => {
  const cleaned = transcriptCleanupService.clean(
    "Some managers believe it's the approval process, while others think we're understaffed.",
  );

  assert.equal(
    cleaned,
    "Some managers believe it's the approval process, while others think we're understaffed.",
  );
});

test("formats clear spoken numbers and preserves explicit dates", () => {
  assert.equal(
    transcriptCleanupService.clean(
      "We spent fifty lakh rupees over twenty-five days in September 2026.",
    ),
    "We spent 50 lakh rupees over 25 days in September 2026.",
  );
  assert.equal(
    transcriptCleanupService.clean("We processed one hundred twenty-five orders."),
    "We processed 125 orders.",
  );
  assert.equal(
    transcriptCleanupService.clean("The review is on September twenty eighth, 2026."),
    "The review is on September twenty eighth, 2026.",
  );
});

test("leaves an already-clear transcript unchanged", () => {
  const transcript =
    "Customer complaints have increased significantly. Some managers think response time is a factor, while others think product quality may have changed.";

  assert.equal(transcriptCleanupService.clean(transcript), transcript);
});

test("keeps raw text separate and builds the brief from the editable transcript", () => {
  const component = fs.readFileSync(
    path.resolve(__dirname, "../components/think-aloud.tsx"),
    "utf8",
  );

  assert.match(component, /setRawTranscript\(recognizedTranscript\)/);
  assert.match(component, /View raw transcript[\s\S]*?\{rawTranscript\}/);
  assert.match(
    component,
    /value=\{cleanedTranscript\} onChange=\{\(event\) => setCleanedTranscript\(event\.target\.value\)\}/,
  );
  assert.match(component, /problemBriefService\.structure\(cleanedTranscript\.trim\(\)\)/);
});
