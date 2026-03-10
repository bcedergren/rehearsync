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
        songs!song_id ( band_id, title )
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

const NOTE_NAMES = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const NOTE_ALTERS = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]; // sharps

// Guitar standard tuning: string 1 (highest) = E4(64), string 6 (lowest) = E2(40)
const GUITAR_TUNING = [64, 59, 55, 50, 45, 40]; // E4, B3, G3, D3, A2, E2
// Bass standard tuning: string 1 (highest) = G2(43), string 4 (lowest) = E1(28)
const BASS_TUNING = [43, 38, 33, 28]; // G2, D2, A1, E1

// General MIDI drum map → display position on percussion staff
// Maps MIDI note → { displayStep, displayOctave, noteheadType }
const DRUM_MAP: Record<number, { step: string; octave: number; notehead: string; name: string }> = {
  35: { step: "F", octave: 4, notehead: "normal", name: "Kick" },
  36: { step: "F", octave: 4, notehead: "normal", name: "Kick" },
  37: { step: "C", octave: 5, notehead: "x", name: "Side Stick" },
  38: { step: "C", octave: 5, notehead: "normal", name: "Snare" },
  40: { step: "C", octave: 5, notehead: "normal", name: "Snare" },
  41: { step: "A", octave: 4, notehead: "normal", name: "Floor Tom Low" },
  42: { step: "G", octave: 5, notehead: "x", name: "Hi-Hat Closed" },
  43: { step: "A", octave: 4, notehead: "normal", name: "Floor Tom Hi" },
  44: { step: "G", octave: 5, notehead: "x", name: "Hi-Hat Pedal" },
  45: { step: "E", octave: 5, notehead: "normal", name: "Low Tom" },
  46: { step: "G", octave: 5, notehead: "circle-x", name: "Hi-Hat Open" },
  47: { step: "E", octave: 5, notehead: "normal", name: "Mid Tom Low" },
  48: { step: "D", octave: 5, notehead: "normal", name: "Mid Tom Hi" },
  49: { step: "A", octave: 5, notehead: "x", name: "Crash 1" },
  50: { step: "D", octave: 5, notehead: "normal", name: "High Tom" },
  51: { step: "B", octave: 5, notehead: "x", name: "Ride" },
  52: { step: "B", octave: 5, notehead: "diamond", name: "China" },
  53: { step: "B", octave: 5, notehead: "diamond", name: "Ride Bell" },
  55: { step: "A", octave: 5, notehead: "x", name: "Splash" },
  57: { step: "A", octave: 5, notehead: "x", name: "Crash 2" },
  59: { step: "B", octave: 5, notehead: "x", name: "Ride 2" },
};

type NotationMode = "standard" | "tab" | "drums";

interface MidiLike {
  header: { tempos: { bpm: number }[]; timeSignatures: { timeSignature: [number, number] }[] };
  tracks: { notes: { midi: number; time: number; duration: number; velocity: number }[] }[];
}

function stemToNotationMode(stemName?: string | null): NotationMode {
  if (!stemName) return "standard";
  const s = stemName.toLowerCase();
  if (s === "guitar" || s === "bass") return "tab";
  if (s === "drums") return "drums";
  return "standard";
}

function midiToMusicXml(midi: MidiLike, title?: string, stemName?: string | null): string {
  const mode = stemToNotationMode(stemName);

  // Collect all notes across tracks
  const allNotes: { midi: number; time: number; duration: number; velocity: number }[] = [];
  for (const track of midi.tracks) {
    for (const note of track.notes) {
      allNotes.push(note);
    }
  }
  if (allNotes.length === 0) return "";
  allNotes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  // Get tempo and time signature from MIDI header
  const bpm = midi.header.tempos?.[0]?.bpm ?? 120;
  const timeSig = midi.header.timeSignatures?.[0]?.timeSignature ?? [4, 4];
  const beatsPerMeasure = timeSig[0];
  const beatUnit = timeSig[1];

  // Divisions per quarter note
  const divisions = 24;
  const secondsPerBeat = 60 / bpm;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure * (4 / beatUnit);
  const measureDivisions = divisions * beatsPerMeasure * (4 / beatUnit);

  // Determine clef
  let clefXml: string;
  const isBass = stemName?.toLowerCase() === "bass";
  const tuning = isBass ? BASS_TUNING : GUITAR_TUNING;
  const numStrings = tuning.length;

  if (mode === "tab") {
    clefXml = `<clef><sign>TAB</sign><line>5</line></clef>
        <staff-details>
          <staff-lines>${numStrings}</staff-lines>`;
    for (let s = 0; s < numStrings; s++) {
      const pitch = tuning[s];
      const oct = Math.floor(pitch / 12) - 1;
      const pc = pitch % 12;
      clefXml += `\n          <staff-tuning line="${numStrings - s}"><tuning-step>${NOTE_NAMES[pc]}</tuning-step>`;
      if (NOTE_ALTERS[pc] !== 0) clefXml += `<tuning-alter>${NOTE_ALTERS[pc]}</tuning-alter>`;
      clefXml += `<tuning-octave>${oct}</tuning-octave></staff-tuning>`;
    }
    clefXml += `\n        </staff-details>`;
  } else if (mode === "drums") {
    clefXml = `<clef><sign>percussion</sign></clef>`;
  } else {
    const avgPitch = allNotes.reduce((s, n) => s + n.midi, 0) / allNotes.length;
    const sign = avgPitch < 60 ? "F" : "G";
    const line = avgPitch < 60 ? 4 : 2;
    clefXml = `<clef><sign>${sign}</sign><line>${line}</line></clef>`;
  }

  // Total duration
  const lastNote = allNotes[allNotes.length - 1];
  const totalDuration = lastNote.time + lastNote.duration;
  const totalMeasures = Math.max(1, Math.ceil(totalDuration / secondsPerMeasure));

  // Map duration (in divisions) to a MusicXML note type
  function durationToType(dur: number): { type: string; dot: boolean; actualDur: number } {
    const types: [number, string][] = [
      [divisions * 4, "whole"],
      [divisions * 2, "half"],
      [divisions, "quarter"],
      [divisions / 2, "eighth"],
      [divisions / 4, "16th"],
      [divisions / 8, "32nd"],
    ];

    for (const [d, t] of types) {
      const dotted = d * 1.5;
      if (dur >= dotted - 1 && dur <= dotted + 1) {
        return { type: t, dot: true, actualDur: Math.round(dotted) };
      }
    }

    for (const [d, t] of types) {
      if (dur >= d - 1 && dur <= d + 1) {
        return { type: t, dot: false, actualDur: d };
      }
    }

    let bestType = "quarter";
    let bestDur = divisions;
    let bestDiff = Math.abs(dur - divisions);
    for (const [d, t] of types) {
      const diff = Math.abs(dur - d);
      if (diff < bestDiff) { bestDiff = diff; bestType = t; bestDur = d; }
      const dottedDiff = Math.abs(dur - d * 1.5);
      if (dottedDiff < bestDiff) { bestDiff = dottedDiff; bestType = t; bestDur = Math.round(d * 1.5); }
    }
    return { type: bestType, dot: false, actualDur: bestDur };
  }

  function splitDuration(totalDivs: number): { dur: number; type: string; dot: boolean }[] {
    const parts: { dur: number; type: string; dot: boolean }[] = [];
    let remaining = totalDivs;
    const standardDurs = [
      divisions * 6, divisions * 4, divisions * 3, divisions * 2,
      divisions * 1.5, divisions, divisions * 0.75,
      divisions / 2, divisions / 4, divisions / 8,
    ];

    while (remaining > 0) {
      let found = false;
      for (const d of standardDurs) {
        if (remaining >= d - 1) {
          const rounded = Math.round(d);
          const { type, dot } = durationToType(rounded);
          parts.push({ dur: rounded, type, dot });
          remaining -= rounded;
          found = true;
          break;
        }
      }
      if (!found) {
        if (parts.length > 0) parts[parts.length - 1].dur += Math.round(remaining);
        break;
      }
    }
    return parts;
  }

  function midiToPitch(m: number) {
    const octave = Math.floor(m / 12) - 1;
    const pc = m % 12;
    return { step: NOTE_NAMES[pc], alter: NOTE_ALTERS[pc], octave };
  }

  // Tab: find best string + fret for a MIDI note
  function midiToTab(midiNote: number): { string: number; fret: number } {
    let bestString = 1;
    let bestFret = 0;
    let bestScore = Infinity;
    for (let s = 0; s < tuning.length; s++) {
      const fret = midiNote - tuning[s];
      if (fret >= 0 && fret <= 24) {
        // Prefer lower frets on higher strings
        const score = fret + s * 0.1;
        if (score < bestScore) {
          bestScore = score;
          bestString = s + 1;
          bestFret = fret;
        }
      }
    }
    // If note is out of range, place on lowest string
    if (bestScore === Infinity) {
      bestString = tuning.length;
      bestFret = Math.max(0, midiNote - tuning[tuning.length - 1]);
    }
    return { string: bestString, fret: bestFret };
  }

  function restXml(dur: number): string {
    const parts = splitDuration(dur);
    let xml = "";
    for (const p of parts) {
      xml += `\n      <note><rest/><duration>${p.dur}</duration><type>${p.type}</type>`;
      if (p.dot) xml += `<dot/>`;
      xml += `</note>`;
    }
    return xml || `\n      <note><rest/><duration>${dur}</duration><type>quarter</type></note>`;
  }

  // Build note pitch/unpitched XML based on mode
  function notePitchXml(midiNote: number): string {
    if (mode === "drums") {
      const dm = DRUM_MAP[midiNote] || { step: "C", octave: 5, notehead: "normal", name: "Perc" };
      return `<unpitched><display-step>${dm.step}</display-step><display-octave>${dm.octave}</display-octave></unpitched>`;
    }
    const pitch = midiToPitch(midiNote);
    let xml = `<pitch><step>${pitch.step}</step>`;
    if (pitch.alter !== 0) xml += `<alter>${pitch.alter}</alter>`;
    xml += `<octave>${pitch.octave}</octave></pitch>`;
    return xml;
  }

  function noteNotationsXml(midiNote: number): string {
    if (mode === "tab") {
      const { string, fret } = midiToTab(midiNote);
      return `<notations><technical><string>${string}</string><fret>${fret}</fret></technical></notations>`;
    }
    if (mode === "drums") {
      const dm = DRUM_MAP[midiNote];
      if (dm && dm.notehead !== "normal") {
        return `<notehead>${dm.notehead}</notehead>`;
      }
    }
    return "";
  }

  // Bucket notes into measures
  const measures: typeof allNotes[] = Array.from({ length: totalMeasures }, () => []);
  for (const note of allNotes) {
    const measureIdx = Math.min(Math.floor(note.time / secondsPerMeasure), totalMeasures - 1);
    measures[measureIdx].push(note);
  }

  const scoreTitle = title || "Transcription";
  const partName = mode === "tab"
    ? (isBass ? "Bass" : "Guitar")
    : mode === "drums" ? "Drums" : "Music";

  // Build MusicXML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <movement-title>${scoreTitle}</movement-title>
  <part-list>
    <score-part id="P1"><part-name>${partName}</part-name></score-part>
  </part-list>
  <part id="P1">`;

  for (let m = 0; m < totalMeasures; m++) {
    xml += `\n    <measure number="${m + 1}">`;

    if (m === 0) {
      xml += `
      <attributes>
        <divisions>${divisions}</divisions>
        <time><beats>${beatsPerMeasure}</beats><beat-type>${beatUnit}</beat-type></time>
        ${clefXml}
      </attributes>`;
      xml += `\n      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(bpm)}</per-minute></metronome></direction-type></direction>`;
    }

    const measureStart = m * secondsPerMeasure;
    const measDiv = Math.round(measureDivisions);
    const notes = measures[m];

    if (notes.length === 0) {
      xml += `\n      <note><rest measure="yes"/><duration>${measDiv}</duration><type>whole</type></note>`;
    } else {
      let cursor = 0;
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        const noteStartDiv = Math.max(0, Math.round(((note.time - measureStart) / secondsPerBeat) * divisions));
        const isChord = i > 0 && Math.abs(notes[i].time - notes[i - 1].time) < 0.02;

        if (!isChord) {
          const gap = noteStartDiv - cursor;
          if (gap >= 2) {
            xml += restXml(gap);
            cursor = noteStartDiv;
          } else if (gap > 0) {
            cursor = noteStartDiv;
          }
        }

        const rawDurDiv = Math.max(1, Math.round((note.duration / secondsPerBeat) * divisions));
        const remainingInMeasure = measDiv - cursor;
        const clampedDur = Math.min(rawDurDiv, Math.max(1, remainingInMeasure));
        const { type, dot, actualDur } = durationToType(clampedDur);
        const finalDur = Math.min(actualDur, remainingInMeasure);

        xml += `\n      <note>`;
        if (isChord) xml += `<chord/>`;
        xml += notePitchXml(note.midi);
        xml += `<duration>${finalDur}</duration><type>${type}</type>`;
        if (dot) xml += `<dot/>`;
        xml += noteNotationsXml(note.midi);
        xml += `</note>`;

        if (!isChord) {
          cursor += finalDur;
        }
      }

      const remaining = measDiv - cursor;
      if (remaining >= 2) {
        xml += restXml(remaining);
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

  // Get the stem name early so we can select the right notation mode
  const audioAssetId = job.audio_asset_id as string;
  const { data: audioAsset } = await supabase
    .from("audio_assets")
    .select("stem_name")
    .eq("id", audioAssetId)
    .single();
  const stemName = (audioAsset?.stem_name as string | null) ?? null;

  const result: Record<string, unknown> = {
    midiStorageObjectId,
    midiStorageKey: midiKey,
  };

  // Parse MIDI and convert directly to MusicXML (no LLM — deterministic conversion)
  let musicXmlContent = "";
  try {
    const midi = new Midi(new Uint8Array(midiData));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const songTitle = (job as any).arrangements?.songs?.title as string | undefined;
    musicXmlContent = midiToMusicXml(midi, songTitle, stemName);
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
  let partId: string | null = null;

  if (stemName) {
    const { data: matchingPart } = await supabase
      .from("parts")
      .select("id")
      .eq("arrangement_id", arrangementId)
      .ilike("instrument_name", `%${stemName}%`)
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
