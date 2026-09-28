"use client";

import {
  AlertCircle,
  Check,
  ChevronRight,
  LoaderCircle,
  Mic,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Type,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  problemBriefFields,
  type ProblemBrief,
} from "@/lib/problem-brief";
import { problemBriefService } from "@/lib/problem-brief-service";
import {
  TranscriptionError,
  transcriptionService,
} from "@/lib/transcription-service";
import { transcribeAndClean } from "@/lib/voice-transcript-pipeline";

type VoiceStatus =
  | "ready"
  | "requesting-permission"
  | "recording"
  | "paused"
  | "processing"
  | "transcribing"
  | "structuring"
  | "transcript"
  | "brief"
  | "completed"
  | "permission-denied"
  | "recording-error"
  | "empty";

type Props = {
  onConfirm: (brief: ProblemBrief, transcript?: { rawTranscript: string; cleanedTranscript: string }) => void;
  onTypeInstead: () => void;
};

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, "0")}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

function ErrorPanel({ status, message, onRetry, onTypeInstead }: {
  status: "permission-denied" | "recording-error" | "empty";
  message: string;
  onRetry: () => void;
  onTypeInstead: () => void;
}) {
  const title = status === "permission-denied"
    ? "Microphone permission needed"
    : status === "empty"
      ? "We didn’t catch any speech"
      : "Recording couldn’t finish";

  return (
    <div role="alert" className="mt-5 rounded-xl border border-[#f1dfd5] bg-[#fffaf7] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff0e8] text-[#b76b45]"><AlertCircle size={17} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-semibold text-[#614437]">{title}</h3>
          <p className="mt-1 text-[10px] leading-[1.65] text-[#8c6f60]">{message}</p>
          {status === "permission-denied" && <p className="mt-2 text-[9px] leading-[1.6] text-[#8c6f60]">Allow microphone access in your browser’s address-bar or site settings, then try again. Voice input needs localhost or a secure (HTTPS) connection.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onRetry} className="rounded-lg border border-[#e8d5ca] bg-white px-3 py-2 text-[10px] font-semibold text-[#855c47] hover:bg-[#fff5ef]">Try again</button>
            <button onClick={onTypeInstead} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-semibold text-[#63756a] hover:bg-white"><Type size={13} /> Type instead</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThinkAloud({ onConfirm, onTypeInstead }: Props) {
  const [status, setStatus] = useState<VoiceStatus>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [rawTranscript, setRawTranscript] = useState("");
  const [cleanedTranscript, setCleanedTranscript] = useState("");
  const [brief, setBrief] = useState<ProblemBrief | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [microphoneAvailable, setMicrophoneAvailable] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedBeforePauseRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const startingRef = useRef(false);
  const disposedRef = useRef(false);

  const releaseMedia = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    disposedRef.current = false;
    setMicrophoneAvailable(
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined",
    );
    return () => {
      disposedRef.current = true;
      releaseMedia();
    };
  }, [releaseMedia]);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => {
      setElapsed(elapsedBeforePauseRef.current + Date.now() - recordingStartedAtRef.current);
    }, 250);
    return () => window.clearInterval(timer);
  }, [status]);

  const resetToReady = useCallback(() => {
    releaseMedia();
    chunksRef.current = [];
    elapsedBeforePauseRef.current = 0;
    setElapsed(0);
    setRawTranscript("");
    setCleanedTranscript("");
    setBrief(null);
    setErrorMessage("");
    setStatus("ready");
  }, [releaseMedia]);

  const startRecording = async () => {
    if (startingRef.current) return;
    if (!microphoneAvailable) {
      setErrorMessage("This browser does not support microphone recording. Try a current version of Chrome, or enter your problem by typing.");
      setStatus("recording-error");
      return;
    }
    resetToReady();
    startingRef.current = true;
    setStatus("requesting-permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      elapsedBeforePauseRef.current = 0;
      setElapsed(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      setStatus("recording");
    } catch (error) {
      releaseMedia();
      if (disposedRef.current) return;
      if (error instanceof TranscriptionError) {
        setErrorMessage(error.message);
        setStatus("recording-error");
      } else if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError" || error.name === "SecurityError")) {
        setErrorMessage("Your browser blocked microphone access.");
        setStatus("permission-denied");
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        setErrorMessage("No microphone was found. Connect a microphone or enter your problem by typing.");
        setStatus("recording-error");
      } else {
        setErrorMessage("We couldn’t start the recording. Check your microphone connection and browser permissions, then try again.");
        setStatus("recording-error");
      }
    } finally {
      startingRef.current = false;
    }
  };

  const pauseRecording = () => {
    if (status !== "recording") return;
    elapsedBeforePauseRef.current += Date.now() - recordingStartedAtRef.current;
    setElapsed(elapsedBeforePauseRef.current);
    recorderRef.current?.pause();
    setStatus("paused");
  };

  const resumeRecording = () => {
    if (status !== "paused") return;
    try {
      recorderRef.current?.resume();
      recordingStartedAtRef.current = Date.now();
      setStatus("recording");
    } catch {
      setErrorMessage("We couldn’t resume the recording. Stop and try again.");
      setStatus("recording-error");
    }
  };

  const stopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder || (status !== "recording" && status !== "paused")) return;
    if (status === "recording") {
      elapsedBeforePauseRef.current += Date.now() - recordingStartedAtRef.current;
      setElapsed(elapsedBeforePauseRef.current);
    }
    setStatus("processing");

    try {
      const recorderStopped = new Promise<void>((resolve, reject) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.addEventListener("error", () => reject(new Error("The browser reported a recording error.")), { once: true });
      });
      recorder.stop();
      await recorderStopped;
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      releaseMedia();

      setStatus("transcribing");
      const { rawTranscript: recognizedTranscript, cleanedTranscript: recognizedText } =
        await transcribeAndClean(audio, transcriptionService.transcribe);
      setStatus("structuring");
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      setRawTranscript(recognizedTranscript);
      setCleanedTranscript(recognizedText);
      setBrief(problemBriefService.structure(recognizedText));
      setStatus("transcript");
    } catch (error) {
      releaseMedia();
      if (error instanceof TranscriptionError) {
        setErrorMessage(error.message);
        setStatus(error.message.includes("empty") || error.message.includes("No speech was recognized") ? "empty" : "recording-error");
      } else {
        setErrorMessage(error instanceof Error ? error.message : "We couldn’t process that recording.");
        setStatus("recording-error");
      }
    }
  };

  const continueToBrief = () => {
    const nextBrief = problemBriefService.structure(cleanedTranscript.trim());
    setBrief(nextBrief);
    setStatus("brief");
  };

  const confirmBrief = () => {
    if (!brief) return;
    onConfirm(brief, { rawTranscript, cleanedTranscript });
    setStatus("completed");
  };

  const goBackToTranscript = () => {
    setStatus("transcript");
  };

  const statusLabel = {
    ready: "Ready to record",
    "requesting-permission": "Allow microphone access",
    recording: "Recording",
    paused: "Paused",
    processing: "Processing recording",
    transcribing: "Transcribing",
    structuring: "Structuring your problem",
    transcript: "Transcript ready",
    brief: "Review your Problem Brief",
    completed: "Problem Brief confirmed",
    "permission-denied": "Microphone permission denied",
    "recording-error": "Recording error",
    empty: "Empty recording",
  }[status];

  return (
    <section className="mt-5 overflow-hidden rounded-[15px] border border-[#dce9df] bg-white shadow-[0_7px_26px_rgba(42,79,53,0.055)]" aria-labelledby="think-aloud-title">
      <div className="bg-[#edf5ef] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#28734d] text-white shadow-sm"><Mic size={19} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="think-aloud-title" className="text-[14px] font-semibold tracking-[-0.2px] text-[#2a4634]">Think aloud</h3>
              <span className="rounded-full border border-[#d6e5d9] bg-white/80 px-2 py-0.5 text-[8px] font-semibold text-[#63816a]">JUST SPEAK NATURALLY</span>
            </div>
            <p className="mt-1 text-[10px] leading-[1.6] text-[#6b7e70]">Just tell me what’s going on. I’ll structure it for you.</p>
          </div>
          <div aria-live="polite" className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-semibold ${status === "recording" ? "bg-[#fff0ee] text-[#b8524e]" : status === "completed" ? "bg-white text-[#42754d]" : "bg-white/75 text-[#738178]"}`}>
            {status === "recording" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9615b]" />}
            {(status === "requesting-permission" || status === "processing" || status === "transcribing" || status === "structuring") && <LoaderCircle size={11} className="animate-spin" />}
            {statusLabel}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {status === "ready" && (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[#dce6dd] bg-[#fbfdfb] px-4 py-7 text-center sm:py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f3ec] text-[#337b4e]"><Mic size={24} /></div>
            <p className="mt-3 text-[12px] font-semibold text-[#3a4c3f]">No need to organize your thoughts first</p>
            <p className="mt-1 max-w-[360px] text-[10px] leading-[1.7] text-[#849087]">Talk through what you’ve noticed, who’s involved, and what you’re unsure about. You can pause, edit the transcript, and review everything before continuing.</p>
            <button onClick={startRecording} className="mt-4 flex h-10 items-center gap-2 rounded-lg bg-[#28734d] px-4 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1e603f]">
              <Mic size={15} /> Start recording
            </button>
            {!microphoneAvailable && <p role="status" className="mt-3 max-w-[340px] text-[9px] leading-[1.6] text-[#8b725e]">Microphone recording is not available in this browser. Use the text input above instead.</p>}
            <button onClick={onTypeInstead} className="mt-3 text-[9px] font-medium text-[#62816a] underline-offset-2 hover:underline">Prefer to type? Go to text input</button>
            <p className="mt-3 max-w-[380px] text-[8px] leading-[1.6] text-[#a0aaa2]">Transcription runs locally on your device. Audio is not sent to a speech service.</p>
          </div>
        )}

        {(status === "recording" || status === "paused") && (
          <div className="rounded-xl border border-[#e8ede9] bg-[#fbfcfb] p-4 sm:p-5">
            <div className="flex flex-col items-center text-center">
              <div className={`relative flex h-[66px] w-[66px] items-center justify-center rounded-full ${status === "recording" ? "bg-[#fceceb]" : "bg-[#f2f3ed]"}`}>
                {status === "recording" && <span className="absolute inset-0 animate-ping rounded-full bg-[#f6e0df] opacity-60" />}
                <span className={`relative flex h-12 w-12 items-center justify-center rounded-full ${status === "recording" ? "bg-[#c9625e] text-white" : "bg-[#7c897e] text-white"}`}><Mic size={20} /></span>
              </div>
              <div className="mt-3 font-mono text-[24px] font-semibold tracking-[1px] text-[#38483e]">{formatDuration(elapsed)}</div>
              <p aria-live="polite" className={`mt-1 text-[10px] font-medium ${status === "recording" ? "text-[#ba615b]" : "text-[#768178]"}`}>{status === "recording" ? "I’m listening… take your time." : "Recording paused"}</p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              {status === "recording" ? (
                <button onClick={pauseRecording} aria-label="Pause recording" className="flex h-9 items-center gap-1.5 rounded-lg border border-[#e1e7e2] bg-white px-3 text-[10px] font-semibold text-[#55645a] hover:bg-[#f7f9f7]"><Pause size={13} /> Pause</button>
              ) : (
                <button onClick={resumeRecording} aria-label="Resume recording" className="flex h-9 items-center gap-1.5 rounded-lg border border-[#d9e6dc] bg-white px-3 text-[10px] font-semibold text-[#39734c] hover:bg-[#f3f8f4]"><Play size={13} /> Resume</button>
              )}
              <button onClick={stopRecording} className="flex h-9 items-center gap-1.5 rounded-lg bg-[#28734d] px-3 text-[10px] font-semibold text-white hover:bg-[#1e603f]"><Square size={12} fill="currentColor" /> Stop & transcribe</button>
            </div>
          </div>
        )}

        {(status === "requesting-permission" || status === "processing" || status === "transcribing" || status === "structuring") && (
          <div role="status" aria-live="polite" className="flex flex-col items-center rounded-xl border border-[#e8ede9] bg-[#fbfcfb] px-4 py-9 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf3ec] text-[#438054]"><LoaderCircle size={21} className="animate-spin" /></div>
            <h4 className="mt-3 text-[12px] font-semibold text-[#425246]">{status === "requesting-permission" ? "Waiting for microphone permission…" : status === "processing" ? "Wrapping up your recording…" : status === "transcribing" ? "Turning your speech into text…" : "Organizing what you shared…"}</h4>
            <p className="mt-1 text-[10px] text-[#879188]">{status === "requesting-permission" ? "Allow microphone access in the browser prompt to begin." : "Running local Whisper transcription. Audio stays on this device."}</p>
          </div>
        )}

        {status === "transcript" && (
          <div className="rounded-xl border border-[#e8ede9] bg-[#fbfcfb] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><label htmlFor="cleaned-voice-transcript" className="text-[12px] font-semibold text-[#435247]">Transcript</label></div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[9px] text-[#849087]">{formatDuration(elapsed)}</span>
            </div>
            <textarea id="cleaned-voice-transcript" aria-label="Editable cleaned transcript" value={cleanedTranscript} onChange={(event) => setCleanedTranscript(event.target.value)} maxLength={10000} rows={6} className="mt-3 w-full resize-y rounded-lg border border-[#dce6de] bg-white p-3 text-[11px] leading-[1.75] text-[#46554b] outline-none focus:border-[#83ab8d]" />
            <p className="mt-1.5 text-[9px] text-[#8b958d]">Speak naturally. You can edit anything before continuing.</p>
            {rawTranscript && (
              <details className="mt-2 rounded-lg border border-[#edf0ed] bg-white px-3 py-2">
                <summary className="cursor-pointer text-[9px] font-medium text-[#7b877e]">View raw transcript</summary>
                <p className="mt-2 whitespace-pre-wrap text-[9px] leading-[1.65] text-[#89948c]">{rawTranscript}</p>
              </details>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button onClick={resetToReady} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-medium text-[#718076] hover:bg-white"><RotateCcw size={13} /> Record again</button>
              <button onClick={continueToBrief} disabled={!cleanedTranscript.trim()} className="flex items-center gap-1.5 rounded-lg bg-[#28734d] px-3 py-2 text-[10px] font-semibold text-white hover:bg-[#1e603f] disabled:cursor-not-allowed disabled:opacity-50">Build Problem Brief <ChevronRight size={13} /></button>
            </div>
          </div>
        )}

        {(status === "brief" || status === "completed") && brief && (
          <div>
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf3ec] text-[#47815a]"><Sparkles size={16} /></div>
              <div><h4 className="text-[13px] font-semibold text-[#3d4c41]">Here’s what I understood</h4><p className="mt-1 max-w-[540px] text-[10px] leading-[1.6] text-[#838e86]">Review the brief. Anything not stated is marked “Unknown”—edit any field before continuing.</p></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {problemBriefFields.map(({ key, label, kind }) => (
                <label key={key} className={`block rounded-lg border border-[#e8ede9] bg-[#fbfcfb] p-3 ${key === "problemStatement" || key === "possibleCauses" || key === "assumptions" ? "sm:col-span-2" : ""}`}>
                  <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-[#5c6e60]">{label}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-bold tracking-[0.35px] ${
                      kind === "POSSIBLE CAUSE" ? "bg-[#fff2e6] text-[#a76b32]"
                        : kind === "UNKNOWN" ? "bg-[#f1eef8] text-[#78619c]"
                          : kind === "ASSUMPTION" ? "bg-[#f3f1ec] text-[#88795f]"
                            : kind === "USER INTENT" ? "bg-[#eaf1fa] text-[#55739a]"
                              : "bg-[#eaf3ec] text-[#4e7b57]"
                    }`}>{kind === "ASSUMPTION" ? "ASSUMPTION" : brief[key] === "Unknown" ? "UNKNOWN" : kind}</span>
                  </span>
                  {status === "completed" ? (
                    <p className="whitespace-pre-wrap text-[10px] leading-[1.65] text-[#68766d]">{brief[key]}</p>
                  ) : (
                    <textarea aria-label={label} value={brief[key]} onChange={(event) => setBrief({ ...brief, [key]: event.target.value })} rows={Math.min(5, Math.max(key === "problemStatement" ? 2 : 1, brief[key].split("\n").length))} className="w-full resize-y bg-transparent text-[10px] leading-[1.65] text-[#536157] outline-none placeholder:text-[#a4ada6]" />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {status === "completed" ? (
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#4d8059]"><Check size={14} /> Brief confirmed. Framework recommendations are below.</span>
              ) : (
                <button onClick={goBackToTranscript} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-medium text-[#718076] hover:bg-[#f4f7f4]"><Pencil size={12} /> Edit problem</button>
              )}
              {status === "brief" ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={resetToReady} className="flex items-center gap-1.5 rounded-lg border border-[#e2e8e3] bg-white px-3 py-2 text-[10px] font-medium text-[#6d7b71] hover:bg-[#f7f9f7]"><RotateCcw size={12} /> Record again</button>
                  <button onClick={confirmBrief} className="flex items-center gap-1.5 rounded-lg bg-[#28734d] px-3.5 py-2 text-[10px] font-semibold text-white hover:bg-[#1e603f]"><Check size={13} /> Confirm & continue</button>
                </div>
              ) : (
                <button onClick={resetToReady} className="flex items-center gap-1.5 rounded-lg border border-[#e2e8e3] bg-white px-3 py-2 text-[10px] font-medium text-[#6d7b71] hover:bg-[#f7f9f7]"><RotateCcw size={12} /> Record another problem</button>
              )}
            </div>
          </div>
        )}

        {(status === "permission-denied" || status === "recording-error" || status === "empty") && (
          <ErrorPanel status={status} message={errorMessage} onRetry={resetToReady} onTypeInstead={onTypeInstead} />
        )}
      </div>
    </section>
  );
}
