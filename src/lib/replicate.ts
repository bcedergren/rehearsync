import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export const MODELS = {
  DEMUCS: "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  BASIC_PITCH: "rhelsing/basic-pitch:a7cf33cf63fca9c71f2235332af5a9fdfb7d23c459a0dc429daa203ff8e80c78",
  ESSENTIA_BPM: "mtg/essentia-bpm:b3045c359817fea53678791886d50aa3e3a995dc4796fe74db0de156d5074a43",
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
    version: MODELS.BASIC_PITCH.split(":")[1],
    input: {
      audio_file: audioUrl,
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export async function createBeatDetectionPrediction(audioUrl: string) {
  const prediction = await replicate.predictions.create({
    version: MODELS.ESSENTIA_BPM.split(":")[1],
    input: {
      audio: audioUrl,
      algo_type: "deepsquare-k16",
    },
    webhook: getWebhookUrl(),
    webhook_events_filter: ["completed"],
  });
  return prediction;
}

export { replicate };
