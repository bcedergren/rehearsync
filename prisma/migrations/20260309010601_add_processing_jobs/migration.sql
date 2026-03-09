-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "arrangement_id" TEXT NOT NULL,
    "audio_asset_id" TEXT,
    "job_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'replicate',
    "external_id" TEXT,
    "input_payload" JSONB,
    "output_payload" JSONB,
    "error_message" TEXT,
    "parent_job_id" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "processing_jobs_arrangement_id_status_idx" ON "processing_jobs"("arrangement_id", "status");

-- CreateIndex
CREATE INDEX "processing_jobs_external_id_idx" ON "processing_jobs"("external_id");

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_arrangement_id_fkey" FOREIGN KEY ("arrangement_id") REFERENCES "arrangements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "audio_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_parent_job_id_fkey" FOREIGN KEY ("parent_job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
