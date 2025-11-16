// Common types

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: Record<string, any>;
};

export type ApiError = {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
};

export type DateRange = {
  startDate?: string;
  endDate?: string;
};

export type SortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type SearchParams = {
  query?: string;
};

// Challenge types
export type ChallengeType = 'fixed_amount' | 'percentage_increase' | 'streak' | 'group';
export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type ParticipationStatus = 'active' | 'completed' | 'failed' | 'withdrawn';

// Transaction types
export type TransactionStatus = 'pending' | 'verified' | 'failed' | 'refunded';
export type TransactionSource = 'mpesa' | 'manual' | 'bulk_upload';

// Achievement types
export type AchievementType =
  | 'first_save'
  | 'streak'
  | 'total_saved'
  | 'challenges_completed'
  | 'rank';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

// Notification types
export type NotificationType = 'sms' | 'whatsapp' | 'push' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

// Organization types
export type OrganizationType = 'chama' | 'sacco' | 'mfi' | 'bank' | 'ngo';
export type SubscriptionTier = 'starter' | 'growth' | 'enterprise' | 'custom';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';

// User types
export type UserRole = 'super_admin' | 'org_admin' | 'member';

// Statistics
export type ChallengeStats = {
  participantsCount: number;
  totalSaved: number;
  completionRate: number;
  averageContribution: number;
};

export type UserStats = {
  totalSaved: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  challengesCompleted: number;
  badgesEarned: number;
  rank?: number;
};

export type OrganizationStats = {
  totalMembers: number;
  totalChallenges: number;
  totalSavings: number;
  activeMembers: number;
  savingsThisMonth: number;
  growthRate: number;
};

// Leaderboard
export type LeaderboardEntry = {
  userId: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  rank: number;
  previousRank?: number;
  totalSaved: number;
  totalPoints: number;
};

// Analytics
export type AnalyticsMetric = {
  label: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
};

export type ChartDataPoint = {
  date: string;
  value: number;
  label?: string;
};

// M-Pesa
export type MpesaCallback = {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: number;
  BusinessShortCode: string;
  BillRefNumber?: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: number;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
};

export type MpesaConfig = {
  paybill?: string;
  shortcode?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
};

// Branding
export type OrganizationBranding = {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

// Settings
export type OrganizationSettings = {
  allowManualTransactions: boolean;
  requireTransactionApproval: boolean;
  notificationsEnabled: boolean;
  currency: string;
};

export type UserPreferences = {
  notificationsSms: boolean;
  notificationsWhatsapp: boolean;
  notificationsEmail: boolean;
  language: string;
};
