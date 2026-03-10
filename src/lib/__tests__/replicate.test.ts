jest.mock("replicate", () => {
  const mockCreate = jest.fn().mockResolvedValue({ id: "pred-123" });
  return jest.fn().mockImplementation(() => ({
    predictions: { create: mockCreate },
  }));
});

// Set env before importing
process.env.REPLICATE_API_TOKEN = "test-token";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

import {
  createStemSeparationPrediction,
  createTranscriptionPrediction,
  createBeatDetectionPrediction,
  MODELS,
} from "../replicate";
import Replicate from "replicate";

const mockReplicate = new Replicate({ auth: "test" }) as any;
const mockCreate = mockReplicate.predictions.create;

beforeEach(() => jest.clearAllMocks());

describe("MODELS", () => {
  it("has DEMUCS model with version hash", () => {
    expect(MODELS.DEMUCS).toContain("cjwbw/demucs:");
    expect(MODELS.DEMUCS.split(":")[1]).toHaveLength(64);
  });

  it("has BASIC_PITCH model with version hash", () => {
    expect(MODELS.BASIC_PITCH).toContain("rhelsing/basic-pitch:");
    expect(MODELS.BASIC_PITCH.split(":")[1]).toHaveLength(64);
  });

  it("has ESSENTIA_BPM model with version hash", () => {
    expect(MODELS.ESSENTIA_BPM).toContain("mtg/essentia-bpm:");
    expect(MODELS.ESSENTIA_BPM.split(":")[1]).toHaveLength(64);
  });
});

describe("createStemSeparationPrediction", () => {
  it("creates prediction with demucs model and mp3 output", async () => {
    const result = await createStemSeparationPrediction("https://example.com/audio.mp3");

    expect(result).toEqual({ id: "pred-123" });
    expect(mockCreate).toHaveBeenCalledWith({
      version: MODELS.DEMUCS.split(":")[1],
      input: { audio: "https://example.com/audio.mp3", model_name: "htdemucs_6s", output_format: "mp3" },
      webhook: "https://test.supabase.co/functions/v1/replicate-webhook",
      webhook_events_filter: ["completed"],
    });
  });
});

describe("createTranscriptionPrediction", () => {
  it("creates prediction with Basic Pitch model", async () => {
    const result = await createTranscriptionPrediction("https://example.com/stem.mp3");

    expect(result).toEqual({ id: "pred-123" });
    expect(mockCreate).toHaveBeenCalledWith({
      version: MODELS.BASIC_PITCH.split(":")[1],
      input: { audio_file: "https://example.com/stem.mp3" },
      webhook: "https://test.supabase.co/functions/v1/replicate-webhook",
      webhook_events_filter: ["completed"],
    });
  });
});

describe("createBeatDetectionPrediction", () => {
  it("creates prediction with essentia BPM model", async () => {
    const result = await createBeatDetectionPrediction("https://example.com/mix.mp3");

    expect(result).toEqual({ id: "pred-123" });
    expect(mockCreate).toHaveBeenCalledWith({
      version: MODELS.ESSENTIA_BPM.split(":")[1],
      input: { audio: "https://example.com/mix.mp3", algo_type: "deepsquare-k16" },
      webhook: "https://test.supabase.co/functions/v1/replicate-webhook",
      webhook_events_filter: ["completed"],
    });
  });
});
