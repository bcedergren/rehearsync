import { prisma } from "@/lib/prisma";
import { CreateSessionInput, JoinSessionInput } from "@/lib/validators/session";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

export async function createSession(
  bandId: string,
  memberId: string,
  data: CreateSessionInput
) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.rehearsalSession.create({
      data: {
        bandId,
        arrangementId: data.arrangementId,
        leaderMemberId: data.leaderMemberId || memberId,
      },
    });

    await tx.transportState.create({
      data: {
        sessionId: session.id,
        arrangementId: data.arrangementId,
        status: "stopped",
        positionMs: 0,
      },
    });

    return session;
  });
}

export async function getSession(sessionId: string) {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    include: {
      arrangement: {
        select: { id: true, name: true, versionLabel: true, songId: true },
      },
      leader: { select: { id: true, displayName: true } },
      participants: {
        include: {
          member: { select: { id: true, displayName: true } },
          part: { select: { id: true, instrumentName: true, partName: true } },
        },
      },
      transportState: true,
    },
  });
  if (!session) throw new NotFoundError("Session", sessionId);
  return session;
}

export async function joinSession(
  sessionId: string,
  memberId: string,
  data: JoinSessionInput
) {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    include: { arrangement: true },
  });
  if (!session) throw new NotFoundError("Session", sessionId);
  if (session.state === "ended") {
    throw new InvalidStateError("Cannot join an ended session");
  }

  const assignment = await prisma.arrangementMemberAssignment.findUnique({
    where: {
      arrangementId_memberId: {
        arrangementId: session.arrangementId,
        memberId,
      },
    },
  });

  return prisma.sessionParticipant.upsert({
    where: { sessionId_memberId: { sessionId, memberId } },
    create: {
      sessionId,
      memberId,
      partId: assignment?.partId,
      deviceLabel: data.deviceLabel,
      deviceType: data.deviceType,
      connectionState: "connecting",
      lastSeenAt: new Date(),
    },
    update: {
      deviceLabel: data.deviceLabel,
      deviceType: data.deviceType,
      connectionState: "connecting",
      lastSeenAt: new Date(),
    },
    include: {
      member: { select: { id: true, displayName: true } },
      part: { select: { id: true, instrumentName: true, partName: true } },
    },
  });
}

export async function leaveSession(sessionId: string, memberId: string) {
  return prisma.sessionParticipant.update({
    where: { sessionId_memberId: { sessionId, memberId } },
    data: { connectionState: "disconnected" },
  });
}

export async function setSessionReady(sessionId: string) {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
  });
  if (!session) throw new NotFoundError("Session", sessionId);
  if (session.state !== "draft") {
    throw new InvalidStateError("Session must be in draft state to mark ready");
  }

  return prisma.rehearsalSession.update({
    where: { id: sessionId },
    data: { state: "ready" },
  });
}

export async function endSession(sessionId: string) {
  return prisma.rehearsalSession.update({
    where: { id: sessionId },
    data: { state: "ended", endedAt: new Date() },
  });
}

export async function getMusicianView(sessionId: string, memberId: string) {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    include: { transportState: true },
  });
  if (!session) throw new NotFoundError("Session", sessionId);

  const assignment = await prisma.arrangementMemberAssignment.findUnique({
    where: {
      arrangementId_memberId: {
        arrangementId: session.arrangementId,
        memberId,
      },
    },
    include: { part: true },
  });

  const sheetMusic = assignment
    ? await prisma.sheetMusicAsset.findFirst({
        where: {
          arrangementId: session.arrangementId,
          partId: assignment.partId,
          isActive: true,
        },
        include: { storageObject: true },
      })
    : null;

  const audioAssets = await prisma.audioAsset.findMany({
    where: {
      arrangementId: session.arrangementId,
      isActive: true,
    },
    include: { storageObject: true },
  });

  const activeSyncMap = await prisma.syncMap.findFirst({
    where: {
      arrangementId: session.arrangementId,
      isActive: true,
    },
    include: { points: { orderBy: { barNumber: "asc" } } },
  });

  const sectionMarkers = await prisma.sectionMarker.findMany({
    where: { arrangementId: session.arrangementId },
    orderBy: { sortOrder: "asc" },
  });

  return {
    session: {
      id: session.id,
      state: session.state,
    },
    transport: session.transportState,
    assignment: assignment
      ? {
          partId: assignment.partId,
          instrumentName: assignment.part.instrumentName,
          partName: assignment.part.partName,
        }
      : null,
    sheetMusic,
    audio: audioAssets,
    syncMap: activeSyncMap,
    sections: sectionMarkers,
  };
}
