import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { authRouter } from './routes/auth';
import { tracksRouter } from './routes/tracks';
import { usersRouter } from './routes/users';
import { usageRouter } from './routes/usage';
import { notificationsRouter } from './routes/notifications';
import { projectsRouter } from './routes/projects';
import projectMembersRouter from './routes/projectMembers';
import workspaceRoutes from './routes/workspaceRoutes';
import playlistsRouter from './routes/playlists';
import { uploadRouter } from './routes/upload';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';

// Load environment variables (prefer .env.local for local dev)
try {
  const envLocalPath = path.resolve(__dirname, '..', '.env.local');
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('Loaded environment from .env.local');
  } else {
    dotenv.config();
  }
} catch {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3001;

// Log deployment version for debugging
console.log('Backend started - Deployment:', process.env.DEPLOYMENT_VERSION || 'v2-fixed', 'at', new Date().toISOString());
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  CORS_ORIGIN: process.env.CORS_ORIGIN
});

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOriginEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5175';
// Parse comma-separated origins from environment variable
const corsOrigins = corsOriginEnv.split(',').map(origin => origin.trim()).filter(Boolean);
const allowedOrigins = [
  ...corsOrigins,
  // Also allow firebaseapp.com domain variants
  ...corsOrigins.map(origin => origin.replace('.web.app', '.firebaseapp.com')),
  // Allow staging custom domain
  'https://staging.wipshare.com',
  // Allow Firebase hosting domains
  'https://wipshare-frontend-stg.web.app',
  'https://wipshare-frontend-stg.firebaseapp.com',
  'http://localhost:5175',
  // Temporary: Allow local network access
  'http://192.168.1.189:5175',
  'http://localhost:5174',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing - increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/users', usersRouter);
app.use('/api/usage', usageRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects', projectMembersRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api', workspaceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WipShare API running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

export default app;