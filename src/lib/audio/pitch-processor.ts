/**
 * Offline audio pitch shifting using SoundTouch.
 *
 * Approach: decode audio → pitch-shift all samples via SoundTouch → encode as WAV blob.
 * Tempo is handled separately via HTMLAudioElement.playbackRate, so SoundTouch only
 * handles pitch (with tempo=1), keeping duration unchanged.
 */

import { SoundTouch, SimpleFilter, WebAudioBufferSource } from "soundtouchjs";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Fetch and decode an audio URL into an AudioBuffer. */
export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

/** Pitch-shift an AudioBuffer by the given number of semitones. Returns a new AudioBuffer. */
export function pitchShiftBuffer(
  buffer: AudioBuffer,
  semitones: number
): AudioBuffer {
  if (semitones === 0) return buffer;

  const ctx = getAudioContext();
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  // SoundTouch works with interleaved stereo samples
  // Convert AudioBuffer to interleaved stereo Float32Array
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : left;
  const interleaved = new Float32Array(length * 2);
  for (let i = 0; i < length; i++) {
    interleaved[i * 2] = left[i];
    interleaved[i * 2 + 1] = right[i];
  }

  // Create a mock AudioBuffer-like object for WebAudioBufferSource
  const mockBuffer = {
    numberOfChannels: 2,
    length,
    sampleRate,
    duration: length / sampleRate,
    getChannelData(ch: number) {
      if (ch === 0) return left;
      return right;
    },
  };

  const source = new WebAudioBufferSource(mockBuffer);
  const st = new SoundTouch();
  st.pitchSemitones = semitones;
  st.tempo = 1.0;

  const filter = new SimpleFilter(source, st);

  // Extract all processed samples
  const CHUNK = 8192;
  const chunks: Float32Array[] = [];
  let totalExtracted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const chunk = new Float32Array(CHUNK * 2);
    const extracted = filter.extract(chunk, CHUNK);
    if (extracted === 0) break;
    chunks.push(chunk.subarray(0, extracted * 2));
    totalExtracted += extracted;
  }

  // Merge chunks into a single interleaved array
  const outputInterleaved = new Float32Array(totalExtracted * 2);
  let offset = 0;
  for (const chunk of chunks) {
    outputInterleaved.set(chunk, offset);
    offset += chunk.length;
  }

  // De-interleave back to AudioBuffer
  const outputBuffer = ctx.createBuffer(2, totalExtracted, sampleRate);
  const outLeft = outputBuffer.getChannelData(0);
  const outRight = outputBuffer.getChannelData(1);
  for (let i = 0; i < totalExtracted; i++) {
    outLeft[i] = outputInterleaved[i * 2];
    outRight[i] = outputInterleaved[i * 2 + 1];
  }

  return outputBuffer;
}

/** Encode an AudioBuffer as a WAV Blob. */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = length * numChannels * bytesPerSample;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit samples
  let offset = headerSize;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Cache for decoded AudioBuffers (keyed by URL) and processed blob URLs.
 * Avoids re-fetching and re-decoding when only the pitch changes.
 */
const bufferCache = new Map<string, AudioBuffer>();
const blobUrlCache = new Map<string, string>();

/** Revoke all cached blob URLs (call on cleanup). */
export function clearPitchCache() {
  blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
  blobUrlCache.clear();
  bufferCache.clear();
}

/**
 * Process pitch shift for multiple tracks.
 * Returns a map of trackId → blob URL with pitch-shifted audio.
 *
 * @param tracks - Map of trackId → signed audio URL
 * @param semitones - Number of semitones to shift
 * @param onProgress - Optional callback (0-1) for loading progress
 */
export async function processPitchShift(
  tracks: Map<string, string>,
  semitones: number,
  onProgress?: (progress: number) => void
): Promise<Map<string, string>> {
  // Revoke old blob URLs
  blobUrlCache.forEach((url) => URL.revokeObjectURL(url));
  blobUrlCache.clear();

  const result = new Map<string, string>();
  const entries = Array.from(tracks.entries());
  let completed = 0;

  for (const [trackId, url] of entries) {
    // Decode (with caching)
    let buffer = bufferCache.get(url);
    if (!buffer) {
      buffer = await decodeAudioUrl(url);
      bufferCache.set(url, buffer);
    }

    // Pitch shift
    const shifted = pitchShiftBuffer(buffer, semitones);

    // Encode to WAV blob URL
    const blob = audioBufferToWavBlob(shifted);
    const blobUrl = URL.createObjectURL(blob);
    blobUrlCache.set(trackId, blobUrl);
    result.set(trackId, blobUrl);

    completed++;
    onProgress?.(completed / entries.length);
  }

  return result;
}
