// Supabase Edge Function — Replicate Webhook Handler
// Receives callbacks from Replicate when AI predictions complete.
// Runs in Deno, uses Supabase client for DB + Storage (no Prisma).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REPLICATE_WEBHOOK_SECRET = Deno.env.get("REPLICATE_WEBHOOK_SECRET");
const STORAGE_BUCKET = "rehearsync-assets";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Webhook Signature Verification ─────────────────────────────

async function verifyWebhookSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  if (!REPLICATE_WEBHOOK_SECRET || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(REPLICATE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}

// ─── Database Helpers (raw SQL via Supabase) ────────────────────

async function findJobByExternalId(externalId: string) {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select(
      `
      id, arrangement_id, audio_asset_id, job_type, status,
      audio_assets!audio_asset_id (
        id, arrangement_id,
        storage_objects!storage_object_id ( bucket, object_key )
      ),
      arrangements!arrangement_id (
        id, song_id,
        songs!song_id ( band_id )
      )
    `
    )
    .eq("external_id", externalId)
    .single();

  if (error) {
    console.error("Error finding job:", error);
    return null;
  }
  return data;
}

async function updateJobStatus(
  jobId: string,
  status: string,
  outputPayload?: Record<string, unknown>,
  errorMessage?: string
) {
  const updateData: Record<string, unknown> = {
    status,
    ...(outputPayload && { output_payload: outputPayload }),
    ...(errorMessage && { error_message: errorMessage }),
    ...(status === "running" && { started_at: new Date().toISOString() }),
    ...(["completed", "failed"].includes(status) && {
      completed_at: new Date().toISOString(),
    }),
  };

  const { error } = await supabase
    .from("processing_jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) console.error("Error updating job:", error);
}

async function createStorageObject(
  bucket: string,
  objectKey: string,
  originalFileName: string,
  mimeType: string,
  sizeBytes: number
) {
  const { data, error } = await supabase
    .from("storage_objects")
    .insert({
      bucket,
      object_key: objectKey,
      original_file_name: originalFileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create storage object: ${error.message}`);
  return data.id;
}

async function createAudioAsset(
  arrangementId: string,
  storageObjectId: string,
  assetRole: string,
  stemName: string | null
) {
  // Get next version number
  const { data: existing } = await supabase
    .from("audio_assets")
    .select("version_num")
    .eq("arrangement_id", arrangementId)
    .eq("asset_role", assetRole)
    .is("stem_name", stemName)
    .order("version_num", { ascending: false })
    .limit(1);

  const nextVersion = (existing?.[0]?.version_num ?? 0) + 1;

  // Retire existing active assets with same role/stem
  await supabase
    .from("audio_assets")
    .update({ is_active: false, status: "retired" })
    .eq("arrangement_id", arrangementId)
    .eq("asset_role", assetRole)
    .is("stem_name", stemName)
    .eq("is_active", true);

  // Create new asset
  const { data, error } = await supabase
    .from("audio_assets")
    .insert({
      arrangement_id: arrangementId,
      storage_object_id: storageObjectId,
      asset_role: assetRole,
      stem_name: stemName,
      version_num: nextVersion,
      is_active: true,
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create audio asset: ${error.message}`);
  return data.id;
}

// ─── Stem Separation Handler ────────────────────────────────────

const STEM_NAMES = ["vocals", "drums", "bass", "other"] as const;

async function handleStemSeparation(
  job: Record<string, unknown>,
  output: Record<string, string>
) {
  const arrangementId = job.arrangement_id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bandId = (job as any).arrangements?.songs?.band_id;

  if (!bandId) {
    throw new Error("Could not determine bandId from job");
  }

  const createdStems: Record<string, string> = {};

  for (const stemName of STEM_NAMES) {
    const stemUrl = output[stemName];
    if (!stemUrl) continue;

    // Download the stem file from Replicate's temporary URL
    const stemResponse = await fetch(stemUrl);
    if (!stemResponse.ok) {
      throw new Error(`Failed to download ${stemName} stem: ${stemResponse.status}`);
    }

    const stemData = await stemResponse.arrayBuffer();
    const stemId = crypto.randomUUID();
    const objectKey = `bands/${bandId}/audio/${stemId}.mp3`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectKey, stemData, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${stemName} stem: ${uploadError.message}`);
    }

    // Create DB records
    const storageObjectId = await createStorageObject(
      STORAGE_BUCKET,
      objectKey,
      `${stemName}.mp3`,
      "audio/mpeg",
      stemData.byteLength
    );

    const assetId = await createAudioAsset(
      arrangementId,
      storageObjectId,
      "stem",
      stemName
    );

    createdStems[stemName] = assetId;
  }

  return createdStems;
}

// ─── Transcription Handler (Basic Pitch → MIDI) ────────────────

async function handleTranscription(
  job: Record<string, unknown>,
  output: Record<string, unknown>
) {
  // Basic Pitch returns MIDI file URL
  // For now, store the output payload for later processing
  // Phase 3 will add MIDI → MusicXML conversion via OpenAI
  return { midiOutput: output };
}

// ─── Beat Detection Handler ─────────────────────────────────────

async function handleBeatDetection(
  job: Record<string, unknown>,
  output: Record<string, unknown>
) {
  // Basic Pitch returns note onsets and timing info
  // Phase 4 will parse this into SyncMap + SyncMapPoints
  return { beatOutput: output };
}

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();

  // Verify webhook signature if secret is configured
  if (REPLICATE_WEBHOOK_SECRET) {
    const signature = req.headers.get("webhook-signature");
    const valid = await verifyWebhookSignature(body, signature);
    if (!valid) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const predictionId = payload.id as string;
  const status = payload.status as string;
  const output = payload.output as Record<string, unknown> | null;
  const error = payload.error as string | null;

  console.log(`Replicate webhook: prediction=${predictionId} status=${status}`);

  // Find the processing job
  const job = await findJobByExternalId(predictionId);
  if (!job) {
    console.error(`No job found for prediction ${predictionId}`);
    return new Response("Job not found", { status: 404 });
  }

  // Handle failure
  if (status === "failed" || status === "canceled") {
    await updateJobStatus(
      job.id,
      "failed",
      undefined,
      error || `Prediction ${status}`
    );
    return new Response("OK", { status: 200 });
  }

  // Handle success
  if (status === "succeeded" && output) {
    try {
      let result: Record<string, unknown>;

      switch (job.job_type) {
        case "stem_separation":
          result = await handleStemSeparation(
            job,
            output as Record<string, string>
          );
          break;
        case "transcription":
          result = await handleTranscription(job, output);
          break;
        case "beat_detection":
          result = await handleBeatDetection(job, output);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }

      await updateJobStatus(job.id, "completed", result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Processing failed";
      console.error(`Error processing ${job.job_type}:`, err);
      await updateJobStatus(job.id, "failed", undefined, message);
    }
  }

  return new Response("OK", { status: 200 });
});
