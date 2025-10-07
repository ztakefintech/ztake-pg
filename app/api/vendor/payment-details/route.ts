import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { generateQRCode } from '@/lib/qr-generator';
import Joi from 'joi';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Simple in-memory cache for QR codes
const qrCodeCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Validation schema for the request
const paymentDetailsSchema = Joi.object({
  vendor_id: Joi.number().integer().positive().required(),
});

export async function GET(request: NextRequest) {
  try {
    console.log('Payment details API called');
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendor_id');
    console.log('Vendor ID from params:', vendorId);

    // Validate input
    const { error, value } = paymentDetailsSchema.validate({ 
      vendor_id: vendorId ? parseInt(vendorId) : undefined 
    });

    if (error) {
      console.log('Validation error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid vendor ID',
          details: error.details[0].message 
        },
        { status: 400 }
      );
    }

    // Fetch vendor details
    console.log('Fetching vendor with ID:', value.vendor_id);
    const vendor = await db.get(
      'SELECT id, business_name, upi_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, created_at FROM vendors WHERE id = ?',
      [value.vendor_id]
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
    return NextResponse.json({
      success: true,
      data: {
        vendor_id: vendor.id,
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
