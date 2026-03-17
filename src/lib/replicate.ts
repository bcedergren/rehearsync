import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/** Retry a Replicate call on 429 with exponential back-off */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isRateLimit =
        err instanceof Error &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 429;
      if (!isRateLimit || attempt === maxRetries) throw err;
      // Use retry-after header or exponential backoff (10s, 20s, 40s)
      const retryAfter =
        (err as { response?: { headers?: { get?: (k: string) => string | null } } }).response?.headers?.get?.("retry-after");
      const waitSec = retryAfter ? parseInt(retryAfter, 10) + 1 : 10 * 2 ** attempt;
      console.log(`[replicate] Rate limited, retrying in ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
  throw new Error("unreachable");
}

export const MODELS = {
  DEMUCS: "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
  BASIC_PITCH: "rehearsync/basic-pitch:80c0b021f3cd1d667f15cd0af7794106742817ae762f437dd49783c9c3e0082a",
  MR_MT3: "rehearsync/mr-mt3:2d0d4e1fbcbbe6e16281c24374c69f548194d1dba2a9554e0b9ba64321c713f6",
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
  return withRetry(() =>
    replicate.predictions.create({
      version: MODELS.DEMUCS.split(":")[1],
      input: {
        audio: audioUrl,
        model_name: "htdemucs_6s",
        output_format: "mp3",
      },
      webhook: getWebhookUrl(),
      webhook_events_filter: ["completed"],
    })
  );
}

export async function createTranscriptionPrediction(audioUrl: string, stemName?: string) {
  return withRetry(() =>
    replicate.predictions.create({
      version: MODELS.MR_MT3.split(":")[1],
      input: {
        audio_file: audioUrl,
        ...(stemName ? { stem_name: stemName } : {}),
      },
      webhook: getWebhookUrl(),
      webhook_events_filter: ["completed"],
    })
  );
}

export async function createBeatDetectionPrediction(audioUrl: string) {
  return withRetry(() =>
    replicate.predictions.create({
      version: MODELS.ESSENTIA_BPM.split(":")[1],
      input: {
        audio: audioUrl,
        algo_type: "deepsquare-k16",
      },
      webhook: getWebhookUrl(),
      webhook_events_filter: ["completed"],
    })
  );
}

export { replicate };
