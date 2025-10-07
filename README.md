# ztake

A comprehensive Next.js-based API platform for tracking vendor payments and UPI transactions with QR code generation and secure authentication.

## Features

### Vendor Account Management
- ✅ Vendor registration and login with JWT authentication
- ✅ Profile management with UPI ID and business details
- ✅ Secure password hashing with bcrypt

### Payment APIs
- ✅ **Fetch Payment Info API**: Get QR code and UPI ID for vendors
- ✅ **Update Payment Details API**: Secure endpoint for bots to update payment information
- ✅ **Check Payment Status API**: Public endpoint to verify UTR and payment status

### Security & Validation
- ✅ JWT-based authentication for vendors
- ✅ API key authentication for bots
- ✅ Input validation with Joi
- ✅ Rate limiting on all endpoints
- ✅ SQL injection protection

### Frontend Components
- ✅ Modern, responsive UI with Tailwind CSS
- ✅ Vendor dashboard with payment overview
- ✅ Profile management interface
- ✅ API key management for bot integration
- ✅ Payment status checker
- ✅ QR code generation (no file storage)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite3
- **Authentication**: JWT tokens, bcrypt for password hashing
- **Validation**: Joi
- **Icons**: React Icons
- **QR Code**: qrcode library

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd payment-tracking-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and update the secrets:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   API_KEY_SECRET=your-super-secret-api-key-change-in-production
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Documentation

### Authentication

#### Vendor Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "vendor@example.com",
  "password": "securepassword",
  "business_name": "My Business",
  "contact_name": "John Doe",
  "phone": "+1234567890",
  "upi_id": "john@paytm"
}
```

#### Vendor Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "vendor@example.com",
  "password": "securepassword"
}
```

### Vendor APIs (Requires JWT Token)

#### Get Payment Information
```http
GET /api/vendor/payment-info
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "qr_code_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "upi_id": "john@paytm",
  "upi_url": "upi://pay?pa=john@paytm&pn=Vendor&cu=INR",
  "vendor_id": 1
}
```

#### Get Vendor Payments
```http
GET /api/vendor/payments?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### Update Vendor Profile
```http
PUT /api/vendor/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "business_name": "Updated Business Name",
  "contact_name": "Updated Contact",
  "phone": "+1234567890",
  "upi_id": "updated@paytm"
}
```

### Public APIs (No Authentication Required)

#### Get Payment Details for Website Integration
```http
GET /api/vendor/payment-details?vendor_id=1
```

Response:
```json
{
  "success": true,
  "data": {
    "vendor_id": 1,
    "business_name": "My Store",
    "upi_id": "mystore@paytm",
    "qr_code": "base64_image_data",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Payment Widget API
```http
GET /api/public/payment-widget?vendor_id=1&format=json&theme=light&size=medium
```

**Parameters:**
- `vendor_id` (required): Vendor ID
- `format`: `json`, `html`, or `widget`
- `theme`: `light`, `dark`, or `auto`
- `size`: `small`, `medium`, or `large`

**Formats:**
- `format=json`: Returns JSON data
- `format=html`: Returns complete HTML widget
- `format=widget`: Returns JavaScript widget code

**Example HTML Embed:**
```html
<iframe src="/api/public/payment-widget?vendor_id=1&format=html" 
        width="400" height="500" frameborder="0">
</iframe>
```

**Example JavaScript Widget:**
```html
<script src="/api/public/payment-widget?vendor_id=1&format=widget"></script>
<div id="payment-widget-container"></div>
```

### Payment APIs

#### Update Payment (Requires API Key)
```http
POST /api/payments/update
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "utr": "690518190930",
  "amount": 100.00,
  "vendor_id": 1
}
```

#### Check Payment Status (Public)
```http
POST /api/payments/check
Content-Type: application/json

{
  "utr": "690518190930"
}
```

### Admin APIs

#### Create API Key (Requires Vendor Authentication)
```http
POST /api/admin/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "key_name": "Payment Bot"
}
```

## Database Schema

### Vendors Table
```sql
CREATE TABLE vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT,
  upi_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Payments Table
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utr TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vendor_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vendor_id) REFERENCES vendors (id)
);
```

### API Keys Table
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL,
  key_hash TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **API endpoints**: 100 requests per minute
- **Payment update endpoints**: 10 requests per minute

## Security Features

1. **Password Security**: bcrypt hashing with salt rounds of 12
2. **JWT Tokens**: 7-day expiration for vendor tokens
3. **API Keys**: Secure generation and hashing
4. **Input Validation**: Comprehensive validation using Joi
5. **Rate Limiting**: Protection against brute force attacks
6. **SQL Injection Protection**: Parameterized queries

## Usage Examples

### For Vendors
1. Register an account with your business details and UPI ID
2. Login to access your dashboard
3. View your QR code and payment information
4. Check your payment history
5. Update your profile information

### For Bot Integration
1. Create an API key in the settings
2. Use the API key to authenticate payment update requests
3. Send UTR and amount information to update payment status

### For Payment Verification
1. Use the public payment checker to verify UTR status
2. Get complete payment details including vendor information

## Development

### Project Structure
```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── profile/          # Profile page
│   └── settings/         # Settings page
├── components/            # React components
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication logic
│   ├── database.ts      # Database connection
│   ├── middleware.ts    # API middleware
│   ├── qr-generator.ts  # QR code generation
│   ├── rate-limit.ts    # Rate limiting
│   └── validation.ts    # Input validation
└── public/              # Static assets
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
