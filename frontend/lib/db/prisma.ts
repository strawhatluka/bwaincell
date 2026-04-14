/**
 * Prisma Client Singleton
 *
 * Provides a single Prisma Client instance across the application.
 * Prevents multiple instances in development (HMR handling).
 *
 * @module lib/db/prisma
 */

import { PrismaClient } from '@prisma/client';

// Extend NodeJS global type to include prisma
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Create Prisma Client instance with optional configuration
 *
 * @returns Configured Prisma Client instance
 * @throws {Error} If DATABASE_URL is not defined
 */
function createPrismaClient(): PrismaClient {
  // Validate DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  // Create Prisma Client with configuration
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

/**
 * Singleton Prisma Client instance
 *
 * In development, attaches to global to prevent multiple instances during HMR.
 * In production, creates a single instance without global attachment.
 */
const prisma = global.prisma || createPrismaClient();

// Attach to global in development to survive HMR
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

/**
 * Export Prisma Client instance
 */
export { prisma };

/**
 * Re-export PrismaClient type for type-safe usage
 */
export { PrismaClient };

/**
 * Export default for convenience
 */
export default prisma;
