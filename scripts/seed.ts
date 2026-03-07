import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a test user
  const passwordHash = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "leader@rehearsync.test" },
    update: {},
    create: {
      email: "leader@rehearsync.test",
      name: "Band Leader",
      passwordHash,
    },
  });

  // Create a band
  const band = await prisma.band.create({
    data: { name: "Demo Band" },
  });

  // Add the user as leader
  const leader = await prisma.member.create({
    data: {
      bandId: band.id,
      userId: user.id,
      email: user.email!,
      displayName: "Band Leader",
      role: "leader",
      defaultInstrument: "Guitar",
    },
  });

  // Create musician users
  const musicianUser1 = await prisma.user.upsert({
    where: { email: "bass@rehearsync.test" },
    update: {},
    create: {
      email: "bass@rehearsync.test",
      name: "Bass Player",
      passwordHash,
    },
  });

  const musicianUser2 = await prisma.user.upsert({
    where: { email: "drums@rehearsync.test" },
    update: {},
    create: {
      email: "drums@rehearsync.test",
      name: "Drummer",
      passwordHash,
    },
  });

  await prisma.member.createMany({
    data: [
      {
        bandId: band.id,
        userId: musicianUser1.id,
        email: "bass@rehearsync.test",
        displayName: "Bass Player",
        role: "musician",
        defaultInstrument: "Bass",
      },
      {
        bandId: band.id,
        userId: musicianUser2.id,
        email: "drums@rehearsync.test",
        displayName: "Drummer",
        role: "musician",
        defaultInstrument: "Drums",
      },
    ],
  });

  // Create a song
  const song = await prisma.song.create({
    data: {
      bandId: band.id,
      title: "Demo Song",
      artist: "Demo Band",
      defaultBpm: 120,
      createdByMemberId: leader.id,
    },
  });

  // Create an arrangement
  const arrangement = await prisma.arrangement.create({
    data: {
      songId: song.id,
      name: "Main Arrangement",
      versionLabel: "v1",
      createdByMemberId: leader.id,
    },
  });

  // Create parts
  await prisma.part.createMany({
    data: [
      {
        arrangementId: arrangement.id,
        instrumentName: "Electric Guitar",
        partName: "Lead",
        displayOrder: 1,
        isRequired: true,
      },
      {
        arrangementId: arrangement.id,
        instrumentName: "Bass",
        displayOrder: 2,
        isRequired: true,
      },
      {
        arrangementId: arrangement.id,
        instrumentName: "Drums",
        displayOrder: 3,
        isRequired: true,
      },
    ],
  });

  // Create section markers
  await prisma.sectionMarker.createMany({
    data: [
      {
        arrangementId: arrangement.id,
        name: "Intro",
        startBar: 1,
        endBar: 8,
        sortOrder: 1,
      },
      {
        arrangementId: arrangement.id,
        name: "Verse 1",
        startBar: 9,
        endBar: 24,
        sortOrder: 2,
      },
      {
        arrangementId: arrangement.id,
        name: "Chorus",
        startBar: 25,
        endBar: 40,
        sortOrder: 3,
      },
    ],
  });

  console.log("Seed complete!");
  console.log(`  Band: ${band.name} (${band.id})`);
  console.log(`  Song: ${song.title} (${song.id})`);
  console.log(`  Arrangement: ${arrangement.name} (${arrangement.id})`);
  console.log("  Login: leader@rehearsync.test / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
