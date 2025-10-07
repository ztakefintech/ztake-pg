import Joi from 'joi';

// Vendor registration validation
export const vendorRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  business_name: Joi.string().min(2).max(100).required(),
  contact_name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  upi_id: Joi.string().pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).required()
});

// Vendor login validation
export const vendorLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Update payment details validation
export const updatePaymentSchema = Joi.object({
  utr: Joi.string().pattern(/^[0-9]+$/).min(10).max(20).required(),
  amount: Joi.number().positive().precision(2).required(),
  vendor_id: Joi.number().integer().positive().required(),
  order_id: Joi.string().min(3).max(255).optional(),
  payment_status: Joi.string().valid('Pending', 'Succeeded', 'Failed').optional()
});

// Check payment status validation
export const checkPaymentSchema = Joi.object({
  utr: Joi.string().pattern(/^[0-9]+$/).min(10).max(20).required(),
  vendor_id: Joi.number().integer().positive().required(),
  order_id: Joi.string().min(3).max(255).required()
});

// Update payment status validation
export const updatePaymentStatusSchema = Joi.object({
  utr: Joi.string().pattern(/^[0-9]+$/).min(10).max(20).required(),
  payment_status: Joi.string().valid('Pending', 'Succeeded', 'Failed').required()
});

// Update vendor profile validation
export const updateVendorProfileSchema = Joi.object({
  business_name: Joi.string().min(2).max(100).optional(),
  contact_name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
  upi_id: Joi.string().pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).optional(),
  bank_name: Joi.string().min(2).max(255).optional().allow(''),
  bank_account_number: Joi.string().pattern(/^[0-9]{6,18}$/).optional().allow(''),
  bank_account_holder: Joi.string().min(2).max(255).optional().allow(''),
  bank_ifsc: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional().allow(''),
  bot_token: Joi.string().pattern(/^\d+:[A-Za-z0-9_-]{35}$/).optional().allow(''),
  chat_id: Joi.string().pattern(/^\-?\d+$/).optional().allow(''),
  cashfree_app_id: Joi.string().max(255).optional().allow(''),
  cashfree_secret_key: Joi.string().max(255).optional().allow(''),
  cashfree_payout_client_id: Joi.string().max(255).optional().allow(''),
  cashfree_payout_client_secret: Joi.string().max(255).optional().allow(''),
  cashfree_env: Joi.string().valid('sandbox', 'prod').optional().allow('')
});

// API key creation validation
export const createApiKeySchema = Joi.object({
  key_name: Joi.string().min(2).max(50).required()
});

// Admin login validation
export const adminLoginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

export function validateRequest(schema: Joi.ObjectSchema, data: any) {
  const { error, value } = schema.validate(data);
  if (error) {
    throw new Error(error.details[0].message);
  }
  return value;
}
