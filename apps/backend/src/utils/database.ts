import { PrismaClient } from '@prisma/client';

// Log database configuration on startup
const dbUrl = process.env.DATABASE_URL || '';
console.log('🔧 [DB] Initializing Prisma Client:', {
  databaseUrl: dbUrl ? `${dbUrl.substring(0, 30)}...` : 'NOT SET',
  fullUrl: dbUrl, // LOG THE FULL URL TO SEE THE ISSUE
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
});

// Global variable for Prisma client to prevent multiple instances
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  errorFormat: 'pretty',
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});