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

const { transcribeAndClean } = require("../lib/voice-transcript-pipeline.ts");

test("preserves the model transcript and cleans a separate editable value", async () => {
  const audio = new Blob(["locally captured audio"]);
  const modelTranscript =
    "Um, I think customer complaints increased over three months, but I'm not sure whether response time or product quality is the cause.";
  const result = await transcribeAndClean(audio, async (receivedAudio) => {
    assert.equal(receivedAudio, audio);
    return modelTranscript;
  });

  assert.equal(result.rawTranscript, modelTranscript);
  assert.notEqual(result.cleanedTranscript, result.rawTranscript);
  assert.match(result.cleanedTranscript, /I think/);
  assert.match(result.cleanedTranscript, /not sure whether/);
  assert.match(result.cleanedTranscript, /response time or product quality/);
});

test("uses an injected recognizer result as the cleanup input", async () => {
  let recognizerCalls = 0;
  const rawTranscript = "Um, the the team missed deadlines.";
  const result = await transcribeAndClean(new Blob(["recording"]), async () => {
    recognizerCalls += 1;
    return rawTranscript;
  });

  assert.equal(recognizerCalls, 1);
  assert.equal(result.rawTranscript, rawTranscript);
  assert.equal(result.cleanedTranscript, "The team missed deadlines.");
});

test("manual edits remain the authoritative Problem Brief input", () => {
  const component = fs.readFileSync(
    path.resolve(__dirname, "../components/think-aloud.tsx"),
    "utf8",
  );
  assert.match(component, /problemBriefService\.structure\(cleanedTranscript\.trim\(\)\)/);
  assert.doesNotMatch(component, /problemBriefService\.structure\(rawTranscript/);
  assert.match(
    component,
    /value=\{cleanedTranscript\} onChange=\{\(event\) => setCleanedTranscript\(event\.target\.value\)\}/,
  );
});

test("local Whisper disables remote model access and uses chunked transcription", () => {
  const service = fs.readFileSync(
    path.resolve(__dirname, "../lib/transcription-service.ts"),
    "utf8",
  );

  assert.match(service, /env\.allowRemoteModels = false/);
  assert.match(service, /env\.localModelPath = "\/models\/"/);
  assert.match(service, /modelAssetUrl\("config\.json"\)/);
  assert.match(service, /chunk_length_s: CHUNK_LENGTH_SECONDS/);
  assert.match(service, /stride_length_s: STRIDE_LENGTH_SECONDS/);
  assert.match(service, /language: "english"/);
  assert.match(service, /task: "transcribe"/);
});
