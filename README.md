# RehearSync

Rehearsal management platform for bands. Organize songs, arrangements, parts, and sheet music — then run real-time rehearsal sessions with synchronized playback.

## Features

- **Band Management** — Create bands, invite members, assign roles
- **Song & Arrangement Library** — Track songs with multiple arrangements, sections, and parts
- **Sheet Music & Audio Assets** — Upload PDFs, MusicXML, and audio files with versioning
- **AI Audio Processing** — Separate stems (Demucs), generate sheet music (Basic Pitch + OpenAI), auto-detect beats for sync maps
- **Score Sync Maps** — Map audio timestamps to bar numbers for synchronized playback
- **Real-Time Rehearsal Sessions** — WebSocket-powered transport with synchronized state
- **Subscription Tiers** — Free, Band, and Agent tiers with Stripe billing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| UI | Chakra UI v3, Framer Motion |
| Auth | NextAuth.js v5 (Google OAuth) |
| Database | PostgreSQL via Prisma ORM |
| Storage | Supabase Storage |
| State | TanStack Query, Zustand |
| Payments | Stripe |
| AI/ML | Replicate (Demucs, Basic Pitch), OpenAI |
| Hosting | Vercel + Supabase |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase project)
- Supabase project for file storage

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

See `.env.example` for the full list. Key variables:

- `DATABASE_URL` / `DIRECT_DATABASE_URL` — PostgreSQL connection strings
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — Auth.js configuration
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe billing
- `REPLICATE_API_TOKEN` / `REPLICATE_WEBHOOK_SECRET` — AI audio processing
- `OPENAI_API_KEY` — Sheet music generation (MIDI → MusicXML)

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── bands/          # Band management, songs, arrangements
│   │   ├── dashboard/      # User dashboard
│   │   └── pricing/        # Subscription plans
│   ├── api/v1/             # REST API routes
│   └── (auth)/             # Login/register pages
├── hooks/                  # React hooks (useApi, useProcessingJob, etc.)
├── lib/
│   ├── api/                # API middleware, error handling, response helpers
│   ├── services/           # Business logic (band, song, audio, processing, etc.)
│   ├── subscriptions/      # Tier definitions and feature guards
│   └── validators/         # Zod schemas for request validation
├── components/             # Shared UI components
└── ws-server/              # WebSocket server for real-time sessions
supabase/
└── functions/              # Supabase Edge Functions (webhook handlers)
prisma/
├── schema.prisma           # Database schema
└── migrations/             # SQL migrations
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run ws:dev` | Start WebSocket server |

## AI Processing Pipeline

RehearSync uses Replicate and OpenAI to process audio:

1. **Stem Separation** — Demucs splits a full mix into vocals, drums, bass, and other
2. **Transcription** — Basic Pitch extracts MIDI notes, OpenAI converts to MusicXML
3. **Beat Detection** — Note onsets are analyzed to estimate tempo and generate bar-level sync maps

Processing runs asynchronously via Replicate webhooks handled by a Supabase Edge Function, keeping Vercel serverless functions within timeout limits.

## License

Private — All rights reserved.
