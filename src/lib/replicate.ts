import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const MODELS = {
  DEMUCS: "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  PIANO_TRANSCRIPTION: "bytedance/piano-transcription:8978296ce461e1fd8caae879d59063bc8009f57b734c1c8a2c7b19de0016fd35",
} as const;

function getWebhookUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for webhook URL");
  }
  return `${supabaseUrl}/functions/v1/replicate-webhook`;
}

export async function createStemSeparationPrediction(audioUrl: string) {
  const prediction = await replicate.predictions.create({
    version: MODELS.DEMUCS.split(":")[1],
    input: {
      audio: audioUrl,
      model_name: "htdemucs_6s",
      output_format: "mp3",
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export async function createTranscriptionPrediction(audioUrl: string) {
  const prediction = await replicate.predictions.create({
    version: MODELS.PIANO_TRANSCRIPTION.split(":")[1],
    input: {
      audio_input: audioUrl,
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export async function createBeatDetectionPrediction(_audioUrl: string) {
  // spotify/basic-pitch was removed from Replicate.
  // TODO: Replace with self-hosted basic-pitch or alternative model
  throw new Error(
    "Beat detection is temporarily unavailable — the basic-pitch model was removed from Replicate"
  );
}

export { replicate };
