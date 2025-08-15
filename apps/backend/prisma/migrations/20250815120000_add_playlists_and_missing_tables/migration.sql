-- CreateEnum (only if not exists)
DO $$ BEGIN
    CREATE TYPE "PlaylistVisibility" AS ENUM ('PRIVATE', 'FOLLOWERS_ONLY', 'WORKSPACE', 'PUBLIC', 'SECRET_LINK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('FOLLOW_REQUEST', 'FOLLOW_APPROVED', 'FOLLOW_REJECTED', 'COMMENT', 'LIKE', 'MENTION', 'PROJECT_INVITE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to existing tables if they don't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firebase_uid" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_workspace_id" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "workspace_id" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "filename" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "tracks" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create playlists table
CREATE TABLE IF NOT EXISTS "playlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "visibility" "PlaylistVisibility" NOT NULL DEFAULT 'PRIVATE',
    "secret_token" TEXT,
    "secret_token_created_at" TIMESTAMP(3),
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "plays_count" INTEGER NOT NULL DEFAULT 0,
    "is_collaborative" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "collection_type" TEXT NOT NULL DEFAULT 'playlist',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- Create playlist tracks table
CREATE TABLE IF NOT EXISTS "playlist_tracks" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "added_by" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("id")
);

-- Create playlist followers table
CREATE TABLE IF NOT EXISTS "playlist_followers" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "followed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_followers_pkey" PRIMARY KEY ("id")
);

-- Create playlist collaborators table
CREATE TABLE IF NOT EXISTS "playlist_collaborators" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "can_add_tracks" BOOLEAN NOT NULL DEFAULT true,
    "can_remove_tracks" BOOLEAN NOT NULL DEFAULT false,
    "can_edit_details" BOOLEAN NOT NULL DEFAULT false,
    "added_by" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_collaborators_pkey" PRIMARY KEY ("id")
);

-- Create playlist access logs table
CREATE TABLE IF NOT EXISTS "playlist_access_logs" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "user_id" TEXT,
    "access_token" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_access_logs_pkey" PRIMARY KEY ("id")
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- Create workspace members table
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- Create workspace invitations table
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "invited_by" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- Create project members table
CREATE TABLE IF NOT EXISTS "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- Create project invitations table
CREATE TABLE IF NOT EXISTS "project_invitations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "invited_by" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Update follows table to support follow approval
ALTER TABLE "follows" ADD COLUMN IF NOT EXISTS "status" "FollowStatus" DEFAULT 'APPROVED';

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "users_firebase_uid_key" ON "users"("firebase_uid");
CREATE UNIQUE INDEX IF NOT EXISTS "playlists_secret_token_key" ON "playlists"("secret_token");
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_tracks_playlist_id_track_id_key" ON "playlist_tracks"("playlist_id", "track_id");
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_followers_playlist_id_user_id_key" ON "playlist_followers"("playlist_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_collaborators_playlist_id_user_id_key" ON "playlist_collaborators"("playlist_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- Add indexes
CREATE INDEX IF NOT EXISTS "playlist_access_logs_playlist_id_idx" ON "playlist_access_logs"("playlist_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");

-- Add foreign key constraints (only if tables exist)
DO $$ 
BEGIN
    -- Playlist foreign keys
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlists') AND 
       EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlists') AND 
       EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workspaces') THEN
        ALTER TABLE "playlists" ADD CONSTRAINT "playlists_workspace_id_fkey" 
        FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Playlist tracks foreign keys
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlist_tracks') AND 
       EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlists') THEN
        ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_fkey" 
        FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'playlist_tracks') AND 
       EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tracks') THEN
        ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_fkey" 
        FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Add other foreign key constraints...
END $$;