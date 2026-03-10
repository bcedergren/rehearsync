// Supabase Edge Function — Replicate Webhook Handler
// Receives callbacks from Replicate when AI predictions complete.
// Runs in Deno, uses Supabase client for DB + Storage (no Prisma).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { Midi } from "https://esm.sh/@tonejs/midi@2.0.28";

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
  output: unknown
) {
  const arrangementId = job.arrangement_id as string;
  const audioAssetId = job.audio_asset_id as string;

  // essentia-bpm returns a URL to a markdown file containing "Estimated BPM: <number>"
  const outputUrl = typeof output === "string" ? output : null;
  if (!outputUrl) {
    throw new Error("No output URL returned from essentia-bpm");
  }

  // Fetch and parse BPM from the output markdown
  const bpmResponse = await fetch(outputUrl);
  if (!bpmResponse.ok) {
    throw new Error(`Failed to fetch BPM result: ${bpmResponse.status}`);
  }
  const bpmText = await bpmResponse.text();
  const bpmMatch = bpmText.match(/Estimated BPM:\s*([\d.]+)/);
  if (!bpmMatch) {
    throw new Error(`Could not parse BPM from output: ${bpmText}`);
  }

  const estimatedBpm = Math.round(parseFloat(bpmMatch[1]));
  if (estimatedBpm < 20 || estimatedBpm > 300) {
    throw new Error(`Estimated BPM ${estimatedBpm} is outside reasonable range (20-300)`);
  }

  // Get audio duration from the database
  const { data: audioAsset } = await supabase
    .from("audio_assets")
    .select("duration_ms")
    .eq("id", audioAssetId)
    .single();

  let durationMs = audioAsset?.duration_ms as number | null;

  // Fallback: if duration wasn't captured at upload, estimate from the audio file size
  // MP3 at ~192kbps ≈ 24000 bytes/sec; this is a rough estimate but sufficient for bar grid
  if (!durationMs || durationMs <= 0) {
    const { data: storageObj } = await supabase
      .from("audio_assets")
      .select("storage_objects!storage_object_id ( object_key, size_bytes )")
      .eq("id", audioAssetId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizeBytes = (storageObj as any)?.storage_objects?.size_bytes as number | null;
    if (sizeBytes && sizeBytes > 0) {
      // Rough estimate: 192kbps MP3 = 24000 bytes/sec
      durationMs = Math.round((sizeBytes / 24000) * 1000);
      console.warn(`Audio asset ${audioAssetId} missing duration_ms, estimated ${durationMs}ms from file size`);
    } else {
      throw new Error("Audio asset has no duration and file size is unknown — cannot calculate bar boundaries");
    }
  }

  // Assume 4/4 time — bar = 4 beats
  const beatDurationMs = Math.round(60000 / estimatedBpm);
  const barDurationMs = beatDurationMs * 4;
  const totalBars = Math.ceil(durationMs / barDurationMs);

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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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

// ─── MIDI → MusicXML Converter (deterministic, no LLM) ─────

const NOTE_NAMES = ["C", "D", "D", "E", "E", "F", "G", "G", "A", "A", "B", "B"];
const NOTE_ALTERS = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

interface MidiLike {
  header: { tempos: { bpm: number }[]; timeSignatures: { timeSignature: [number, number] }[] };
  tracks: { notes: { midi: number; time: number; duration: number; velocity: number }[] }[];
}

function midiToMusicXml(midi: MidiLike): string {
  // Collect all notes across tracks
  const allNotes: { midi: number; time: number; duration: number; velocity: number }[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      allNotes.push(note);
    }
  }
  if (allNotes.length === 0) return "";
  allNotes.sort((a, b) => a.time - b.time);

  // Get tempo and time signature from MIDI header
  const bpm = midi.header.tempos?.[0]?.bpm ?? 120;
  const timeSig = midi.header.timeSignatures?.[0]?.timeSignature ?? [4, 4];
  const beatsPerMeasure = timeSig[0];
  const beatUnit = timeSig[1];

  // Divisions per quarter note (resolution for MusicXML durations)
  const divisions = 24; // supports whole, half, quarter, eighth, sixteenth, triplets
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure * (4 / beatUnit);

  // Determine clef from pitch range
  const avgPitch = allNotes.reduce((s, n) => s + n.midi, 0) / allNotes.length;
  const clefSign = avgPitch < 60 ? "F" : "G";
  const clefLine = avgPitch < 60 ? 4 : 2;

  // Total duration
  const lastNote = allNotes[allNotes.length - 1];
  const totalDuration = lastNote.time + lastNote.duration;
  const totalMeasures = Math.max(1, Math.ceil(totalDuration / secondsPerMeasure));

  // Duration quantization table (in divisions): maps to standard note types
  const durationTable: [number, string][] = [
    [divisions * 4, "whole"],
    [divisions * 3, "half"],       // dotted half
    [divisions * 2, "half"],
    [divisions * 1.5, "quarter"],  // dotted quarter
    [divisions, "quarter"],
    [divisions * 0.75, "eighth"],  // dotted eighth
    [divisions / 2, "eighth"],
    [divisions / 4, "16th"],
  ];

  function quantizeDuration(durationDivs: number): { dur: number; type: string; dot: boolean } {
    for (const [d, t] of durationTable) {
      if (durationDivs >= d * 0.8) {
        const isDotted = t === "half" && durationDivs >= divisions * 2.5
          || t === "quarter" && durationDivs >= divisions * 1.25
          || t === "eighth" && durationDivs >= divisions * 0.625;
        const actualDur = isDotted ? Math.round(d * 1.5) : d;
        return { dur: Math.round(actualDur), type: t, dot: !!isDotted };
      }
    }
    return { dur: Math.round(divisions / 4), type: "16th", dot: false };
  }

  function midiToPitch(m: number) {
    const octave = Math.floor(m / 12) - 1;
    const pc = m % 12;
    return { step: NOTE_NAMES[pc], alter: NOTE_ALTERS[pc], octave };
  }

  // Bucket notes into measures
  const measures: typeof allNotes[] = Array.from({ length: totalMeasures }, () => []);
  for (const note of allNotes) {
    const measureIdx = Math.min(Math.floor(note.time / secondsPerMeasure), totalMeasures - 1);
    measures[measureIdx].push(note);
  }

  // Build MusicXML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Music</part-name></score-part>
  </part-list>
  <part id="P1">`;

  for (let m = 0; m < totalMeasures; m++) {
    xml += `\n    <measure number="${m + 1}">`;

    // Attributes on first measure
    if (m === 0) {
      xml += `
      <attributes>
        <divisions>${divisions}</divisions>
        <time><beats>${beatsPerMeasure}</beats><beat-type>${beatUnit}</beat-type></time>
        <clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>
      </attributes>`;
      if (m === 0) {
        xml += `\n      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(bpm)}</per-minute></metronome></direction-type></direction>`;
      }
    }

    const measureStart = m * secondsPerMeasure;
    const measureDivisions = divisions * beatsPerMeasure * (4 / beatUnit);
    const notes = measures[m];

    if (notes.length === 0) {
      // Full-measure rest
      xml += `\n      <note><rest/><duration>${Math.round(measureDivisions)}</duration><type>whole</type></note>`;
    } else {
      let cursor = 0; // current position in divisions from measure start
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteStartDiv = Math.round(((note.time - measureStart) / secondsPerBeat) * divisions);

        // Insert rest if there's a gap
        if (noteStartDiv > cursor + 1) {
          const restDur = noteStartDiv - cursor;
          xml += `\n      <note><rest/><duration>${restDur}</duration></note>`;
          cursor = noteStartDiv;
        } else if (noteStartDiv > cursor) {
          cursor = noteStartDiv;
        }

        const rawDurDiv = Math.round((note.duration / secondsPerBeat) * divisions);
        // Clamp to remaining measure
        const remainingInMeasure = Math.round(measureDivisions) - cursor;
        const clampedDur = Math.min(rawDurDiv, remainingInMeasure);
        const { dur, type, dot } = quantizeDuration(Math.max(1, clampedDur));
        const finalDur = Math.min(dur, remainingInMeasure);

        const pitch = midiToPitch(note.midi);

        // Check if this is a chord (same start time as previous note)
        const isChord = i > 0 && Math.abs(notes[i].time - notes[i - 1].time) < 0.02;

        xml += `\n      <note>`;
        if (isChord) xml += `<chord/>`;
        xml += `<pitch><step>${pitch.step}</step>`;
        if (pitch.alter !== 0) xml += `<alter>${pitch.alter}</alter>`;
        xml += `<octave>${pitch.octave}</octave></pitch>`;
        xml += `<duration>${finalDur}</duration><type>${type}</type>`;
        if (dot) xml += `<dot/>`;
        xml += `</note>`;

        if (!isChord) {
          cursor += finalDur;
        }
      }

      // Fill remaining measure with rest
      const remaining = Math.round(measureDivisions) - cursor;
      if (remaining > 1) {
        xml += `\n      <note><rest/><duration>${remaining}</duration></note>`;
      }
    }

    xml += `\n    </measure>`;
  }

  xml += `\n  </part>\n</score-partwise>`;
  return xml;
}

// ─── Transcription Handler (Piano Transcription → MIDI → MusicXML) ─────

async function handleTranscription(
  job: Record<string, unknown>,
  output: unknown
) {
  const arrangementId = job.arrangement_id as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bandId = (job as any).arrangements?.songs?.band_id;

  if (!bandId) {
    throw new Error("Could not determine bandId from job");
  }

  // Basic Pitch returns a single MIDI URL string
  const midiUrl = typeof output === "string"
    ? output
    : (output as Record<string, unknown>)?.midi_file as string | undefined;

  if (!midiUrl) {
    throw new Error("No MIDI file URL in transcription output");
  }

  // Download MIDI file
  const midiResponse = await fetch(midiUrl);
  if (!midiResponse.ok) {
    throw new Error(`Failed to download MIDI: ${midiResponse.status}`);
  }
  const midiData = await midiResponse.arrayBuffer();

  // Upload MIDI to Supabase Storage
  const midiId = crypto.randomUUID();
  const midiKey = `bands/${bandId}/midi/${midiId}.mid`;
  const { error: midiUploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(midiKey, midiData, { contentType: "audio/midi", upsert: false });

  if (midiUploadError) {
    throw new Error(`Failed to upload MIDI: ${midiUploadError.message}`);
  }

  // Create StorageObject for MIDI
  const midiStorageObjectId = await createStorageObject(
    STORAGE_BUCKET,
    midiKey,
    "transcription.mid",
    "audio/midi",
    midiData.byteLength
  );

  const result: Record<string, unknown> = {
    midiStorageObjectId,
    midiStorageKey: midiKey,
  };

  // Parse MIDI and convert directly to MusicXML (no LLM — deterministic conversion)
  let musicXmlContent = "";
  try {
    const midi = new Midi(new Uint8Array(midiData));
    musicXmlContent = midiToMusicXml(midi);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result.noteEventsCount = midi.tracks.reduce((sum: number, t: any) => sum + t.notes.length, 0);
  } catch (err) {
    console.error("Failed to convert MIDI to MusicXML:", err);
    result.skippedMusicXml = true;
    result.reason = `MIDI conversion failed: ${err instanceof Error ? err.message : String(err)}`;
    return result;
  }

  if (!musicXmlContent) {
    result.skippedMusicXml = true;
    result.reason = "No notes extracted from MIDI";
    return result;
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

  result.musicXmlStorageObjectId = xmlStorageObjectId;

  // Find the Part linked to this stem's audio asset (if any)
  const audioAssetId = job.audio_asset_id as string;
  const { data: audioAsset } = await supabase
    .from("audio_assets")
    .select("stem_name")
    .eq("id", audioAssetId)
    .single();

  let partId: string | null = null;

  if (audioAsset?.stem_name) {
    const { data: matchingPart } = await supabase
      .from("parts")
      .select("id")
      .eq("arrangement_id", arrangementId)
      .ilike("instrument_name", `%${audioAsset.stem_name}%`)
      .limit(1)
      .single();

    partId = matchingPart?.id ?? null;
  }

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

  // Create SheetMusicAsset if we found a matching part
  if (partId) {
    const { data: existingSheets } = await supabase
      .from("sheet_music_assets")
      .select("version_num")
      .eq("part_id", partId)
      .eq("file_type", "musicxml")
      .order("version_num", { ascending: false })
      .limit(1);

    const nextVersion =
      ((existingSheets?.[0]?.version_num as number) ?? 0) + 1;

    await supabase
      .from("sheet_music_assets")
      .update({ is_active: false, status: "retired" })
      .eq("part_id", partId)
      .eq("file_type", "musicxml")
      .eq("is_active", true);

    const { data: sheetAsset, error: sheetError } = await supabase
      .from("sheet_music_assets")
      .insert({
        id: crypto.randomUUID(),
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
  const output = payload.output as unknown;
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
