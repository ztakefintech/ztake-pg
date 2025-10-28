import { db } from './database';

// Cashfree Payout API Helper Functions

interface CashfreeCredentials {
  cashfree_payout_client_id: string;
  cashfree_payout_client_secret: string;
  cashfree_env: string;
}

/**
 * Get Cashfree base URL based on environment
 */
function getCashfreeBase(env?: string): string {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

/**
 * Get Bearer token for Cashfree APIs
 */
async function getCashfreeToken(base: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    console.log(`[CF] Requesting token from: ${base}/v1/authorize`);
    
    const resp = await fetch(`${base}/v1/authorize`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'Accept': 'application/json'
      }
    });
    
    const text = await resp.text();
    console.log(`[CF] Token response status: ${resp.status}`);
    
    if (!resp.ok) {
      console.error(`[CF] Token request failed: ${text}`);
      return null;
    }
    
    try {
      const json = JSON.parse(text);
      const token = json?.data?.token || json?.token || null;
      console.log(`[CF] Token obtained: ${token ? 'YES' : 'NO'}`);
      return token;
    } catch (e) {
      console.error('[CF] Failed to parse token response:', e);
      return null;
    }
  } catch (error) {
    console.error('[CF] Token request error:', error);
    return null;
  }
}

/**
 * Create beneficiary
 */
async function createBeneficiary(
  base: string,
  clientId: string,
  clientSecret: string,
  headers: Record<string, string>,
  beneficiaryId: string,
  beneficiaryName: string,
  bankAccount: string,
  bankIfsc: string,
  email?: string,
  phone?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Construct payload according to Cashfree V2 API
    const payload: any = {
      beneficiary_id: beneficiaryId,
      beneficiary_name: beneficiaryName,
      beneficiary_instrument_details: {
        bank_account_number: bankAccount,
        bank_ifsc: bankIfsc
      }
    };

    // Add contact details if provided
    if (email || phone) {
      payload.beneficiary_contact_details = {};
      if (email) payload.beneficiary_contact_details.beneficiary_email = email;
      if (phone) payload.beneficiary_contact_details.beneficiary_phone = phone;
    }

    console.log('[CF] Creating beneficiary:', JSON.stringify(payload, null, 2));

    const resp = await fetch(`${base}/beneficiary`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        ...headers
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    console.log(`[CF] Beneficiary response status: ${resp.status}, body: ${text}`);
    
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      console.error('[CF] Failed to parse beneficiary response:', e);
    }

    // Check response status codes from Cashfree API documentation
    if (resp.status === 201) {
      console.log('[CF] Beneficiary created successfully:', beneficiaryId);
      return { success: true, data: json };
    }
    
    // Check if beneficiary already exists (409 status)
    if (resp.status === 409) {
      const providerMsg = (json?.message || text || '').toString().toLowerCase();
      const providerCode = (json?.code || '').toString().toLowerCase();
      
      if (providerCode === 'beneficiary_id_already_exists' || providerCode === 'beneficiary_already_exists' || /already exists/.test(providerMsg)) {
        console.log('[CF] Beneficiary already exists:', beneficiaryId);
        return { success: true, data: json };
      }
    }
    
    console.error(`[CF] Beneficiary creation failed: ${resp.status} - ${text}`);
    return { success: false, error: json?.message || text || `HTTP ${resp.status}: ${text}` };
  } catch (error) {
    console.error('[CF] Beneficiary creation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete beneficiary
 */
async function deleteBeneficiary(
  base: string,
  clientId: string,
  clientSecret: string,
  headers: Record<string, string>,
  beneficiaryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[CF] Deleting beneficiary:', beneficiaryId);

    const resp = await fetch(`${base}/beneficiary?beneficiary_id=${beneficiaryId}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        ...headers
      }
    });

    const text = await resp.text();
    const success = resp.status === 200;

    if (success) {
      console.log('[CF] Beneficiary deleted successfully:', beneficiaryId);
      return { success: true };
    }

    console.error(`[CF] Beneficiary deletion failed: ${resp.status} - ${text}`);
    return { success: false, error: `Deletion failed: ${text}` };
  } catch (error) {
    console.error('[CF] Beneficiary deletion error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Initiate transfer
 */
async function initiateTransfer(
  base: string,
  clientId: string,
  clientSecret: string,
  headers: Record<string, string>,
  transferId: string,
  amount: number,
  beneficiaryId: string,
  transferMode: string = 'banktransfer',
  transferModeSubtype: string = 'imps',
  remarks?: string,
  callbackUrl?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload: any = {
      transfer_id: transferId,
      transfer_amount: Number(amount),
      beneficiary_details: {
        beneficiary_id: beneficiaryId
      },
      transfer_mode: transferMode
    };
    
    // Only add transfer_remarks if provided
    if (remarks) {
      payload.transfer_remarks = remarks;
    }

    if (transferMode === 'banktransfer') {
      payload.transfer_mode_subtype = transferModeSubtype;
    }

    if (callbackUrl) {
      payload.callback_url = callbackUrl;
    }

    console.log('[CF] Initiating transfer:', JSON.stringify(payload, null, 2));

    const resp = await fetch(`${base}/transfers`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        ...headers
      },
      body: JSON.stringify(payload)
    });

    const text = await resp.text();
    console.log(`[CF] Transfer response status: ${resp.status}, body: ${text}`);
    
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      console.error('[CF] Failed to parse transfer response:', e);
    }

    // Check for duplicate transfer ID error
    if (resp.status === 400 || resp.status === 409) {
      const errorMsg = (json?.message || text || '').toString().toLowerCase();
      if (/duplicate|already exists/i.test(errorMsg)) {
        console.error(`[CF] Duplicate transfer ID: ${transferId}`);
        return { success: false, error: `DUPLICATE_TRANSFER_ID: ${transferId}` };
      }
    }

    const success = resp.status >= 200 && resp.status < 300;

    if (!success) {
      console.error(`[CF] Transfer initiation failed: ${resp.status} - ${text}`);
      return { success: false, error: json?.message || text || `HTTP ${resp.status}: ${text}` };
    }

    console.log('[CF] Transfer initiated successfully:', transferId);
    return { success: true, data: json };
  } catch (error) {
    console.error('[CF] Transfer initiation error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Process payout to Cashfree for a given payout ID
 */
export async function processPayoutToCashfree(payoutId: number, credentials?: any): Promise<{ success: boolean; transferId?: string; error?: string }> {
  try {
    // Get payout details with vendor credentials
    let payout;
    if (credentials) {
      // Use provided credentials (from vendor query)
      payout = await db.get(
        `SELECT 
          p.id, p.vendor_id, p.amount, p.currency, p.beneficiary_name, p.beneficiary_account,
          p.beneficiary_ifsc, p.beneficiary_upi, p.reference_id, p.remarks, p.status
        FROM payouts p
        WHERE p.id = ?`,
        [payoutId]
      );
      // Add credentials from parameter
      payout = { ...payout, ...credentials };
    } else {
      // Get credentials from vendor table
      payout = await db.get(
        `SELECT 
          p.id, p.vendor_id, p.amount, p.currency, p.beneficiary_name, p.beneficiary_account,
          p.beneficiary_ifsc, p.beneficiary_upi, p.reference_id, p.remarks, p.status,
          v.cashfree_payout_client_id, v.cashfree_payout_client_secret, v.cashfree_env, v.vendor_code
        FROM payouts p
        JOIN vendors v ON v.id = p.vendor_id
        WHERE p.id = ?`,
        [payoutId]
      );
    }

    if (!payout) {
      return { success: false, error: 'Payout not found' };
    }

    if (!payout.cashfree_payout_client_id || !payout.cashfree_payout_client_secret) {
      return { success: false, error: 'Vendor payout credentials not configured' };
    }

    // Check if already processed
    if (payout.status === 'pending' || payout.status === 'processing') {
      console.log(`[CF] Payout ${payoutId} already being processed`);
      return { success: false, error: 'Payout already being processed' };
    }

    // Get Cashfree base URL and credentials
    const base = getCashfreeBase(payout.cashfree_env);
    const clientId = payout.cashfree_payout_client_id;
    const clientSecret = payout.cashfree_payout_client_secret;

    // Get Bearer token
    const token = await getCashfreeToken(base, clientId, clientSecret);
    if (!token) {
      return { success: false, error: 'Failed to get authentication token' };
    }

    // Prepare headers
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-api-version': '2024-01-01'
    };

    // Generate beneficiary ID (max 50 characters, alphanumeric + underscore, dash, pipe, dot)
    // Format: vendorId_account_last4_timestamp (e.g., bene_1_1234_1234567890)
    const accountLast4 = payout.beneficiary_account?.toString().slice(-4) || '0000';
    const beneficiaryId = `bene_${payout.vendor_id}_${accountLast4}_${Date.now()}`.substring(0, 50);

    // Create beneficiary
    const beneficiaryResult = await createBeneficiary(
      base,
      clientId,
      clientSecret,
      headers,
      beneficiaryId,
      payout.beneficiary_name,
      payout.beneficiary_account,
      payout.beneficiary_ifsc
    );

    if (!beneficiaryResult.success) {
      console.error(`[CF] Beneficiary creation failed: ${beneficiaryResult.error}`);
      await db.run(
        `UPDATE payouts SET status = 'failed', failure_reason = ? WHERE id = ?`,
        [`Beneficiary creation failed: ${beneficiaryResult.error}`, payoutId]
      );
      return { success: false, error: `Beneficiary creation failed: ${beneficiaryResult.error}` };
    }
    
    console.log(`[CF] Beneficiary created/exists: ${beneficiaryId}`);

    // Get internal webhook URL
    const internalWebhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ztake.in'}/api/webhooks/cashfree-payout`;

    // Initiate transfer - handle duplicate ID by retrying with new ID
    let transferResult = await initiateTransfer(
      base,
      clientId,
      clientSecret,
      headers,
      payout.reference_id,
      payout.amount,
      beneficiaryId,
      'banktransfer',
      'imps',
      payout.remarks,
      internalWebhookUrl
    );

    // If duplicate transfer ID, try with new generated ID
    if (!transferResult.success && transferResult.error?.includes('DUPLICATE_TRANSFER_ID')) {
      console.log(`[CF] Duplicate transfer ID detected, generating new ID...`);
      const newTransferId = `TR${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Update the payout reference_id in DB
      await db.run(
        `UPDATE payouts SET reference_id = ? WHERE id = ?`,
        [newTransferId, payoutId]
      );
      
      // Retry with new transfer ID
      transferResult = await initiateTransfer(
        base,
        clientId,
        clientSecret,
        headers,
        newTransferId,
        payout.amount,
        beneficiaryId,
        'banktransfer',
        'imps',
        payout.remarks,
        internalWebhookUrl
      );
      
      console.log(`[CF] Retried with new transfer ID: ${newTransferId}`);
    }

    if (!transferResult.success) {
      console.error(`[CF] Transfer initiation failed: ${transferResult.error}`);
      await db.run(
        `UPDATE payouts SET status = 'failed', failure_reason = ? WHERE id = ?`,
        [`Transfer initiation failed: ${transferResult.error}`, payoutId]
      );
      return { success: false, error: `Transfer initiation failed: ${transferResult.error}` };
    }
    
    console.log(`[CF] Transfer initiated successfully with ID: ${payout.reference_id}`);

    // Update payout with provider details
    const cfTransferId = transferResult.data?.cf_transfer_id || transferResult.data?.transfer_id || null;
    await db.run(
      `UPDATE payouts SET 
        status = 'pending',
        cashfree_payout_id = ?,
        raw_response = ?
      WHERE id = ?`,
      [cfTransferId, JSON.stringify(transferResult.data), payoutId]
    );

    console.log(`[CF] Payout ${payoutId} processed successfully with transfer ID: ${cfTransferId}`);

    // Delete beneficiary after successful transfer (as per user requirement)
    console.log(`[CF] Deleting beneficiary ${beneficiaryId} after transfer...`);
    const deleteResult = await deleteBeneficiary(base, clientId, clientSecret, headers, beneficiaryId);
    if (deleteResult.success) {
      console.log(`[CF] Beneficiary ${beneficiaryId} deleted successfully`);
    } else {
      console.log(`[CF] Failed to delete beneficiary ${beneficiaryId}: ${deleteResult.error} (non-critical)`);
    }

    return { success: true, transferId: cfTransferId };

  } catch (error) {
    console.error('[CF] Process payout error:', error);
    await db.run(
      `UPDATE payouts SET status = 'failed', failure_reason = ? WHERE id = ?`,
      [error instanceof Error ? error.message : 'Unknown error', payoutId]
    );
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

