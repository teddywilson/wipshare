-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
