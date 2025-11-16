import { z } from 'zod';

// Common validators
export const phoneNumberSchema = z.string()
  .regex(/^\+?254[17]\d{8}$/, 'Invalid Kenyan phone number')
  .transform((val) => val.startsWith('+') ? val : `+${val}`);

export const emailSchema = z.string().email();

export const otpSchema = z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits');

export const uuidSchema = z.string().uuid();

export const slugSchema = z.string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only');

// Auth validators
export const sendOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
});

export const verifyOtpSchema = z.object({
  phoneNumber: phoneNumberSchema,
  otpCode: otpSchema,
});

export const loginSchema = z.object({
  phoneNumber: phoneNumberSchema,
  password: z.string().min(8),
});

// Organization validators
export const createOrganizationSchema = z.object({
  name: z.string().min(3).max(255),
  slug: slugSchema,
  type: z.enum(['chama', 'sacco', 'mfi', 'bank', 'ngo']),
  description: z.string().optional(),
  phoneNumber: phoneNumberSchema.optional(),
  email: emailSchema.optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const organizationBrandingSchema = z.object({
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i),
});

// User validators
export const createUserSchema = z.object({
  phoneNumber: phoneNumberSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: emailSchema.optional(),
  role: z.enum(['org_admin', 'member']).default('member'),
});

export const updateUserSchema = createUserSchema.partial();

// Challenge validators
export const challengeTargetSchema = z.object({
  amount: z.number().positive().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  durationWeeks: z.number().int().positive().optional(),
  increasePercentage: z.number().positive().max(100).optional(),
  baselinePeriod: z.enum(['last_month', 'last_3_months']).optional(),
  consecutiveWeeks: z.number().int().positive().optional(),
  minAmountPerWeek: z.number().positive().optional(),
  teamSize: z.number().int().positive().optional(),
  teamTarget: z.number().positive().optional(),
});

export const createChallengeSchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  type: z.enum(['fixed_amount', 'percentage_increase', 'streak', 'group']),
  target: challengeTargetSchema,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pointsPerKes: z.number().positive().default(1),
  streakMultiplier: z.number().positive().default(1.5),
  completionBonus: z.number().int().nonnegative().default(1000),
  rules: z.object({
    minTransactionAmount: z.number().positive().optional(),
    maxParticipants: z.number().int().positive().optional(),
    allowTeams: z.boolean().optional(),
    private: z.boolean().optional(),
  }).optional(),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export const joinChallengeSchema = z.object({
  teamId: uuidSchema.optional(),
});

// Transaction validators
export const createTransactionSchema = z.object({
  amount: z.number().positive(),
  challengeId: uuidSchema.optional(),
  mpesaReceiptNumber: z.string().optional(),
  phoneNumber: phoneNumberSchema.optional(),
  notes: z.string().optional(),
});

export const mpesaCallbackSchema = z.object({
  TransactionType: z.string(),
  TransID: z.string(),
  TransTime: z.string(),
  TransAmount: z.number(),
  BusinessShortCode: z.string(),
  BillRefNumber: z.string().optional(),
  InvoiceNumber: z.string().optional(),
  OrgAccountBalance: z.number().optional(),
  ThirdPartyTransID: z.string().optional(),
  MSISDN: z.string(),
  FirstName: z.string().optional(),
  MiddleName: z.string().optional(),
  LastName: z.string().optional(),
});

// Team validators
export const createTeamSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
});

// Achievement validators
export const createAchievementSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string(),
  icon: z.string(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
  criteria: z.object({
    type: z.enum(['first_save', 'streak', 'total_saved', 'challenges_completed', 'rank']),
    minAmount: z.number().positive().optional(),
    days: z.number().int().positive().optional(),
    amount: z.number().positive().optional(),
    count: z.number().int().positive().optional(),
    position: z.number().int().positive().optional(),
    challengeId: uuidSchema.optional(),
  }),
  sortOrder: z.number().int().nonnegative().default(0),
});

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// Query filters
export const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const challengeFilterSchema = paginationSchema.extend({
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  type: z.enum(['fixed_amount', 'percentage_increase', 'streak', 'group']).optional(),
}).merge(dateRangeSchema);

export const transactionFilterSchema = paginationSchema.extend({
  status: z.enum(['pending', 'verified', 'failed', 'refunded']).optional(),
  challengeId: uuidSchema.optional(),
}).merge(dateRangeSchema);
