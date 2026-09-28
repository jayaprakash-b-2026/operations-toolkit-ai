import { copyFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const runtimeEntry = require.resolve("onnxruntime-web");
const runtimeDirectory = path.dirname(runtimeEntry);
const transformersDirectory = path.dirname(
  require.resolve("@huggingface/transformers"),
);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repositoryRoot, "public", "ort");
const vendorDirectory = path.join(repositoryRoot, "public", "vendor");

await mkdir(outputDirectory, { recursive: true });
await mkdir(vendorDirectory, { recursive: true });
const wasmRuntimeAssets = [
  "ort-wasm-simd-threaded.asyncify.mjs",
  "ort-wasm-simd-threaded.asyncify.wasm",
];
const availableAssets = new Set(await readdir(runtimeDirectory));
const missingAssets = wasmRuntimeAssets.filter((asset) => !availableAssets.has(asset));
if (missingAssets.length) {
  throw new Error(
    `ONNX Runtime Web assets are missing from ${runtimeDirectory}: ${missingAssets.join(", ")}`,
  );
}

const previousWasmAssets = (await readdir(outputDirectory)).filter(
  (asset) => asset.startsWith("ort-wasm-") && !wasmRuntimeAssets.includes(asset),
);
await Promise.all(
  previousWasmAssets.map((asset) => unlink(path.join(outputDirectory, asset))),
);

await Promise.all(
  wasmRuntimeAssets.map((asset) =>
    copyFile(path.join(runtimeDirectory, asset), path.join(outputDirectory, asset)),
  ),
);

const browserRuntimeAssets = [
  [path.join(transformersDirectory, "transformers.min.js"), "transformers.min.js"],
  [path.join(runtimeDirectory, "ort.webgpu.bundle.min.mjs"), "ort.webgpu.bundle.min.mjs"],
  [path.join(runtimeDirectory, "ort.wasm.bundle.min.mjs"), "ort.wasm.bundle.min.mjs"],
];
await Promise.all(
  browserRuntimeAssets.map(([source, fileName]) =>
    copyFile(source, path.join(vendorDirectory, fileName)),
  ),
);

console.log(
  `Prepared ${wasmRuntimeAssets.length} local ONNX Runtime assets and ${browserRuntimeAssets.length} browser runtime assets.`,
);
