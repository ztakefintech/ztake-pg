import Joi from 'joi';

// Common validation patterns
const UTR_PATTERN = /^[0-9]{10,20}$/;
const VENDOR_CODE_PATTERN = /^[A-Z]{2}[0-9]{4}$/;
const UPI_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const BANK_ACCOUNT_PATTERN = /^[0-9]{6,18}$/;
const PHONE_PATTERN = /^[0-9+\-\s()]{10,15}$/;
const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{3,255}$/;

// Vendor registration validation
export const vendorRegistrationSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  business_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z0-9\s&.,-]+$/).required(),
  contact_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  phone: Joi.string().pattern(PHONE_PATTERN).optional(),
  upi_id: Joi.string().pattern(UPI_PATTERN).max(255).required()
});

// Vendor login validation
export const vendorLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Order creation validation
export const createOrderSchema = Joi.object({
  merchantOrderId: Joi.string().pattern(ORDER_ID_PATTERN).required()
    .messages({
      'string.pattern.base': 'Merchant order ID must be 3-255 characters and contain only letters, numbers, underscores, and hyphens'
    }),
  amount: Joi.number().positive().precision(2).min(100).max(100000).required()
    .messages({
      'number.min': 'Amount must be at least ₹100',
      'number.max': 'Amount cannot exceed ₹1,00,000'
    }),
  currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR'),
  customerName: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  returnUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).required(),
  callbackUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).required(),
  vendorCode: Joi.string().pattern(VENDOR_CODE_PATTERN).required()
    .messages({
      'string.pattern.base': 'Vendor code must be in format: 2 uppercase letters followed by 4 digits (e.g., AB1234)',
      'any.required': 'Vendor code is required'
    })
});

// Update payment details validation
export const updatePaymentSchema = Joi.object({
  utr: Joi.string().pattern(UTR_PATTERN).required()
    .messages({
      'string.pattern.base': 'UTR must be 10-20 digits'
    }),
  amount: Joi.number().positive().precision(2).min(100).max(100000).required()
    .messages({
      'number.min': 'Amount must be at least ₹100',
      'number.max': 'Amount cannot exceed ₹1,00,000'
    }),
  vendor_code: Joi.string().pattern(VENDOR_CODE_PATTERN).required(),
  order_id: Joi.string().pattern(ORDER_ID_PATTERN).optional(),
  payment_status: Joi.string().valid('Pending', 'Succeeded', 'Failed').optional()
});

// Check payment status validation
export const checkPaymentSchema = Joi.object({
  utr: Joi.string().pattern(UTR_PATTERN).required()
    .messages({
      'string.pattern.base': 'UTR must be 10-20 digits'
    }),
  vendor_code: Joi.string().pattern(VENDOR_CODE_PATTERN).required(),
  order_id: Joi.string().pattern(ORDER_ID_PATTERN).required()
});

// Update payment status validation
export const updatePaymentStatusSchema = Joi.object({
  utr: Joi.string().pattern(UTR_PATTERN).required()
    .messages({
      'string.pattern.base': 'UTR must be 10-20 digits'
    }),
  payment_status: Joi.string().valid('Pending', 'Succeeded', 'Failed').required()
});

// Payout creation validation
export const createPayoutSchema = Joi.object({
  amount: Joi.number().positive().precision(2).min(100).max(100000).required()
    .messages({
      'number.min': 'Payout amount must be at least ₹100',
      'number.max': 'Payout amount cannot exceed ₹1,00,000'
    }),
  currency: Joi.string().valid('INR').default('INR'),
  beneficiary_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  beneficiary_account: Joi.string().pattern(BANK_ACCOUNT_PATTERN).allow('', null).optional()
    .messages({
      'string.pattern.base': 'Bank account number must be 6-18 digits'
    }),
  beneficiary_ifsc: Joi.string().pattern(IFSC_PATTERN).allow('', null).optional()
    .messages({
      'string.pattern.base': 'IFSC code must be in format: ABCD0123456'
    }),
  beneficiary_upi: Joi.string().pattern(UPI_PATTERN).allow('', null).optional(),
  reference_id: Joi.string().pattern(ORDER_ID_PATTERN).optional(),
  remarks: Joi.string().max(500).optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(PHONE_PATTERN).required(),
  vendorCode: Joi.string().pattern(VENDOR_CODE_PATTERN).required()
    .messages({
      'string.pattern.base': 'Vendor code must be in format: 2 uppercase letters followed by 4 digits (e.g., AB1234)',
      'any.required': 'Vendor code is required'
    })
});

// Update vendor profile validation
export const updateVendorProfileSchema = Joi.object({
  business_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z0-9\s&.,-]+$/).optional(),
  contact_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).optional(),
  phone: Joi.string().pattern(PHONE_PATTERN).optional(),
  website: Joi.string().uri({ scheme: [/https?/] }).max(512).optional().allow(''),
  upi_id: Joi.string().pattern(UPI_PATTERN).max(255).optional(),
  bank_name: Joi.string().min(2).max(255).pattern(/^[a-zA-Z0-9\s&.,-]+$/).optional().allow(''),
  bank_account_number: Joi.string().pattern(BANK_ACCOUNT_PATTERN).optional().allow(''),
  bank_account_holder: Joi.string().min(2).max(255).pattern(/^[a-zA-Z\s.]+$/).optional().allow(''),
  bank_ifsc: Joi.string().pattern(IFSC_PATTERN).optional().allow(''),
  bot_token: Joi.string().pattern(/^\d+:[A-Za-z0-9_-]{35}$/).optional().allow(''),
  chat_id: Joi.string().pattern(/^\-?\d+$/).optional().allow(''),
  cashfree_app_id: Joi.string().max(255).optional().allow(''),
  cashfree_secret_key: Joi.string().max(255).optional().allow(''),
  cashfree_payout_client_id: Joi.string().max(255).optional().allow(''),
  cashfree_payout_client_secret: Joi.string().max(255).optional().allow(''),
  cashfree_env: Joi.string().valid('sandbox', 'prod').optional().allow('')
});

// Pagination validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).max(100000).optional()
});

// Query parameter validation for filtering
export const orderQuerySchema = Joi.object({
  status: Joi.string().valid('Pending', 'Succeeded', 'Failed', 'created', 'completed', 'rejected').optional(),
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().min(Joi.ref('from_date')).optional(),
  min_amount: Joi.number().positive().optional(),
  max_amount: Joi.number().positive().min(Joi.ref('min_amount')).optional()
});

// Security validation for API key names
export const apiKeyNameValidationSchema = Joi.object({
  key_name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z0-9\s_-]+$/).required()
    .messages({
      'string.pattern.base': 'API key name can only contain letters, numbers, spaces, underscores, and hyphens'
    })
});

// API Key validation for order creation
export const apiKeyValidationSchema = Joi.string()
  .pattern(/^pk_[a-zA-Z0-9]{32}$/)
  .required()
  .messages({
    'string.pattern.base': 'API key must start with "pk_" followed by 32 alphanumeric characters',
    'any.required': 'API key is required in Authorization header'
  });

// API key creation validation (using the enhanced schema)
export const createApiKeySchema = apiKeyNameValidationSchema;

// Admin login validation
export const adminLoginSchema = Joi.object({
  // Allow either an email or a simple username
  username: Joi.alternatives().try(
    Joi.string().email().max(255),
    Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_-]+$/)
  ).required(),
  password: Joi.string().min(6).max(128).required()
});

// Admin user creation validation
export const createAdminSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  role: Joi.string().valid('superuser', 'view_only', 'manage_users', 'manage_payin', 'manage_payout', 'manage_settlements', 'custom').required(),
  permissions: Joi.object().optional()
});

// Admin user update validation
export const updateAdminSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).optional(),
  role: Joi.string().valid('superuser', 'view_only', 'manage_users', 'manage_payin', 'manage_payout', 'manage_settlements', 'custom').optional(),
  permissions: Joi.object().optional(),
  is_active: Joi.boolean().optional()
});

// Enhanced validation function with better error handling
export function validateRequest(schema: Joi.ObjectSchema | Joi.StringSchema, data: any, options: Joi.ValidationOptions = {}) {
  const defaultOptions: Joi.ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    ...options
  };
  
  const { error, value } = schema.validate(data, defaultOptions);
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    throw new Error(errorMessages);
  }
  return value;
}

// Validate query parameters
export function validateQueryParams(schema: Joi.ObjectSchema, searchParams: URLSearchParams) {
  const params: any = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return validateRequest(schema, params);
}

// Sanitize input to prevent XSS and injection attacks
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .replace(/[;]/g, '') // Remove semicolons
    .trim();
}

// Validate business logic constraints
export function validateBusinessRules(data: any, context: string = '') {
  const errors: string[] = [];
  
  // Amount validation for different contexts
  if (data.amount !== undefined) {
    if (context === 'payout' && data.amount < 100) {
      errors.push('Payout amount must be at least ₹100');
    }
    if (context === 'order' && data.amount < 100) {
      errors.push('Order amount must be at least ₹100');
    }
    if (data.amount > 100000) {
      errors.push('Amount cannot exceed ₹1,00,000');
    }
  }
  
  // UTR uniqueness check (would need database access in actual implementation)
  if (data.utr && context === 'payment') {
    // This would typically check database for existing UTR
    // For now, just validate format
    if (!UTR_PATTERN.test(data.utr)) {
      errors.push('Invalid UTR format');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  
  return data;
}
