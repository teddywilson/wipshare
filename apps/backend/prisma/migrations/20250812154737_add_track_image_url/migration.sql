/*
  Warnings:

  - Made the column `firebase_uid` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free',
ALTER COLUMN "password" SET DEFAULT '',
ALTER COLUMN "verified" SET DEFAULT true,
ALTER COLUMN "firebase_uid" SET NOT NULL;

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_tracks" INTEGER NOT NULL DEFAULT 0,
    "current_storage" BIGINT NOT NULL DEFAULT 0,
    "current_bandwidth" BIGINT NOT NULL DEFAULT 0,
    "current_plays" INTEGER NOT NULL DEFAULT 0,
    "total_tracks" INTEGER NOT NULL DEFAULT 0,
    "total_storage" BIGINT NOT NULL DEFAULT 0,
    "total_bandwidth" BIGINT NOT NULL DEFAULT 0,
    "total_plays" INTEGER NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_end" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "amount" BIGINT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tier_limits" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "max_tracks" INTEGER NOT NULL,
    "max_storage_gb" INTEGER NOT NULL,
    "max_bandwidth_gb" INTEGER NOT NULL,
    "max_track_size_mb" INTEGER NOT NULL,
    "max_track_duration" INTEGER NOT NULL,
    "features" JSONB,

    CONSTRAINT "tier_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usage_user_id_key" ON "usage"("user_id");

-- CreateIndex
CREATE INDEX "usage_logs_user_id_created_at_idx" ON "usage_logs"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tier_limits_tier_key" ON "tier_limits"("tier");

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
