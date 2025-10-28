import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

// GET - Fetch all bank accounts for the authenticated vendor
async function getBankAccounts(req: AuthenticatedRequest) {
  try {
    const accounts = await db.all(
      'SELECT * FROM vendor_bank_accounts WHERE vendor_id = $1 ORDER BY created_at DESC',
      [req.vendor!.id]
    );

    return createApiResponse({ accounts });
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return createErrorResponse('Failed to fetch bank accounts', 500);
  }
}

// POST - Add a new bank account
async function addBankAccount(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const { bank_name, account_holder_name, account_number, ifsc_code } = body;

    // Validation
    if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
      return createErrorResponse('All fields are required', 400);
    }

    // Validate IFSC code format (e.g., HDFC0001234)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc_code.toUpperCase())) {
      return createErrorResponse('Invalid IFSC code format', 400);
    }

    // Insert the new bank account
    const result = await db.run(
      `INSERT INTO vendor_bank_accounts (vendor_id, bank_name, account_holder_name, account_number, ifsc_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.vendor!.id, bank_name, account_holder_name, account_number, ifsc_code.toUpperCase()]
    );

    // Fetch the newly created account
    const account = await db.get(
      'SELECT * FROM vendor_bank_accounts WHERE id = $1',
      [result.lastID]
    );

    return createApiResponse({
      message: 'Bank account added successfully',
      account
    }, 201);
  } catch (error) {
    console.error('Error adding bank account:', error);
    return createErrorResponse('Failed to add bank account', 500);
  }
}

async function handler(req: AuthenticatedRequest) {
  if (req.method === 'GET') {
    return getBankAccounts(req);
  } else if (req.method === 'POST') {
    return addBankAccount(req);
  } else {
    return createErrorResponse('Method not allowed', 405);
  }
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
