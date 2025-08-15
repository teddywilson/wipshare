/*
  Warnings:

  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/

-- First, populate usernames for existing users without usernames
-- Generate temporary usernames from email addresses
UPDATE "users" 
SET "username" = LOWER(CONCAT(
  REPLACE(REPLACE(REPLACE(SPLIT_PART("email", '@', 1), '.', ''), '-', ''), '+', ''),
  '_',
  SUBSTRING(MD5("id"), 1, 4)
))
WHERE "username" IS NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
