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
import { attachClerk } from './middleware/clerk-auth';

// Load environment variables
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
const PORT = process.env.PORT || 8080;

// Log startup info
console.log(`🔧 Starting WipShare API - ${process.env.NODE_ENV || 'development'} mode`);
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  CLERK_JWT_AUD: process.env.CLERK_JWT_AUD,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  R2_BUCKET: process.env.R2_BUCKET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
});

// CORS configuration - MUST come first for preflight handling
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400, // Cache preflight for 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  exposedHeaders: ['x-total-count', 'x-page', 'x-limit']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === 'production'
}));
app.use(compression());

// Clerk auth context (must come before routes using auth)
app.use(attachClerk);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Handle preflight requests quickly
app.options('*', (req, res) => {
  res.sendStatus(204);
});

// Health check endpoint (no auth required)
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.DEPLOYMENT_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
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
const server = app.listen(PORT, () => {
  console.log(`🚀 WipShare API running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${allowedOrigins[0]}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Auth: Clerk ${process.env.CLERK_SECRET_KEY ? 'configured' : 'not configured'}`);
  console.log(`📦 Storage: R2 ${process.env.R2_BUCKET || 'not configured'}`);
  console.log(`📧 Email: Resend ${process.env.RESEND_API_KEY ? 'configured' : 'not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;