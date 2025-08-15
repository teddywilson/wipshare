-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "owner_id" TEXT NOT NULL,
    "personal_user_id" TEXT,
    "is_personal" BOOLEAN NOT NULL DEFAULT false,
    "billing_tier" TEXT NOT NULL DEFAULT 'free',
    "billing_cycle" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "subscription_status" TEXT,
    "subscription_end_date" TIMESTAMP(3),
    "settings" JSONB,
    "features" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "user_id" TEXT,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_usage" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "current_tracks" INTEGER NOT NULL DEFAULT 0,
    "current_projects" INTEGER NOT NULL DEFAULT 0,
    "current_members" INTEGER NOT NULL DEFAULT 0,
    "current_storage" BIGINT NOT NULL DEFAULT 0,
    "current_bandwidth" BIGINT NOT NULL DEFAULT 0,
    "total_tracks" INTEGER NOT NULL DEFAULT 0,
    "total_projects" INTEGER NOT NULL DEFAULT 0,
    "total_storage" BIGINT NOT NULL DEFAULT 0,
    "total_bandwidth" BIGINT NOT NULL DEFAULT 0,
    "period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_end" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_activity" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_billing_limits" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "max_members" INTEGER NOT NULL,
    "max_tracks" INTEGER NOT NULL,
    "max_projects" INTEGER NOT NULL,
    "max_storage_gb" INTEGER NOT NULL,
    "max_bandwidth_gb" INTEGER NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL,
    "price_yearly" DOUBLE PRECISION NOT NULL,
    "features" JSONB,

    CONSTRAINT "workspace_billing_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_personal_user_id_key" ON "workspaces"("personal_user_id");

-- CreateIndex
CREATE INDEX "workspaces_slug_idx" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_idx" ON "workspace_invitations"("email");

-- CreateIndex
CREATE INDEX "workspace_invitations_token_idx" ON "workspace_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_usage_workspace_id_key" ON "workspace_usage"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_activity_workspace_id_created_at_idx" ON "workspace_activity"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_billing_limits_tier_key" ON "workspace_billing_limits"("tier");

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_personal_user_id_fkey" FOREIGN KEY ("personal_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_usage" ADD CONSTRAINT "workspace_usage_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_activity" ADD CONSTRAINT "workspace_activity_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default billing limits
INSERT INTO "workspace_billing_limits" ("id", "tier", "max_members", "max_tracks", "max_projects", "max_storage_gb", "max_bandwidth_gb", "price_monthly", "price_yearly", "features")
VALUES 
  ('cldefault1', 'free', 1, 50, 5, 5, 10, 0, 0, '{"collaborators": false, "privateProjects": 3, "customDomain": false, "analytics": "basic", "support": "community"}'),
  ('cldefault2', 'pro', 5, 500, 50, 50, 100, 19.99, 199.99, '{"collaborators": true, "privateProjects": "unlimited", "customDomain": false, "analytics": "advanced", "support": "priority"}'),
  ('cldefault3', 'enterprise', 100, 10000, 1000, 1000, 10000, 99.99, 999.99, '{"collaborators": true, "privateProjects": "unlimited", "customDomain": true, "analytics": "enterprise", "support": "dedicated", "sso": true, "audit": true}');

-- AlterTable: Add default_workspace_id to users
ALTER TABLE "users" ADD COLUMN "default_workspace_id" TEXT;

-- AlterTable: Add workspace_id to tracks and projects as nullable first
ALTER TABLE "tracks" ADD COLUMN "workspace_id" TEXT;
ALTER TABLE "projects" ADD COLUMN "workspace_id" TEXT;

-- Create personal workspaces for existing users and migrate data
DO $$
DECLARE
    user_record RECORD;
    new_workspace_id TEXT;
    new_member_id TEXT;
    new_usage_id TEXT;
    counter INTEGER := 1;
    new_workspace_slug TEXT;
BEGIN
    FOR user_record IN SELECT id, username, email FROM users LOOP
        -- Generate IDs
        new_workspace_id := 'ws_' || substr(md5(random()::text), 1, 20);
        new_member_id := 'wm_' || substr(md5(random()::text), 1, 20);
        new_usage_id := 'wu_' || substr(md5(random()::text), 1, 20);
        
        -- Generate unique slug
        new_workspace_slug := LOWER(REPLACE(user_record.username, '_', '-')) || '-personal';
        
        -- Check if slug exists and make unique if needed
        WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = new_workspace_slug) LOOP
            new_workspace_slug := LOWER(REPLACE(user_record.username, '_', '-')) || '-personal-' || counter;
            counter := counter + 1;
        END LOOP;
        
        -- Create personal workspace for each user
        INSERT INTO workspaces (
            id, 
            name, 
            slug, 
            owner_id, 
            personal_user_id, 
            is_personal,
            billing_tier,
            created_at,
            updated_at
        ) VALUES (
            new_workspace_id,
            user_record.username || '''s Workspace',
            new_workspace_slug,
            user_record.id,
            user_record.id,
            true,
            'free',
            NOW(),
            NOW()
        );
        
        -- Add user as owner of their personal workspace
        INSERT INTO workspace_members (
            id,
            workspace_id,
            user_id,
            role,
            joined_at,
            last_active
        ) VALUES (
            new_member_id,
            new_workspace_id,
            user_record.id,
            'OWNER',
            NOW(),
            NOW()
        );
        
        -- Initialize workspace usage
        INSERT INTO workspace_usage (
            id,
            workspace_id,
            period_end,
            updated_at
        ) VALUES (
            new_usage_id,
            new_workspace_id,
            NOW() + INTERVAL '30 days',
            NOW()
        );
        
        -- Update user's default workspace
        UPDATE users 
        SET default_workspace_id = new_workspace_id 
        WHERE id = user_record.id;
        
        -- Update all tracks for this user to belong to their personal workspace
        UPDATE tracks 
        SET workspace_id = new_workspace_id 
        WHERE user_id = user_record.id;
        
        -- Update all projects for this user to belong to their personal workspace
        UPDATE projects 
        SET workspace_id = new_workspace_id 
        WHERE user_id = user_record.id;
        
        -- Update workspace usage with current counts
        UPDATE workspace_usage wu
        SET 
            current_tracks = (SELECT COUNT(*) FROM tracks WHERE tracks.workspace_id = wu.workspace_id),
            current_projects = (SELECT COUNT(*) FROM projects WHERE projects.workspace_id = wu.workspace_id),
            current_members = 1,
            total_tracks = (SELECT COUNT(*) FROM tracks WHERE tracks.workspace_id = wu.workspace_id),
            total_projects = (SELECT COUNT(*) FROM projects WHERE projects.workspace_id = wu.workspace_id)
        WHERE wu.workspace_id = new_workspace_id;
        
    END LOOP;
END $$;

-- Now make workspace_id required
ALTER TABLE "tracks" ALTER COLUMN "workspace_id" SET NOT NULL;
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;

-- CreateIndex for workspace_id
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");
CREATE INDEX "tracks_workspace_id_idx" ON "tracks"("workspace_id");

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;