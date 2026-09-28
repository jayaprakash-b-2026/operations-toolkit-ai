import { transcriptCleanupService } from "./transcript-cleanup";
import { transcriptionService } from "./transcription-service";

export type VoiceTranscript = {
  rawTranscript: string;
  cleanedTranscript: string;
};

type TranscribeAudio = (audio: Blob) => Promise<string>;

export async function transcribeAndClean(
  audio: Blob,
  transcribe: TranscribeAudio = transcriptionService.transcribe,
): Promise<VoiceTranscript> {
  const rawTranscript = await transcribe(audio);
  return {
    rawTranscript,
    cleanedTranscript: transcriptCleanupService.clean(rawTranscript),
  };
}
