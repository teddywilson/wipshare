-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "follows" ADD COLUMN     "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "responded_at" TIMESTAMP(3),
ADD COLUMN     "status" "FollowStatus" NOT NULL DEFAULT 'PENDING';
