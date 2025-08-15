-- AlterTable: Rename firebase_uid to clerk_user_id
ALTER TABLE "users" RENAME COLUMN "firebase_uid" TO "clerk_user_id";

-- RenameIndex
ALTER INDEX "users_firebase_uid_key" RENAME TO "users_clerk_user_id_key";