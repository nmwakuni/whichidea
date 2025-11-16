import { db, otpVerifications } from '@savegame/database';
import { eq, and, gt } from 'drizzle-orm';
import { generateOTP } from '@savegame/shared';

const OTP_EXPIRES_IN_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

export async function createOTP(phoneNumber: string): Promise<string> {
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN_MINUTES * 60 * 1000);

  await db.insert(otpVerifications).values({
    phoneNumber,
    otpCode,
    expiresAt,
  });

  return otpCode;
}

export async function verifyOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
  const [otp] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phoneNumber, phoneNumber),
        eq(otpVerifications.otpCode, otpCode),
        eq(otpVerifications.verified, false),
        gt(otpVerifications.expiresAt, new Date())
      )
    )
    .orderBy(otpVerifications.createdAt)
    .limit(1);

  if (!otp) {
    return false;
  }

  // Check max attempts
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return false;
  }

  // Increment attempts
  await db
    .update(otpVerifications)
    .set({
      attempts: otp.attempts + 1,
      verified: true,
      verifiedAt: new Date(),
    })
    .where(eq(otpVerifications.id, otp.id));

  return true;
}

export async function cleanupExpiredOTPs(): Promise<void> {
  await db
    .delete(otpVerifications)
    .where(gt(new Date(), otpVerifications.expiresAt));
}
