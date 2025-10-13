import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { generateQRCode } from '@/lib/qr-generator';
import { AuthService } from '@/lib/auth';
import { validateRequest, apiKeyValidationSchema } from '@/lib/validation';
import Joi from 'joi';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple in-memory cache for QR codes
const qrCodeCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Validation schema for the request
const paymentDetailsSchema = Joi.object({
  vendor_code: Joi.string().pattern(/^[A-Z]{2}[0-9]{4}$/).required().messages({
    'string.pattern.base': 'Vendor code must be in format AA4563 (2 letters + 4 numbers)',
    'any.required': 'Vendor code is required'
  }),
});

export async function GET(request: NextRequest) {
  try {
    // Validate API key from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const apiKey = authHeader.substring(7);
    try {
      validateRequest(apiKeyValidationSchema, apiKey);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid API key format in Authorization header' }, { status: 401 });
    }

    console.log(`[PAYMENT-DETAILS] Attempting authentication for API key: ${apiKey.substring(0, 8)}...`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[PAYMENT-DETAILS] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[PAYMENT-DETAILS] API key verified for key ID: ${apiKeyInfo.keyId}`);

    console.log('Payment details API called');
    const { searchParams } = new URL(request.url);
    const vendorCode = searchParams.get('vendor_code');
    console.log('Vendor Code from params:', vendorCode);

    // Validate input
    if (!vendorCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'vendor_code parameter is required',
          details: 'Please provide a valid vendor code in the format AA4563'
        },
        { status: 400 }
      );
    }

    const { error, value } = paymentDetailsSchema.validate({ 
      vendor_code: vendorCode 
    });

    if (error) {
      console.log('Validation error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid vendor code format',
          details: error.details[0].message,
          expected_format: 'AA4563 (2 uppercase letters + 4 numbers)'
        },
        { status: 400 }
      );
    }

    // Fetch vendor details
    console.log('Fetching vendor with code:', value.vendor_code);
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name, upi_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, created_at FROM vendors WHERE vendor_code = ?',
      [value.vendor_code]
    );
    console.log('Vendor found:', vendor);

    if (!vendor) {
      console.log('Vendor not found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Vendor not found' 
        },
        { status: 404 }
      );
    }

    console.log(`[PAYMENT-DETAILS] Vendor code verified for vendor ID: ${vendor.id}`);

    // Verify that the API key belongs to the same vendor
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== vendor.id) {
      console.log(`[PAYMENT-DETAILS] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but vendor code belongs to vendor ${vendor.id}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, we need to verify it belongs to the order's vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[PAYMENT-DETAILS] API key has no vendor association, checking if it can access this vendor's payment details`);
      // For now, we'll allow it, but this could be enhanced with additional validation
      console.log(`[PAYMENT-DETAILS] Allowing API key without vendor association to proceed`);
    }

    console.log(`[PAYMENT-DETAILS] Authentication successful for vendor ${vendor.id}`);

    // Generate QR code if UPI ID exists (with caching)
    let qrCodeData = null;
    if (vendor.upi_id) {
      try {
        console.log('Generating QR code for UPI ID:', vendor.upi_id);
        const cacheKey = `${vendor.upi_id}_${vendor.business_name}`;
        const cached = qrCodeCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached QR code');
          qrCodeData = cached.data;
        } else {
          console.log('Generating new QR code');
          qrCodeData = await generateQRCode(vendor.upi_id, vendor.business_name);
          console.log('QR code generated, length:', qrCodeData ? qrCodeData.length : 0);
          qrCodeCache.set(cacheKey, { data: qrCodeData, timestamp: Date.now() });
        }
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
        // Continue without QR code if generation fails
      }
    } else {
      console.log('No UPI ID found for vendor');
    }

    // Return vendor payment details
    console.log(`[PAYMENT-DETAILS] Successfully retrieved payment details for vendor ${vendor.id} (${vendor.vendor_code})`);
    
    return NextResponse.json({
      success: true,
      data: {
        vendor_code: vendor.vendor_code,
        business_name: vendor.business_name,
        upi_id: vendor.upi_id,
        bank_name: vendor.bank_name,
        bank_account_number: vendor.bank_account_number,
        bank_account_holder: vendor.bank_account_holder,
        bank_ifsc: vendor.bank_ifsc,
        qr_code: qrCodeData,
        created_at: vendor.created_at,
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Payment details API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
