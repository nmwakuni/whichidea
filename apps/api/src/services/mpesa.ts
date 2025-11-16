import { Buffer } from 'buffer';

const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox';
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE || '174379';
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

const BASE_URL = MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

/**
 * Get M-Pesa access token
 */
async function getAccessToken(): Promise<string> {
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error('M-Pesa credentials not configured');
  }

  const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');

  const response = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Failed to get M-Pesa access token');
  }

  return data.access_token;
}

/**
 * Generate M-Pesa password
 */
function generatePassword(): { password: string; timestamp: string } {
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

  return { password, timestamp };
}

/**
 * Initiate STK Push (Lipa Na M-Pesa Online)
 */
export async function initiateSTKPush(data: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}) {
  const accessToken = await getAccessToken();
  const { password, timestamp } = generatePassword();

  // Format phone number (remove + and ensure it starts with 254)
  let phone = data.phoneNumber.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '254' + phone.substring(1);
  } else if (!phone.startsWith('254')) {
    phone = '254' + phone;
  }

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.floor(data.amount),
    PartyA: phone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: data.accountReference,
    TransactionDesc: data.transactionDesc,
  };

  const response = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (result.ResponseCode === '0') {
    return {
      success: true,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      responseDescription: result.ResponseDescription,
    };
  } else {
    return {
      success: false,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage || result.ResponseDescription,
    };
  }
}

/**
 * Query STK Push status
 */
export async function querySTKPushStatus(checkoutRequestId: string) {
  const accessToken = await getAccessToken();
  const { password, timestamp } = generatePassword();

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  return {
    resultCode: result.ResultCode,
    resultDesc: result.ResultDesc,
    checkoutRequestId: result.CheckoutRequestID,
    merchantRequestId: result.MerchantRequestID,
  };
}

/**
 * Register C2B URLs (for production setup)
 */
export async function registerC2BURLs(validationUrl: string, confirmationUrl: string) {
  const accessToken = await getAccessToken();

  const payload = {
    ShortCode: MPESA_SHORTCODE,
    ResponseType: 'Completed',
    ConfirmationURL: confirmationUrl,
    ValidationURL: validationUrl,
  };

  const response = await fetch(`${BASE_URL}/mpesa/c2b/v1/registerurl`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}

/**
 * Account Balance Query
 */
export async function queryAccountBalance() {
  const accessToken = await getAccessToken();

  const payload = {
    Initiator: process.env.MPESA_INITIATOR_NAME,
    SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    CommandID: 'AccountBalance',
    PartyA: MPESA_SHORTCODE,
    IdentifierType: '4',
    Remarks: 'Account Balance Query',
    QueueTimeOutURL: `${MPESA_CALLBACK_URL}/timeout`,
    ResultURL: `${MPESA_CALLBACK_URL}/balance`,
  };

  const response = await fetch(`${BASE_URL}/mpesa/accountbalance/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
}
