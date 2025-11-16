// App constants

export const APP_NAME = 'SaveGame';
export const APP_DESCRIPTION = 'White-label savings gamification platform';

// Auth
export const JWT_EXPIRES_IN = '7d';
export const JWT_REFRESH_EXPIRES_IN = '30d';
export const OTP_EXPIRES_IN_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 3;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Currency
export const DEFAULT_CURRENCY = 'KES';
export const CURRENCY_SYMBOL: Record<string, string> = {
  KES: 'KSh',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// Points
export const DEFAULT_POINTS_PER_KES = 1;
export const DEFAULT_STREAK_MULTIPLIER = 1.5;
export const DEFAULT_COMPLETION_BONUS = 1000;

// Challenges
export const MIN_CHALLENGE_DURATION_DAYS = 7;
export const MAX_CHALLENGE_DURATION_DAYS = 365;
export const MIN_TRANSACTION_AMOUNT = 100;

// Gamification
export const ACHIEVEMENT_TYPES = {
  FIRST_SAVE: 'first_save',
  STREAK: 'streak',
  TOTAL_SAVED: 'total_saved',
  CHALLENGES_COMPLETED: 'challenges_completed',
  RANK: 'rank',
} as const;

export const BADGE_RARITY_POINTS: Record<string, number> = {
  common: 100,
  rare: 250,
  epic: 500,
  legendary: 1000,
};

// Notifications
export const NOTIFICATION_TEMPLATES = {
  WELCOME: 'welcome',
  CHALLENGE_JOINED: 'challenge_joined',
  TRANSACTION_CONFIRMED: 'transaction_confirmed',
  DAILY_PROGRESS: 'daily_progress',
  CHALLENGE_COMPLETED: 'challenge_completed',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  RANK_CHANGED: 'rank_changed',
} as const;

// API
export const API_VERSION = 'v1';
export const API_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
export const API_RATE_LIMIT_MAX_REQUESTS = 100;

// Subscription tiers
export const SUBSCRIPTION_LIMITS = {
  starter: {
    maxMembers: 100,
    maxChallenges: 10,
    price: 200,
  },
  growth: {
    maxMembers: 500,
    maxChallenges: 50,
    price: 500,
  },
  enterprise: {
    maxMembers: Infinity,
    maxChallenges: Infinity,
    price: 2000,
  },
} as const;

// M-Pesa
export const MPESA_ENVIRONMENTS = {
  SANDBOX: 'sandbox',
  PRODUCTION: 'production',
} as const;

export const MPESA_COMMAND_IDS = {
  TRANSACTION_STATUS_QUERY: 'TransactionStatusQuery',
  ACCOUNT_BALANCE: 'AccountBalance',
  CUSTOMER_PAYBILL: 'CustomerPayBillOnline',
} as const;

// Date formats
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// File uploads
export const MAX_UPLOAD_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;
