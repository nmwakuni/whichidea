import { beforeAll, afterAll } from 'vitest';

// Set up test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/savegame_test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.MPESA_CONSUMER_KEY = 'test-consumer-key';
  process.env.MPESA_CONSUMER_SECRET = 'test-consumer-secret';
  process.env.MPESA_PASSKEY = 'test-passkey';
  process.env.MPESA_SHORTCODE = '174379';
  process.env.AFRICASTALKING_API_KEY = 'test-api-key';
  process.env.AFRICASTALKING_USERNAME = 'test-username';
});

afterAll(() => {
  // Clean up if needed
});
