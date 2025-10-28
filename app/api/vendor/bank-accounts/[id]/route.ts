import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

// PUT - Update a bank account
async function updateBankAccount(
  req: AuthenticatedRequest,
  accountId: number
) {
  try {
    // Verify the account belongs to this vendor
    const existingAccount = await db.get(
      'SELECT * FROM vendor_bank_accounts WHERE id = $1 AND vendor_id = $2',
      [accountId, req.vendor!.id]
    );

    if (!existingAccount) {
      return createErrorResponse('Account not found or access denied', 404);
    }

    const body = await req.json();
    const { bank_name, account_holder_name, account_number, ifsc_code } = body;

    // Validation
    if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
      return createErrorResponse('All fields are required', 400);
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc_code.toUpperCase())) {
      return createErrorResponse('Invalid IFSC code format', 400);
    }

    // Update the bank account
    await db.run(
      `UPDATE vendor_bank_accounts 
       SET bank_name = $1, account_holder_name = $2, account_number = $3, ifsc_code = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND vendor_id = $6`,
      [bank_name, account_holder_name, account_number, ifsc_code.toUpperCase(), accountId, req.vendor!.id]
    );

    // Fetch the updated account
    const account = await db.get(
      'SELECT * FROM vendor_bank_accounts WHERE id = $1',
      [accountId]
    );

    return createApiResponse({
      message: 'Bank account updated successfully',
      account
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    return createErrorResponse('Failed to update bank account', 500);
  }
}

// DELETE - Delete a bank account
async function deleteBankAccount(
  req: AuthenticatedRequest,
  accountId: number
) {
  try {
    // Verify the account belongs to this vendor
    const existingAccount = await db.get(
      'SELECT * FROM vendor_bank_accounts WHERE id = $1 AND vendor_id = $2',
      [accountId, req.vendor!.id]
    );

    if (!existingAccount) {
      return createErrorResponse('Account not found or access denied', 404);
    }

    // Delete the bank account
    await db.run(
      'DELETE FROM vendor_bank_accounts WHERE id = $1 AND vendor_id = $2',
      [accountId, req.vendor!.id]
    );

    return createApiResponse({
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting bank account:', error);
    return createErrorResponse('Failed to delete bank account', 500);
  }
}

// Wrapper to handle auth and extract account ID
async function handlerWrapper(
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  const accountId = parseInt(params.id);
  
  if (isNaN(accountId)) {
    return createErrorResponse('Invalid account ID', 400);
  }

  if (req.method === 'PUT') {
    return updateBankAccount(req, accountId);
  } else if (req.method === 'DELETE') {
    return deleteBankAccount(req, accountId);
  } else {
    return createErrorResponse('Method not allowed', 405);
  }
}

// Export the handlers with auth middleware
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHandler = withAuth(async (authReq: AuthenticatedRequest) => {
    return handlerWrapper(authReq, { params });
  });
  return authHandler(req);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHandler = withAuth(async (authReq: AuthenticatedRequest) => {
    return handlerWrapper(authReq, { params });
  });
  return authHandler(req);
}
