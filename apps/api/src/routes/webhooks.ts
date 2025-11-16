import { Hono } from 'hono';
import { db, transactions, users } from '@savegame/database';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../middleware/error-handler';
import { mpesaCallbackSchema } from '@savegame/shared';

const webhookRoutes = new Hono();

// M-Pesa callback (no auth - uses API signature verification)
webhookRoutes.post('/mpesa', async (c) => {
  try {
    const body = await c.req.json();

    // Log the callback for debugging
    console.log('M-Pesa Callback:', JSON.stringify(body, null, 2));

    // Extract callback data
    const { Body } = body;
    const { stkCallback } = Body || {};

    if (!stkCallback) {
      throw new AppError('VALIDATION_ERROR', 'Invalid M-Pesa callback format', 400);
    }

    const { ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // ResultCode 0 means success
    if (ResultCode !== 0) {
      console.log('M-Pesa transaction failed:', ResultDesc);
      return c.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    // Extract transaction details
    const metadata = CallbackMetadata?.Item || [];
    const getMetadataValue = (name: string) => {
      const item = metadata.find((i: any) => i.Name === name);
      return item?.Value;
    };

    const amount = getMetadataValue('Amount');
    const mpesaReceiptNumber = getMetadataValue('MpesaReceiptNumber');
    const transactionDate = getMetadataValue('TransactionDate');
    const phoneNumber = getMetadataValue('PhoneNumber');

    if (!amount || !mpesaReceiptNumber || !phoneNumber) {
      throw new AppError('VALIDATION_ERROR', 'Missing required transaction data', 400);
    }

    // Find user by phone number
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, `+${phoneNumber}`))
      .limit(1);

    if (!user) {
      console.log('User not found for phone:', phoneNumber);
      return c.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    // Check if transaction already exists
    const [existingTx] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.mpesaReceiptNumber, mpesaReceiptNumber))
      .limit(1);

    if (existingTx) {
      console.log('Transaction already recorded:', mpesaReceiptNumber);
      return c.json({ ResultCode: 0, ResultDesc: 'Callback received' });
    }

    // Create transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        organizationId: user.organizationId,
        userId: user.id,
        amount: amount.toString(),
        currency: 'KES',
        mpesaReceiptNumber,
        phoneNumber: `+${phoneNumber}`,
        status: 'verified',
        verifiedAt: new Date(),
        source: 'mpesa',
        metadata: body,
        transactionDate: transactionDate
          ? new Date(
              transactionDate.toString().replace(
                /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
                '$1-$2-$3T$4:$5:$6'
              )
            )
          : new Date(),
      })
      .returning();

    console.log('Transaction created:', newTransaction.id);

    // Process transaction (update stats, calculate points, etc.)
    // Import processTransaction function from transactions route
    // For now, we'll do basic updates

    // TODO: Trigger background job to process transaction
    // TODO: Send SMS notification to user

    return c.json({
      ResultCode: 0,
      ResultDesc: 'Callback received successfully',
    });
  } catch (error) {
    console.error('M-Pesa webhook error:', error);

    // Always return success to M-Pesa to avoid retries
    return c.json({
      ResultCode: 0,
      ResultDesc: 'Callback received',
    });
  }
});

// M-Pesa timeout callback
webhookRoutes.post('/mpesa/timeout', async (c) => {
  const body = await c.req.json();
  console.log('M-Pesa Timeout:', JSON.stringify(body, null, 2));

  return c.json({
    ResultCode: 0,
    ResultDesc: 'Timeout received',
  });
});

// AfricasTalking delivery report (optional)
webhookRoutes.post('/sms/delivery', async (c) => {
  const body = await c.req.json();
  console.log('SMS Delivery Report:', JSON.stringify(body, null, 2));

  // TODO: Update notification status in database

  return c.json({ success: true });
});

export default webhookRoutes;
