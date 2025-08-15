-- AlterTable
ALTER TABLE "track_versions" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "waveform_data" JSONB;
