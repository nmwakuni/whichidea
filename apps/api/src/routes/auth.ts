import { Hono } from 'hono';
import { db, users } from '@savegame/database';
import { eq, and } from 'drizzle-orm';
import { sendOtpSchema, verifyOtpSchema } from '@savegame/shared';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { createOTP, verifyOTP } from '../utils/otp';
import { generateTokenPair } from '../utils/jwt';
import { formatPhoneNumber } from '@savegame/shared';

const auth = new Hono();

// Send OTP
auth.post('/send-otp', validateBody(sendOtpSchema), async (c) => {
  const { phoneNumber } = c.get('validatedBody');
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Check if user exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneNumber, formattedPhone),
        eq(users.deletedAt, null)
      )
    )
    .limit(1);

  if (!existingUser) {
    throw new AppError('NOT_FOUND', 'User not found. Please contact your organization admin.', 404);
  }

  // Generate and send OTP
  const otpCode = await createOTP(formattedPhone);

  // TODO: Send SMS via AfricasTalking
  console.log(`OTP for ${formattedPhone}: ${otpCode}`);

  return c.json({
    success: true,
    data: {
      message: 'OTP sent successfully',
      phoneNumber: formattedPhone,
      // In development, return OTP (remove in production!)
      ...(process.env.NODE_ENV === 'development' && { otp: otpCode }),
    },
  });
});

// Verify OTP and login
auth.post('/verify-otp', validateBody(verifyOtpSchema), async (c) => {
  const { phoneNumber, otpCode } = c.get('validatedBody');
  const formattedPhone = formatPhoneNumber(phoneNumber);

  // Verify OTP
  const isValid = await verifyOTP(formattedPhone, otpCode);

  if (!isValid) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired OTP', 401);
  }

  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.phoneNumber, formattedPhone),
        eq(users.deletedAt, null)
      )
    )
    .limit(1);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  // Update phone verified status
  if (!user.phoneVerified) {
    await db
      .update(users)
      .set({ phoneVerified: true })
      .where(eq(users.id, user.id));
  }

  // Update last active
  await db
    .update(users)
    .set({ lastActiveAt: new Date() })
    .where(eq(users.id, user.id));

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  });

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        organizationId: user.organizationId,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    },
  });
});

// Refresh token
auth.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    throw new AppError('UNAUTHORIZED', 'Refresh token required', 401);
  }

  try {
    const { verifyToken } = await import('../utils/jwt');
    const payload = verifyToken(refreshToken);

    // Generate new tokens
    const tokens = generateTokenPair({
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    });

    return c.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
  }
});

// Get current user
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing authorization header', 401);
  }

  const token = authHeader.substring(7);
  const { verifyToken } = await import('../utils/jwt');
  const payload = verifyToken(token);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || user.deletedAt) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      organizationId: user.organizationId,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
      stats: {
        totalSaved: user.totalSaved,
        totalPoints: user.totalPoints,
        currentStreak: user.currentStreak,
        challengesCompleted: user.challengesCompleted,
      },
    },
  });
});

export default auth;
