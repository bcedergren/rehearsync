import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const MODELS = {
  DEMUCS: "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81571f6571b07088",
  BASIC_PITCH: "spotify/basic-pitch:7a65a38d58a15333dd2d9030c8796de08e74ec12254bfbc66db4a2cce2627b09",
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

export async function createTranscriptionPrediction(audioUrl: string) {
  const prediction = await replicate.predictions.create({
    version: MODELS.BASIC_PITCH.split(":")[1],
    input: {
      audio_path: audioUrl,
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export async function createBeatDetectionPrediction(audioUrl: string) {
  // Basic pitch also outputs note onsets which can be used for beat detection
  const prediction = await replicate.predictions.create({
    version: MODELS.BASIC_PITCH.split(":")[1],
    input: {
      audio_path: audioUrl,
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export { replicate };
