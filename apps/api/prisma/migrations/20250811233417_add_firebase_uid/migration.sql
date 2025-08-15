-- AlterTable
ALTER TABLE "users" ADD COLUMN "firebase_uid" TEXT;

-- CreateUniqueIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");