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

// ─── Webhook Signature Verification (Standard Webhooks / Replicate) ──

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

async function verifyWebhookSignature(
  body: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null
): Promise<boolean> {
  if (!REPLICATE_WEBHOOK_SECRET || !webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  // Replicate signs: "${webhook-id}.${webhook-timestamp}.${body}"
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;

  // Secret is base64-encoded, prefixed with "whsec_"
  const secretStr = REPLICATE_WEBHOOK_SECRET.startsWith("whsec_")
    ? REPLICATE_WEBHOOK_SECRET.slice(6)
    : REPLICATE_WEBHOOK_SECRET;
  const secretBytes = base64Decode(secretStr);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent));
  const computed = base64Encode(sig);

  // Signature header can contain multiple space-separated signatures: "v1,<sig1> v1,<sig2>"
  const signatures = webhookSignature.split(" ");
  for (const versionedSig of signatures) {
    const [version, sigValue] = versionedSig.split(",", 2);
    if (version === "v1" && sigValue === computed) {
      return true;
    }
  }

  return false;
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
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("storage_objects")
    .insert({
      id,
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
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("audio_assets")
    .insert({
      id,
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

const STEM_NAMES = ["vocals", "drums", "bass", "guitar", "piano", "other"] as const;

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

// ─── Beat Detection Handler ─────────────────────────────────────

async function handleBeatDetection(
  job: Record<string, unknown>,
  output: Record<string, unknown>
) {
  const arrangementId = job.arrangement_id as string;
  const audioAssetId = job.audio_asset_id as string;

  // Basic Pitch returns note_events (with onset times) and midi_file
  // We use note onsets to estimate bar boundaries
  const noteEvents = output.note_events as number[][] | undefined;

  if (!noteEvents || noteEvents.length === 0) {
    throw new Error("No note events returned from basic-pitch");
  }

  // Extract onset times (first element of each event array)
  // Basic Pitch note_events format: [start_time_s, end_time_s, pitch, velocity, [optional]]
  const onsetTimesMs = noteEvents
    .map((event) => Math.round(event[0] * 1000))
    .sort((a, b) => a - b);

  // Estimate tempo from onset intervals
  const intervals: number[] = [];
  for (let i = 1; i < Math.min(onsetTimesMs.length, 200); i++) {
    const diff = onsetTimesMs[i] - onsetTimesMs[i - 1];
    if (diff > 50 && diff < 2000) {
      intervals.push(diff);
    }
  }

  // Find the most common interval cluster (likely the beat)
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)] || 500;

  // Estimate beat duration — cluster around the median
  const nearMedian = intervals.filter(
    (i) => Math.abs(i - medianInterval) < medianInterval * 0.3
  );
  const avgBeatMs =
    nearMedian.length > 0
      ? Math.round(nearMedian.reduce((a, b) => a + b, 0) / nearMedian.length)
      : medianInterval;

  // Assume 4/4 time — bar = 4 beats
  const barDurationMs = avgBeatMs * 4;
  const estimatedBpm = Math.round(60000 / avgBeatMs);

  // Determine song duration from last note event
  const lastOnsetMs = onsetTimesMs[onsetTimesMs.length - 1];
  const totalBars = Math.ceil(lastOnsetMs / barDurationMs);

  // Get next version number for sync maps on this audio asset
  const { data: existingMaps } = await supabase
    .from("sync_maps")
    .select("version_num")
    .eq("audio_asset_id", audioAssetId)
    .order("version_num", { ascending: false })
    .limit(1);

  const nextVersion = ((existingMaps?.[0]?.version_num as number) ?? 0) + 1;

  // Retire existing active sync maps for this audio
  await supabase
    .from("sync_maps")
    .update({ is_active: false, status: "retired" })
    .eq("audio_asset_id", audioAssetId)
    .eq("is_active", true);

  // Create the sync map
  const { data: syncMap, error: syncMapError } = await supabase
    .from("sync_maps")
    .insert({
      arrangement_id: arrangementId,
      audio_asset_id: audioAssetId,
      source_type: "generated",
      version_num: nextVersion,
      is_active: true,
      status: "active",
    })
    .select("id")
    .single();

  if (syncMapError) {
    throw new Error(`Failed to create sync map: ${syncMapError.message}`);
  }

  // Create sync map points — one per bar boundary
  const points = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    const timeMs = (bar - 1) * barDurationMs;
    points.push({
      sync_map_id: syncMap.id,
      time_ms: timeMs,
      bar_number: bar,
      beat_number: 1,
      tick_offset: 0,
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100);
    const { error: pointsError } = await supabase
      .from("sync_map_points")
      .insert(batch);
    if (pointsError) {
      throw new Error(`Failed to create sync map points: ${pointsError.message}`);
    }
  }

  return {
    syncMapId: syncMap.id,
    estimatedBpm,
    totalBars,
    barDurationMs,
    pointsCreated: points.length,
  };
}

// ─── Transcription Handler (Basic Pitch → MIDI → MusicXML) ─────

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

async function handleTranscription(
  job: Record<string, unknown>,
  output: Record<string, unknown>
) {
  const arrangementId = job.arrangement_id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bandId = (job as any).arrangements?.songs?.band_id;

  if (!bandId) {
    throw new Error("Could not determine bandId from job");
  }

  // Basic Pitch returns midi_file URL and note_events
  const midiFileUrl = output.midi_file as string | undefined;
  const noteEvents = output.note_events as number[][] | undefined;

  if (!noteEvents || noteEvents.length === 0) {
    throw new Error("No note events returned from basic-pitch");
  }

  // Download MIDI file for storage
  let midiData: ArrayBuffer | null = null;
  if (midiFileUrl) {
    const midiResponse = await fetch(midiFileUrl);
    if (midiResponse.ok) {
      midiData = await midiResponse.arrayBuffer();
    }
  }

  // Format note events for OpenAI
  // note_events: [start_time_s, end_time_s, midi_pitch, velocity]
  const notesSummary = noteEvents
    .slice(0, 500) // Limit to first 500 notes to stay within token limits
    .map((e) => ({
      start: Math.round(e[0] * 1000) / 1000,
      end: Math.round(e[1] * 1000) / 1000,
      pitch: Math.round(e[2]),
      velocity: Math.round(e[3] * 127),
    }));

  if (!OPENAI_API_KEY) {
    // Store MIDI data but skip MusicXML generation
    const result: Record<string, unknown> = {
      noteEventsCount: noteEvents.length,
      skippedMusicXml: true,
      reason: "OPENAI_API_KEY not configured",
    };

    // Still upload MIDI if available
    if (midiData) {
      const midiId = crypto.randomUUID();
      const midiKey = `bands/${bandId}/midi/${midiId}.mid`;
      await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(midiKey, midiData, { contentType: "audio/midi", upsert: false });
      result.midiStorageKey = midiKey;
    }

    return result;
  }

  // Call OpenAI to convert note data to MusicXML
  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a music transcription expert. Convert MIDI note data into valid MusicXML format.
Rules:
- Infer time signature and key signature from the note patterns
- Quantize notes to the nearest readable rhythmic value (eighth notes minimum)
- Use standard MusicXML 4.0 format
- Include proper measure divisions, clef, and note durations
- Output ONLY the MusicXML content, no explanations or markdown
- The output must be a complete, valid MusicXML document`,
          },
          {
            role: "user",
            content: `Convert these detected notes to MusicXML. Notes are objects with start (seconds), end (seconds), pitch (MIDI number 0-127), and velocity (0-127):\n\n${JSON.stringify(notesSummary)}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 16000,
      }),
    }
  );

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    throw new Error(`OpenAI API error: ${openaiResponse.status} ${errText}`);
  }

  const openaiResult = await openaiResponse.json();
  const musicXmlContent =
    openaiResult.choices?.[0]?.message?.content?.trim() ?? "";

  if (!musicXmlContent || !musicXmlContent.includes("<?xml")) {
    throw new Error("OpenAI did not return valid MusicXML content");
  }

  // Upload MusicXML to Supabase Storage
  const xmlId = crypto.randomUUID();
  const xmlKey = `bands/${bandId}/sheets/${xmlId}.musicxml`;
  const xmlBytes = new TextEncoder().encode(musicXmlContent);

  const { error: xmlUploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(xmlKey, xmlBytes, {
      contentType: "application/vnd.recordare.musicxml+xml",
      upsert: false,
    });

  if (xmlUploadError) {
    throw new Error(`Failed to upload MusicXML: ${xmlUploadError.message}`);
  }

  // Create StorageObject for MusicXML
  const xmlStorageObjectId = await createStorageObject(
    STORAGE_BUCKET,
    xmlKey,
    "transcription.musicxml",
    "application/vnd.recordare.musicxml+xml",
    xmlBytes.byteLength
  );

  // Find the Part linked to this stem's audio asset (if any)
  // Look for a Part whose instrument matches the stem name
  const audioAssetId = job.audio_asset_id as string;
  const { data: audioAsset } = await supabase
    .from("audio_assets")
    .select("stem_name")
    .eq("id", audioAssetId)
    .single();

  let partId: string | null = null;

  if (audioAsset?.stem_name) {
    // Try to find a part that matches the stem name
    const { data: matchingPart } = await supabase
      .from("parts")
      .select("id")
      .eq("arrangement_id", arrangementId)
      .ilike("instrument_name", `%${audioAsset.stem_name}%`)
      .limit(1)
      .single();

    partId = matchingPart?.id ?? null;
  }

  // If no matching part found, try to find any part for this arrangement
  if (!partId) {
    const { data: anyPart } = await supabase
      .from("parts")
      .select("id")
      .eq("arrangement_id", arrangementId)
      .order("display_order", { ascending: true })
      .limit(1)
      .single();

    partId = anyPart?.id ?? null;
  }

  const result: Record<string, unknown> = {
    musicXmlStorageObjectId: xmlStorageObjectId,
    noteEventsCount: noteEvents.length,
  };

  // Create SheetMusicAsset if we found a matching part
  if (partId) {
    // Get next version
    const { data: existingSheets } = await supabase
      .from("sheet_music_assets")
      .select("version_num")
      .eq("part_id", partId)
      .eq("file_type", "musicxml")
      .order("version_num", { ascending: false })
      .limit(1);

    const nextVersion =
      ((existingSheets?.[0]?.version_num as number) ?? 0) + 1;

    // Retire existing active musicxml for this part
    await supabase
      .from("sheet_music_assets")
      .update({ is_active: false, status: "retired" })
      .eq("part_id", partId)
      .eq("file_type", "musicxml")
      .eq("is_active", true);

    const { data: sheetAsset, error: sheetError } = await supabase
      .from("sheet_music_assets")
      .insert({
        arrangement_id: arrangementId,
        part_id: partId,
        storage_object_id: xmlStorageObjectId,
        file_type: "musicxml",
        version_num: nextVersion,
        is_active: true,
        status: "active",
        notes: "AI-generated from audio transcription",
      })
      .select("id")
      .single();

    if (sheetError) {
      console.error("Failed to create sheet music asset:", sheetError);
    } else {
      result.sheetMusicAssetId = sheetAsset.id;
      result.partId = partId;
    }
  }

  // Also upload MIDI file if available
  if (midiData) {
    const midiId = crypto.randomUUID();
    const midiKey = `bands/${bandId}/midi/${midiId}.mid`;
    await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(midiKey, midiData, { contentType: "audio/midi", upsert: false });
    result.midiStorageKey = midiKey;
  }

  return result;
}

// ─── Main Handler ───────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();

  // Verify webhook signature if secret is configured (Standard Webhooks format)
  if (REPLICATE_WEBHOOK_SECRET) {
    const webhookId = req.headers.get("webhook-id");
    const webhookTimestamp = req.headers.get("webhook-timestamp");
    const webhookSignature = req.headers.get("webhook-signature");
    const valid = await verifyWebhookSignature(body, webhookId, webhookTimestamp, webhookSignature);
    if (!valid) {
      console.error("Invalid webhook signature", { webhookId, webhookTimestamp, hasSignature: !!webhookSignature });
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
