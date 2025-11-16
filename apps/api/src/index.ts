import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Import routes
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organizations';
import userRoutes from './routes/users';
import challengeRoutes from './routes/challenges';
import transactionRoutes from './routes/transactions';
import leaderboardRoutes from './routes/leaderboard';
import achievementRoutes from './routes/achievements';
import analyticsRoutes from './routes/analytics';
import webhookRoutes from './routes/webhooks';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { requestId } from './middleware/request-id';

// Create Hono app
const app = new Hono();

// Global middleware
app.use('*', requestId());
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  })
);

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
  });
});

// API routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/organizations', organizationRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/challenges', challengeRoutes);
app.route('/api/v1/transactions', transactionRoutes);
app.route('/api/v1/leaderboard', leaderboardRoutes);
app.route('/api/v1/achievements', achievementRoutes);
app.route('/api/v1/analytics', analyticsRoutes);
app.route('/api/v1/webhooks', webhookRoutes);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    },
    404
  );
});

// Error handler (must be last)
app.onError(errorHandler);

// Start server
const port = Number(process.env.API_PORT) || 3002;

console.log(`🚀 SaveGame API starting on port ${port}...`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Server running at http://localhost:${info.port}`);
  }
);

export default app;
