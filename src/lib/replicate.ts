import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const MODELS = {
  DEMUCS: "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
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
      output_format: "mp3",
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export async function createTranscriptionPrediction(_audioUrl: string) {
  // spotify/basic-pitch was removed from Replicate.
  // TODO: Replace with self-hosted basic-pitch or alternative model
  throw new Error(
    "Transcription is temporarily unavailable — the basic-pitch model was removed from Replicate"
  );
}

export async function createBeatDetectionPrediction(_audioUrl: string) {
  // spotify/basic-pitch was removed from Replicate.
  // TODO: Replace with self-hosted basic-pitch or alternative model
  throw new Error(
    "Beat detection is temporarily unavailable — the basic-pitch model was removed from Replicate"
  );
}

export { replicate };
