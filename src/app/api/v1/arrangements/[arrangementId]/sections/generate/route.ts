import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { requireFeature } from "@/lib/subscriptions/guards";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/supabase-storage";

export const maxDuration = 30;

// Section generation is part of the automated post-upload setup flow,
// so it is NOT gated by checkFreeTierLock.
export const POST = withAuth(async (_req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowSectionMarkers");

  const arrangementId = params.arrangementId;

  // Fetch arrangement with MusicXML assets, audio, sync maps, and processing jobs
  const arrangement = await prisma.arrangement.findUnique({
    where: { id: arrangementId },
    include: {
      song: { select: { title: true } },
      sheetMusicAssets: {
        where: { isActive: true, fileType: "musicxml" },
        include: {
          storageObject: { select: { bucket: true, objectKey: true } },
          part: { select: { instrumentName: true } },
        },
        take: 1,
      },
      audioAssets: {
        where: { isActive: true, assetRole: "full_mix" },
        select: { durationMs: true },
        take: 1,
      },
      syncMaps: {
        where: { isActive: true },
        include: {
          points: {
            orderBy: { barNumber: "desc" },
            take: 1,
            select: { barNumber: true },
          },
        },
        take: 1,
      },
      sectionMarkers: { select: { id: true } },
    },
  });

  if (!arrangement) {
    return response.notFound("Arrangement not found");
  }

  // Gather context for the AI
  const songTitle = arrangement.song.title;
  const durationMs = arrangement.audioAssets[0]?.durationMs;
  const totalBars = arrangement.syncMaps[0]?.points[0]?.barNumber;

  // Get BPM from the most recent completed beat_detection job
  const beatJob = await prisma.processingJob.findFirst({
    where: { arrangementId, jobType: "beat_detection", status: "completed" },
    orderBy: { completedAt: "desc" },
    select: { outputPayload: true },
  });
  const bpm = (beatJob?.outputPayload as Record<string, unknown>)?.estimatedBpm as number | undefined;

  // Try to get MusicXML content for richer analysis
  let musicXmlSnippet: string | null = null;
  const xmlAsset = arrangement.sheetMusicAssets[0];
  if (xmlAsset) {
    try {
      const url = await createSignedDownloadUrl(
        xmlAsset.storageObject.bucket,
        xmlAsset.storageObject.objectKey,
        300
      );
      const res = await fetch(url);
      if (res.ok) {
        const fullXml = await res.text();
        // Truncate to first ~8000 chars to stay within token limits
        musicXmlSnippet = fullXml.slice(0, 8000);
      }
    } catch {
      // Non-critical — we can still generate sections without MusicXML
    }
  }

  if (!totalBars && !durationMs && !musicXmlSnippet) {
    return response.error(
      "insufficient_data",
      "Need at least a sync map, audio duration, or sheet music to generate sections. Run beat detection or transcription first.",
      400
    );
  }

  // Build the prompt
  const contextParts: string[] = [];
  if (songTitle) contextParts.push(`Song title: "${songTitle}"`);
  if (bpm) contextParts.push(`Tempo: ${bpm} BPM`);
  if (totalBars) contextParts.push(`Total bars: ${totalBars}`);
  if (durationMs) contextParts.push(`Duration: ${Math.round(durationMs / 1000)}s`);
  if (musicXmlSnippet) {
    contextParts.push(`MusicXML excerpt (first part):\n${musicXmlSnippet}`);
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return response.error("config_error", "OPENAI_API_KEY not configured", 500);
  }

  const openaiResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a music arrangement analyst. Given information about a song, identify its structural sections (Intro, Verse, Chorus, Bridge, Solo, Outro, etc.).

Rules:
- Return ONLY a valid JSON array of objects with: { "name": string, "startBar": number, "endBar": number }
- Sections must cover the entire song without gaps or overlaps
- startBar of first section must be 1
- endBar of one section should be startBar-1 of the next section
- Use standard section names (Intro, Verse 1, Verse 2, Pre-Chorus, Chorus, Bridge, Solo, Interlude, Outro, etc.)
- If MusicXML is provided, analyze note patterns, repetitions, dynamics, and key changes to identify sections
- If only bar count and BPM are available, estimate typical section lengths for the genre
- No markdown, no explanation — just the JSON array`,
          },
          {
            role: "user",
            content: `Analyze this song and return section markers as JSON:\n\n${contextParts.join("\n")}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    }
  );

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    return response.error(
      "ai_error",
      `OpenAI API error: ${openaiResponse.status}`,
      500,
      { detail: errText }
    );
  }

  const openaiResult = await openaiResponse.json();
  const content = openaiResult.choices?.[0]?.message?.content?.trim() ?? "";

  // Parse the JSON response — strip markdown fences if present
  let sections: { name: string; startBar: number; endBar: number }[];
  try {
    const jsonStr = content.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
    sections = JSON.parse(jsonStr);
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error("Empty sections array");
    }
  } catch {
    return response.error(
      "ai_parse_error",
      "Failed to parse AI response as section markers",
      500,
      { rawResponse: content }
    );
  }

  // Delete existing sections if any, then create new ones
  if (arrangement.sectionMarkers.length > 0) {
    await prisma.sectionMarker.deleteMany({
      where: { arrangementId },
    });
  }

  const created = await prisma.$transaction(
    sections.map((s, i) =>
      prisma.sectionMarker.create({
        data: {
          arrangementId,
          name: s.name,
          startBar: s.startBar,
          endBar: s.endBar,
          sortOrder: i + 1,
        },
      })
    )
  );

  return response.ok(created);
});
