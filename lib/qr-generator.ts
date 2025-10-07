import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export class QRCodeService {
  // Note: parameter order is (upiId, businessName, amount, options)
  static async generateQRCode(
    upiId: string,
    businessName?: string,
    amount?: number,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const defaultOptions = {
      width: 200, // Reduced from 256 for faster generation
      margin: 1,  // Reduced margin
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M', // Medium error correction for faster generation
      ...options
    };

    // Create UPI payment URL
    const upiUrl = this.createUPIUrl(upiId, businessName || '', amount);
    
    try {
      const qrCodeDataURL = await QRCode.toDataURL(upiUrl, defaultOptions as any);
      return qrCodeDataURL as any;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  static createUPIUrl(upiId: string, businessName: string, amount?: number): string {
    const baseUrl = 'upi://pay';
    const params = new URLSearchParams();
    
    params.append('pa', upiId); // Payee address (UPI ID)
    params.append('pn', businessName); // Payee name
    params.append('cu', 'INR'); // Currency
    
    if (amount) {
      params.append('am', amount.toString());
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  static async generateQRCodeForVendor(upiId: string, businessName: string): Promise<{
    qrCodeUrl: string;
    upiId: string;
    upiUrl: string;
  }> {
    const qrCodeUrl = await this.generateQRCode(upiId, businessName || '');
    const upiUrl = this.createUPIUrl(upiId, businessName);
    
    return {
      qrCodeUrl,
      upiId,
      upiUrl
    };
  }
}

// Simple function export for API routes
export async function generateQRCode(upiId: string, businessName?: string): Promise<string> {
  return QRCodeService.generateQRCode(upiId, businessName || '');
}
