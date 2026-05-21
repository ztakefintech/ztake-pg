// routes/webhook.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook');
const { rawBodyParser, requestLogger } = require('../middleware/logger');

// Middleware chain applied to the webhook post route:
// 1. Raw body parser (converts incoming stream to req.rawBody and parses if possible)
// 2. Request logger (prints diagnostics to console)
// 3. Webhook receiver (performs database save, real-time broadcasts, and sends HTTP response)
router.all('/payment', rawBodyParser, requestLogger, webhookController.receiveWebhook);

// Status test endpoint
router.get('/test', webhookController.testWebhook);

// Fetch logs for dashboard hydration
router.get('/logs', webhookController.getWebhookLogs);

// Delete logs endpoint
router.delete('/clear', webhookController.clearWebhookLogs);

module.exports = router;
