# WipShare Infrastructure Setup Guide

## Overview
WipShare uses a modern, scalable infrastructure with separate staging and production environments.

## Infrastructure Components

### API
- **Platform**: Render
- **Runtime**: Node.js + Express + TypeScript
- **Services**: `wipshare-api-stg`, `wipshare-api-prod`

### Database
- **Provider**: Neon Postgres
- **Databases**: `wipshare-stg`, `wipshare-prod`
- **ORM**: Prisma

### Authentication
- **Provider**: Clerk
- **Projects**: Staging and Production
- **Features**: Google OAuth, JWT tokens

### Storage
- **Provider**: Cloudflare R2
- **Buckets**: `wipshare-stg-uploads`, `wipshare-prod-uploads`
- **Access**: Presigned URLs for upload/download

### Email
- **Provider**: Resend
- **Domains**: `staging.wipshare.com`, `wipshare.com`

### Frontend
- **Platform**: Vercel
- **Framework**: Vite + React + TypeScript
- **Projects**: `wipshare-stg`, `wipshare-prod`

## Setup Instructions

### 1. Create Accounts
- [ ] Neon (https://neon.tech)
- [ ] Clerk (https://clerk.com)
- [ ] Cloudflare (https://cloudflare.com)
- [ ] Resend (https://resend.com)
- [ ] Render (https://render.com)
- [ ] Vercel (https://vercel.com)

### 2. Database Setup (Neon)
1. Create two databases or branches:
   - `wipshare-stg` (staging)
   - `wipshare-prod` (production)
2. Copy connection strings for each environment

### 3. Authentication Setup (Clerk)
1. Create two projects:
   - WipShare Staging
   - WipShare Production
2. Enable Google OAuth for both
3. Create JWT template named "backend" with custom claims
4. Copy API keys for each environment

### 4. Storage Setup (Cloudflare R2)
1. Create two buckets:
   - `wipshare-stg-uploads`
   - `wipshare-prod-uploads`
2. Configure CORS for each bucket:
   - Staging: Allow `https://staging.wipshare.com`, `http://localhost:5173`
   - Production: Allow `https://www.wipshare.com`
3. Create API tokens with read/write access

### 5. Email Setup (Resend)
1. Add domains:
   - `staging.wipshare.com`
   - `wipshare.com`
2. Configure SPF, DKIM, DMARC records
3. Create API keys for each environment

### 6. API Deployment (Render)
1. Create two web services from this repo:
   - `wipshare-api-stg` (auto-deploy from main)
   - `wipshare-api-prod` (deploy on tags)
2. Configure environment variables (see `.env` examples)
3. Set build command: `cd apps/api && npm install && npm run build`
4. Set start command: `cd apps/api && npm start`

### 7. Frontend Deployment (Vercel)
1. Create two projects:
   - `wipshare-stg`
   - `wipshare-prod`
2. Configure environment variables:
   ```
   VITE_API_BASE_URL
   VITE_CLERK_PUBLISHABLE_KEY
   VITE_CLERK_JWT_TEMPLATE=backend
   ```
3. Set framework preset to Vite
4. Configure auto-deployments

### 8. DNS Configuration
Configure your domain DNS:
- `www.wipshare.com` → Vercel (production)
- `staging.wipshare.com` → Vercel (staging)
- `api.wipshare.com` → Render (production)
- `api.staging.wipshare.com` → Render (staging)

### 9. GitHub Secrets
Add these secrets to your GitHub repository:
```
STAGING_DATABASE_URL
PRODUCTION_DATABASE_URL
RENDER_STAGING_DEPLOY_HOOK
RENDER_PRODUCTION_DEPLOY_HOOK
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_STAGING_PROJECT_ID
VERCEL_PRODUCTION_PROJECT_ID
```

## Local Development

### Setup
1. Clone the repository
2. Copy environment files:
   ```bash
   cp apps/api/.env.local.example apps/api/.env.local
   cp apps/web/.env.local.example apps/web/.env.local
   ```
3. Fill in environment variables with staging credentials
4. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
```bash
# Start both API and web
npm run dev

# Start API only
npm run dev:api

# Start web only
npm run dev:web
```

### Database Migrations
```bash
cd apps/api

# Create a new migration
npx prisma migrate dev --name <migration-name>

# Apply migrations to staging
DATABASE_URL=$STAGING_DATABASE_URL npx prisma migrate deploy

# Apply migrations to production
DATABASE_URL=$PRODUCTION_DATABASE_URL npx prisma migrate deploy
```

## Deployment

### Staging (Automatic)
Pushes to `main` branch trigger automatic deployments to staging.

### Production (Manual)
Create a git tag to deploy to production:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Or trigger manually via GitHub Actions workflow dispatch.

## Monitoring

### Health Checks
- API: `GET /healthz`
- Returns: `{ status: 'healthy', timestamp, version, environment }`

### Logs
- Render: Check service logs in Render dashboard
- Vercel: Check function logs in Vercel dashboard
- Sentry: Configure for error tracking (optional)

## Security Checklist
- [ ] Rotate API keys quarterly
- [ ] Use exact-origin CORS (no wildcards)
- [ ] Enable HSTS headers
- [ ] Keep environments isolated
- [ ] Regular dependency updates
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints