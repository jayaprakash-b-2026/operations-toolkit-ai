import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

const MODEL_ID = "onnx-community/whisper-small";
const SAMPLE_RATE = 16_000;
const CHUNK_LENGTH_SECONDS = 30;
const STRIDE_LENGTH_SECONDS = 5;

type LocalWhisper = AutomaticSpeechRecognitionPipeline;

let whisperPromise: Promise<LocalWhisper> | undefined;

function modelAssetUrl(fileName: string) {
  return new URL(
    `${MODEL_ID}/${fileName}`,
    new URL("/models/", window.location.origin),
  );
}

export class TranscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscriptionError";
  }
}

export class LocalSpeechModelUnavailableError extends TranscriptionError {
  constructor() {
    super(
      "The local Whisper model is not installed. Follow the Think aloud setup instructions in README.md, then restart the app.",
    );
    this.name = "LocalSpeechModelUnavailableError";
  }
}

async function createWhisper(device: "webgpu" | "wasm"): Promise<LocalWhisper> {
  const runtimeUrl = new URL("/vendor/transformers.min.js", window.location.origin).href;
  const { env, pipeline } = (await import(
    /* webpackIgnore: true */ runtimeUrl
  )) as typeof import("@huggingface/transformers");
  env.allowLocalModels = true;
  env.allowRemoteModels = false;
  env.localModelPath = "/models/";
  env.useBrowserCache = true;
  env.useWasmCache = true;
  env.backends.onnx.wasm!.wasmPaths = {
    mjs: "/ort/ort-wasm-simd-threaded.asyncify.mjs",
    wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm",
  };

  return pipeline("automatic-speech-recognition", MODEL_ID, {
    device,
    dtype: { encoder_model: "q4", decoder_model_merged: "q4" },
    local_files_only: true,
  });
}

async function loadWhisper(): Promise<LocalWhisper> {
  if (whisperPromise) return whisperPromise;

  whisperPromise = (async () => {
    const configResponse = await fetch(modelAssetUrl("config.json"), {
      cache: "no-store",
    });
    if (!configResponse.ok) throw new LocalSpeechModelUnavailableError();

    try {
      return await createWhisper("webgpu");
    } catch (webGpuError) {
      try {
        return await createWhisper("wasm");
      } catch (wasmError) {
        throw new TranscriptionError(
          `Local Whisper could not initialize on WebGPU or WebAssembly. ${wasmError instanceof Error ? wasmError.message : webGpuError instanceof Error ? webGpuError.message : "Check browser compatibility and available memory."}`,
        );
      }
    }
  })();

  try {
    return await whisperPromise;
  } catch (error) {
    whisperPromise = undefined;
    throw error;
  }
}

function downsampleToMono(audioBuffer: AudioBuffer): Float32Array {
  const outputLength = Math.ceil(
    (audioBuffer.length * SAMPLE_RATE) / audioBuffer.sampleRate,
  );
  const output = new Float32Array(outputLength);
  const channels = Array.from(
    { length: audioBuffer.numberOfChannels },
    (_, channel) => audioBuffer.getChannelData(channel),
  );
  const sourceStep = audioBuffer.sampleRate / SAMPLE_RATE;

  for (let index = 0; index < outputLength; index += 1) {
    const sourcePosition = index * sourceStep;
    const leftIndex = Math.floor(sourcePosition);
    const fraction = sourcePosition - leftIndex;
    let sample = 0;

    for (const channel of channels) {
      const left = channel[leftIndex] ?? 0;
      const right = channel[leftIndex + 1] ?? left;
      sample += left + (right - left) * fraction;
    }
    output[index] = sample / channels.length;
  }

  return output;
}

async function decodeAudio(audio: Blob): Promise<Float32Array> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    return downsampleToMono(decoded);
  } catch (error) {
    throw new TranscriptionError(
      `The browser could not decode this recording. ${error instanceof Error ? error.message : "Try recording again."}`,
    );
  } finally {
    await context.close();
  }
}

export const transcriptionService = {
  async transcribe(audio: Blob): Promise<string> {
    if (audio.size === 0) {
      throw new TranscriptionError(
        "The recording was empty. Try speaking a little longer before stopping.",
      );
    }

    const audioData = await decodeAudio(audio);
    const transcriber = await loadWhisper();
    const result = await transcriber(audioData, {
      chunk_length_s: CHUNK_LENGTH_SECONDS,
      stride_length_s: STRIDE_LENGTH_SECONDS,
      language: "english",
      task: "transcribe",
    });

    if (!result.text.trim()) {
      throw new TranscriptionError(
        "No speech was recognized. Check your microphone and try again, or type your problem instead.",
      );
    }
    return result.text;
  },
};
