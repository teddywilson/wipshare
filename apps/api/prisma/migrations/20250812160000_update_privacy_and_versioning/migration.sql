-- AlterTable
ALTER TABLE "tracks" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'private';
ALTER TABLE "tracks" ADD COLUMN "version" TEXT NOT NULL DEFAULT '001';
ALTER TABLE "tracks" ADD COLUMN "channel_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tracks" ADD COLUMN "project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update existing records to have correct visibility based on is_public
UPDATE "tracks" SET "visibility" = CASE WHEN "is_public" = true THEN 'private' ELSE 'private' END;

-- Drop the old is_public column
ALTER TABLE "tracks" DROP COLUMN "is_public";