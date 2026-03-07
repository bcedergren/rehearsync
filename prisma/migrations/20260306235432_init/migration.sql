-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "bands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'musician',
    "default_instrument" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "songs" (
    "id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "notes" TEXT,
    "default_bpm" DECIMAL,
    "created_by_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrangements" (
    "id" TEXT NOT NULL,
    "song_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version_label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_by_member_id" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arrangements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "instrument_name" TEXT NOT NULL,
    "part_name" TEXT,
    "transposition" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_objects" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT,
    "uploaded_by_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheet_music_assets" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "storage_object_id" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "version_num" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheet_music_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_assets" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "storage_object_id" TEXT NOT NULL,
    "asset_role" TEXT NOT NULL,
    "stem_name" TEXT,
    "channel_mode" TEXT,
    "duration_ms" INTEGER,
    "sample_rate_hz" INTEGER,
    "version_num" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrangement_member_assignments" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "part_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arrangement_member_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_markers" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_bar" INTEGER NOT NULL,
    "end_bar" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "section_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_maps" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "audio_asset_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "version_num" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_map_points" (
    "id" TEXT NOT NULL,
    "sync_map_id" TEXT NOT NULL,
    "time_ms" INTEGER NOT NULL,
    "bar_number" INTEGER NOT NULL,
    "beat_number" INTEGER,
    "tick_offset" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_map_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehearsal_sessions" (
    "id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "leader_member_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rehearsal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_participants" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "part_id" TEXT,
    "device_label" TEXT,
    "device_type" TEXT,
    "connection_state" TEXT NOT NULL DEFAULT 'connecting',
    "last_seen_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_states" (
    "session_id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'stopped',
    "position_ms" INTEGER NOT NULL DEFAULT 0,
    "current_bar" INTEGER,
    "current_section_marker_id" TEXT,
    "started_at_server_time" TIMESTAMP(3),
    "updated_by_member_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_states_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "transport_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_by_member_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "members_band_id_email_key" ON "members"("band_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "members_band_id_user_id_key" ON "members"("band_id", "user_id");

-- CreateIndex
CREATE INDEX "songs_band_id_title_idx" ON "songs"("band_id", "title");

-- CreateIndex
CREATE INDEX "arrangements_song_id_status_idx" ON "arrangements"("song_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "arrangements_song_id_name_version_label_key" ON "arrangements"("song_id", "name", "version_label");

-- CreateIndex
CREATE INDEX "parts_arrangement_id_display_order_idx" ON "parts"("arrangement_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "parts_arrangement_id_instrument_name_part_name_key" ON "parts"("arrangement_id", "instrument_name", "part_name");

-- CreateIndex
CREATE INDEX "storage_objects_checksum_sha256_idx" ON "storage_objects"("checksum_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "storage_objects_bucket_object_key_key" ON "storage_objects"("bucket", "object_key");

-- CreateIndex
CREATE INDEX "sheet_music_assets_arrangement_id_part_id_idx" ON "sheet_music_assets"("arrangement_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "sheet_music_assets_part_id_file_type_version_num_key" ON "sheet_music_assets"("part_id", "file_type", "version_num");

-- CreateIndex
CREATE INDEX "audio_assets_arrangement_id_asset_role_idx" ON "audio_assets"("arrangement_id", "asset_role");

-- CreateIndex
CREATE UNIQUE INDEX "audio_assets_arrangement_id_asset_role_stem_name_version_nu_key" ON "audio_assets"("arrangement_id", "asset_role", "stem_name", "version_num");

-- CreateIndex
CREATE INDEX "arrangement_member_assignments_arrangement_id_part_id_idx" ON "arrangement_member_assignments"("arrangement_id", "part_id");

-- CreateIndex
CREATE UNIQUE INDEX "arrangement_member_assignments_arrangement_id_member_id_key" ON "arrangement_member_assignments"("arrangement_id", "member_id");

-- CreateIndex
CREATE INDEX "section_markers_arrangement_id_start_bar_idx" ON "section_markers"("arrangement_id", "start_bar");

-- CreateIndex
CREATE UNIQUE INDEX "section_markers_arrangement_id_sort_order_key" ON "section_markers"("arrangement_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "sync_maps_audio_asset_id_version_num_key" ON "sync_maps"("audio_asset_id", "version_num");

-- CreateIndex
CREATE INDEX "sync_map_points_sync_map_id_bar_number_idx" ON "sync_map_points"("sync_map_id", "bar_number");

-- CreateIndex
CREATE UNIQUE INDEX "sync_map_points_sync_map_id_time_ms_key" ON "sync_map_points"("sync_map_id", "time_ms");

-- CreateIndex
CREATE UNIQUE INDEX "sync_map_points_sync_map_id_bar_number_beat_number_tick_off_key" ON "sync_map_points"("sync_map_id", "bar_number", "beat_number", "tick_offset");

-- CreateIndex
CREATE INDEX "rehearsal_sessions_band_id_state_idx" ON "rehearsal_sessions"("band_id", "state");

-- CreateIndex
CREATE INDEX "session_participants_session_id_connection_state_idx" ON "session_participants"("session_id", "connection_state");

-- CreateIndex
CREATE UNIQUE INDEX "session_participants_session_id_member_id_key" ON "session_participants"("session_id", "member_id");

-- CreateIndex
CREATE INDEX "transport_events_session_id_created_at_idx" ON "transport_events"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "songs" ADD CONSTRAINT "songs_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrangements" ADD CONSTRAINT "arrangements_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrangements" ADD CONSTRAINT "arrangements_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parts" ADD CONSTRAINT "parts_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_uploaded_by_member_id_fkey" FOREIGN KEY ("uploaded_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_music_assets" ADD CONSTRAINT "sheet_music_assets_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_music_assets" ADD CONSTRAINT "sheet_music_assets_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_music_assets" ADD CONSTRAINT "sheet_music_assets_storage_object_id_fkey" FOREIGN KEY ("storage_object_id") REFERENCES "storage_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_assets" ADD CONSTRAINT "audio_assets_storage_object_id_fkey" FOREIGN KEY ("storage_object_id") REFERENCES "storage_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrangement_member_assignments" ADD CONSTRAINT "arrangement_member_assignments_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrangement_member_assignments" ADD CONSTRAINT "arrangement_member_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrangement_member_assignments" ADD CONSTRAINT "arrangement_member_assignments_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_markers" ADD CONSTRAINT "section_markers_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_maps" ADD CONSTRAINT "sync_maps_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_maps" ADD CONSTRAINT "sync_maps_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "audio_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_maps" ADD CONSTRAINT "sync_maps_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_map_points" ADD CONSTRAINT "sync_map_points_sync_map_id_fkey" FOREIGN KEY ("sync_map_id") REFERENCES "sync_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehearsal_sessions" ADD CONSTRAINT "rehearsal_sessions_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehearsal_sessions" ADD CONSTRAINT "rehearsal_sessions_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehearsal_sessions" ADD CONSTRAINT "rehearsal_sessions_leader_member_id_fkey" FOREIGN KEY ("leader_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rehearsal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_states" ADD CONSTRAINT "transport_states_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rehearsal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_states" ADD CONSTRAINT "transport_states_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_states" ADD CONSTRAINT "transport_states_current_section_marker_id_fkey" FOREIGN KEY ("current_section_marker_id") REFERENCES "section_markers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_states" ADD CONSTRAINT "transport_states_updated_by_member_id_fkey" FOREIGN KEY ("updated_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rehearsal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_events" ADD CONSTRAINT "transport_events_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
