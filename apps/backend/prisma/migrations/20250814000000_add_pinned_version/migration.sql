-- Add isPinned column to track_versions
ALTER TABLE "track_versions" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;

-- Create index on isPinned for performance
CREATE INDEX "track_versions_is_pinned_idx" ON "track_versions"("is_pinned");

-- Update the main track's version to be pinned (assuming version field on tracks table represents the pinned version)
UPDATE "track_versions" tv
SET "is_pinned" = true
FROM "tracks" t
WHERE tv."track_id" = t."id" 
  AND tv."version_number" = CAST(t."version" AS INTEGER);