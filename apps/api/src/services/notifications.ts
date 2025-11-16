import { db, notifications } from '@savegame/database';

const AT_API_KEY = process.env.AT_API_KEY;
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_SENDER_ID = process.env.AT_SENDER_ID || 'SAVEGAME';

/**
 * Send SMS via AfricasTalking
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  if (!AT_API_KEY) {
    console.warn('AfricasTalking API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: AT_API_KEY,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username: AT_USERNAME,
        to: phoneNumber,
        message: message,
        from: AT_SENDER_ID,
      }),
    });

    const data = await response.json();

    if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
      console.log(`SMS sent to ${phoneNumber}`);
      return true;
    } else {
      console.error('SMS failed:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTPSMS(phoneNumber: string, otp: string) {
  const message = `Your SaveGame verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return await sendSMS(phoneNumber, message);
}

/**
 * Send welcome SMS
 */
export async function sendWelcomeSMS(
  phoneNumber: string,
  firstName: string,
  organizationName: string
) {
  const message = `Welcome to ${organizationName} on SaveGame, ${firstName}! Start saving and compete with your peers. Download our app to get started.`;
  return await sendSMS(phoneNumber, message);
}

/**
 * Send transaction confirmation SMS
 */
export async function sendTransactionConfirmationSMS(
  phoneNumber: string,
  amount: number,
  balance: number
) {
  const message = `Transaction confirmed! You saved KSh ${amount.toLocaleString()}. Your total savings: KSh ${balance.toLocaleString()}. Keep it up!`;
  return await sendSMS(phoneNumber, message);
}

/**
 * Send challenge joined SMS
 */
export async function sendChallengeJoinedSMS(phoneNumber: string, challengeName: string) {
  const message = `You've joined "${challengeName}"! Start saving to climb the leaderboard. Good luck!`;
  return await sendSMS(phoneNumber, message);
}

/**
 * Send achievement unlocked SMS
 */
export async function sendAchievementUnlockedSMS(phoneNumber: string, achievementName: string) {
  const message = `🏆 Achievement Unlocked: ${achievementName}! You're doing great. Keep saving!`;
  return await sendSMS(phoneNumber, message);
}

/**
 * Send rank change SMS
 */
export async function sendRankChangeSMS(
  phoneNumber: string,
  challengeName: string,
  oldRank: number,
  newRank: number
) {
  if (newRank < oldRank) {
    const message = `You moved up to rank #${newRank} in "${challengeName}"! Keep climbing! 🚀`;
    return await sendSMS(phoneNumber, message);
  }
  return false;
}

/**
 * Create notification record in database
 */
export async function createNotification(data: {
  organizationId: string;
  userId?: string;
  type: 'sms' | 'whatsapp' | 'push' | 'email';
  title?: string;
  message: string;
  phoneNumber?: string;
  email?: string;
  challengeId?: string;
  transactionId?: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      ...data,
      status: 'pending',
    })
    .returning();

  return notification;
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: 'sent' | 'failed' | 'delivered',
  providerId?: string,
  providerResponse?: any
) {
  await db
    .update(notifications)
    .set({
      status,
      providerId,
      providerResponse,
      sentAt: status === 'sent' ? new Date() : undefined,
      deliveredAt: status === 'delivered' ? new Date() : undefined,
    })
    .where(eq(notifications.id, notificationId));
}
