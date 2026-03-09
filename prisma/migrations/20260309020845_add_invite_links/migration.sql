-- CreateTable
CREATE TABLE "invite_links" (
    "id" TEXT NOT NULL,
    "band_id" TEXT NOT NULL,
    "session_id" TEXT,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_by_member_id" TEXT NOT NULL,
    "default_role" TEXT NOT NULL DEFAULT 'musician',
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invite_links_code_key" ON "invite_links"("code");

-- CreateIndex
CREATE INDEX "invite_links_band_id_type_idx" ON "invite_links"("band_id", "type");

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_band_id_fkey" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "rehearsal_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_links" ADD CONSTRAINT "invite_links_created_by_member_id_fkey" FOREIGN KEY ("created_by_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
