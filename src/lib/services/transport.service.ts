import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

async function getActiveSession(sessionId: string) {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    include: { transportState: true },
  });
  if (!session) throw new NotFoundError("Session", sessionId);
  if (session.state === "ended") {
    throw new InvalidStateError("Session has ended");
  }
  return session;
}

async function logTransportEvent(
  sessionId: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
  memberId: string
) {
  return prisma.transportEvent.create({
    data: {
      sessionId,
      eventType,
      payload,
      createdByMemberId: memberId,
    },
  });
}

export async function play(
  sessionId: string,
  memberId: string,
  positionMs: number
) {
  const session = await getActiveSession(sessionId);

  const now = new Date();

  const transport = await prisma.transportState.update({
    where: { sessionId },
    data: {
      status: "playing",
      positionMs,
      startedAtServerTime: now,
      updatedByMemberId: memberId,
    },
  });

  if (session.state === "ready" || session.state === "draft") {
    await prisma.rehearsalSession.update({
      where: { id: sessionId },
      data: { state: "live", startedAt: session.startedAt || now },
    });
  }

  await logTransportEvent(sessionId, "play", { positionMs }, memberId);

  return transport;
}

export async function pause(
  sessionId: string,
  memberId: string,
  positionMs: number
) {
  await getActiveSession(sessionId);

  const transport = await prisma.transportState.update({
    where: { sessionId },
    data: {
      status: "paused",
      positionMs,
      startedAtServerTime: null,
      updatedByMemberId: memberId,
    },
  });

  await prisma.rehearsalSession.update({
    where: { id: sessionId },
    data: { state: "paused" },
  });

  await logTransportEvent(sessionId, "pause", { positionMs }, memberId);

  return transport;
}

export async function stop(
  sessionId: string,
  memberId: string,
  positionMs: number
) {
  await getActiveSession(sessionId);

  const transport = await prisma.transportState.update({
    where: { sessionId },
    data: {
      status: "stopped",
      positionMs,
      startedAtServerTime: null,
      currentBar: null,
      currentSectionMarkerId: null,
      updatedByMemberId: memberId,
    },
  });

  await logTransportEvent(sessionId, "stop", { positionMs }, memberId);

  return transport;
}

export async function seek(
  sessionId: string,
  memberId: string,
  positionMs: number,
  currentBar?: number,
  sectionMarkerId?: string
) {
  await getActiveSession(sessionId);

  const transport = await prisma.transportState.update({
    where: { sessionId },
    data: {
      positionMs,
      currentBar: currentBar ?? null,
      currentSectionMarkerId: sectionMarkerId ?? null,
      updatedByMemberId: memberId,
    },
  });

  await logTransportEvent(
    sessionId,
    "seek",
    { positionMs, currentBar, sectionMarkerId },
    memberId
  );

  return transport;
}

export async function jumpToSection(
  sessionId: string,
  memberId: string,
  sectionMarkerId: string
) {
  const marker = await prisma.sectionMarker.findUnique({
    where: { id: sectionMarkerId },
  });
  if (!marker) throw new NotFoundError("SectionMarker", sectionMarkerId);

  const transport = await prisma.transportState.update({
    where: { sessionId },
    data: {
      currentBar: marker.startBar,
      currentSectionMarkerId: sectionMarkerId,
      updatedByMemberId: memberId,
    },
  });

  await logTransportEvent(
    sessionId,
    "jump_section",
    { sectionMarkerId, startBar: marker.startBar },
    memberId
  );

  return transport;
}

export async function getTransportState(sessionId: string) {
  const transport = await prisma.transportState.findUnique({
    where: { sessionId },
    include: { currentSection: true },
  });
  if (!transport) throw new NotFoundError("TransportState for session", sessionId);
  return transport;
}
