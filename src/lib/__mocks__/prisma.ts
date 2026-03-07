import { jest } from "@jest/globals";

// Deep mock factory for Prisma models
function createModelMock() {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  };
}

export const prisma = {
  band: createModelMock(),
  member: createModelMock(),
  user: createModelMock(),
  song: createModelMock(),
  arrangement: createModelMock(),
  part: createModelMock(),
  storageObject: createModelMock(),
  sheetMusicAsset: createModelMock(),
  audioAsset: createModelMock(),
  arrangementMemberAssignment: createModelMock(),
  sectionMarker: createModelMock(),
  syncMap: createModelMock(),
  syncMapPoint: createModelMock(),
  rehearsalSession: createModelMock(),
  sessionParticipant: createModelMock(),
  transportState: createModelMock(),
  transportEvent: createModelMock(),
  $transaction: jest.fn(),
};
