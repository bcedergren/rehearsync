-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscribed_at" TIMESTAMP(3),
ADD COLUMN     "subscription_ends_at" TIMESTAMP(3),
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';
