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
const widgetSchema = Joi.object({
  vendor_code: Joi.string().pattern(/^[A-Z]{2}[0-9]{4}$/).required(),
  format: Joi.string().valid('json', 'html', 'widget').default('json'),
  theme: Joi.string().valid('light', 'dark', 'auto').default('light'),
  size: Joi.string().valid('small', 'medium', 'large').default('medium'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorCode = searchParams.get('vendor_code');
    const format = searchParams.get('format') || 'json';
    const theme = searchParams.get('theme') || 'light';
    const size = searchParams.get('size') || 'medium';

    // Validate input
    const { error, value } = widgetSchema.validate({ 
      vendor_code: vendorCode,
      format,
      theme,
      size
    });

    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters',
          details: error.details[0].message 
        },
        { status: 400 }
      );
    }

    // Fetch vendor details
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name, upi_id, created_at FROM vendors WHERE vendor_code = ?',
      [value.vendor_code]
    );

    if (!vendor) {
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
        const cacheKey = `${vendor.upi_id}_${vendor.business_name}`;
        const cached = qrCodeCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          qrCodeData = cached.data;
        } else {
          qrCodeData = await generateQRCode(vendor.upi_id, vendor.business_name);
          qrCodeCache.set(cacheKey, { data: qrCodeData, timestamp: Date.now() });
        }
      } catch (qrError) {
        console.error('QR Code generation error:', qrError);
      }
    }

    const paymentData = {
      vendor_id: vendor.id,
      vendor_code: vendor.vendor_code,
      business_name: vendor.business_name,
      upi_id: vendor.upi_id,
      qr_code: qrCodeData,
      created_at: vendor.created_at,
    };

    // Return different formats based on request
    if (value.format === 'html') {
      const html = generateHTMLWidget(paymentData, value.theme, value.size);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else if (value.format === 'widget') {
      const widget = generateWidgetScript(paymentData, value.theme, value.size);
      return new NextResponse(widget, {
        headers: {
          'Content-Type': 'text/javascript',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Default JSON response
    return NextResponse.json({
      success: true,
      data: paymentData,
      meta: {
        format: value.format,
        theme: value.theme,
        size: value.size,
        generated_at: new Date().toISOString(),
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Payment widget API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Generate HTML widget
function generateHTMLWidget(data: any, theme: string, size: string) {
  const sizeClasses = {
    small: 'w-48 h-48',
    medium: 'w-64 h-64',
    large: 'w-80 h-80'
  };

  const themeClasses = {
    light: 'bg-white text-gray-900 border-gray-200',
    dark: 'bg-gray-800 text-white border-gray-600',
    auto: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600'
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Widget - ${data.business_name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .qr-code { max-width: 100%; height: auto; }
    </style>
</head>
<body class="${themeClasses[theme as keyof typeof themeClasses]}">
    <div class="max-w-md mx-auto p-6 border rounded-lg shadow-lg ${themeClasses[theme as keyof typeof themeClasses]}">
        <div class="text-center">
            <h3 class="text-lg font-semibold mb-4">${data.business_name}</h3>
            ${data.qr_code ? `
                <div class="mb-4">
                    <img src="data:image/png;base64,${data.qr_code}" 
                         alt="UPI QR Code" 
                         class="qr-code mx-auto ${sizeClasses[size as keyof typeof sizeClasses]}">
                </div>
            ` : ''}
            ${data.upi_id ? `
                <div class="mb-4">
                    <p class="text-sm opacity-75 mb-2">UPI ID:</p>
                    <p class="font-mono text-lg font-semibold">${data.upi_id}</p>
                </div>
            ` : ''}
            <p class="text-xs opacity-50">Powered by ztake</p>
        </div>
    </div>
</body>
</html>`;
}

// Generate widget script
function generateWidgetScript(data: any, theme: string, size: string) {
  return `
(function() {
  const widgetData = ${JSON.stringify(data)};
  const theme = '${theme}';
  const size = '${size}';
  
  function createPaymentWidget() {
    const container = document.createElement('div');
    container.className = 'payment-widget';
    container.innerHTML = \`
      <div class="max-w-md mx-auto p-6 border rounded-lg shadow-lg bg-white text-gray-900">
        <div class="text-center">
          <h3 class="text-lg font-semibold mb-4">\${widgetData.business_name}</h3>
          \${widgetData.qr_code ? \`
            <div class="mb-4">
              <img src="data:image/png;base64,\${widgetData.qr_code}" 
                   alt="UPI QR Code" 
                   class="max-w-full mx-auto w-64 h-64">
            </div>
          \` : ''}
          \${widgetData.upi_id ? \`
            <div class="mb-4">
              <p class="text-sm opacity-75 mb-2">UPI ID:</p>
              <p class="font-mono text-lg font-semibold">\${widgetData.upi_id}</p>
            </div>
          \` : ''}
          <p class="text-xs opacity-50">Powered by ztake</p>
        </div>
      </div>
    \`;
    return container;
  }
  
  // Auto-inject if container exists
  const container = document.getElementById('payment-widget-container');
  if (container) {
    container.appendChild(createPaymentWidget());
  }
  
  // Export for manual use
  window.PaymentWidget = {
    create: createPaymentWidget,
    data: widgetData
  };
})();`;
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
