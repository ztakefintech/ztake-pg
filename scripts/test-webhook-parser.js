// scripts/test-webhook-parser.js
// To run: node scripts/test-webhook-parser.js

// We'll require the TypeScript file since ts-node is not needed if we transpile on the fly or just import it 
// dynamically, or since it is simple TS, we can mock the exact function in JavaScript to verify the parsing logic, 
// or register ts-node. Let's register ts-node dynamically to run the TS parser directly!

try {
  require('ts-node').register();
} catch (e) {
  // If ts-node is not installed, we can fall back to using a mock of the TS parser code or just require it if Next.js allows it.
}

const path = require('path');
// Since Node can't require .ts easily without ts-node, we'll write a pure JS mock of our parsing function 
// to verify the logic, OR compile it. Actually, let's read the ts file and run its javascript equivalent!
const fs = require('fs');

const tsFileContent = fs.readFileSync(path.join(__dirname, '../lib/webhooks/parse-bank-payload.ts'), 'utf8');

// Simple transpile: remove types and interfaces
const jsCode = tsFileContent
  .replace(/export interface ParsedPayment {[\s\S]*?}/g, '')
  .replace(/export function parseBankWebhookPayload\([\s\S]*?\): ParsedPayment/g, 'function parseBankWebhookPayload(payload)')
  .replace(/:\s*string\s*\|\s*null/g, '')
  .replace(/:\s*number\s*\|\s*null/g, '')
  .replace(/:\s*Date\s*\|\s*null/g, '')
  .replace(/:\s*string/g, '')
  .replace(/:\s*number/g, '')
  .replace(/let\s+utr\s*:\s*string\s*\|\s*null/g, 'let utr')
  .replace(/let\s+google_txn_id\s*:\s*string\s*\|\s*null/g, 'let google_txn_id')
  .replace(/let\s+sender_name\s*:\s*string\s*\|\s*null/g, 'let sender_name')
  .replace(/let\s+payment_method\s*:\s*string\s*\|\s*null/g, 'let payment_method')
  .replace(/let\s+payment_app\s*:\s*string\s*\|\s*null/g, 'let payment_app')
  .replace(/let\s+customer_paid\s*:\s*number\s*\|\s*null/g, 'let customer_paid')
  .replace(/let\s+mdr_gst\s*:\s*number\s*\|\s*null/g, 'let mdr_gst')
  .replace(/let\s+amount_received\s*:\s*number\s*\|\s*null/g, 'let amount_received')
  .replace(/let\s+amount\s*:\s*number\s*\|\s*null/g, 'let amount')
  .replace(/const\s+cleanAmount\s*=\s*rawAmount.replace\(\/\[\+\\-\s₹,\]\/g,\s*''\);/g, "const cleanAmount = rawAmount.replace(/[+\\-\\s₹,]/g, '');")
  .replace(/const\s+val\s*=\s*lines\[i\s*\+\s*1\]\.replace\(\/\[₹,\\s\]\/g,\s*''\)\.trim\(\);/g, "const val = lines[i + 1].replace(/[₹,\\s]/g, '').trim();");

// Evaluate the javascript code to test it!
const sandbox = {};
eval(jsCode + '\nsandbox.parseBankWebhookPayload = parseBankWebhookPayload;');

const testPayload = {
  "amount": "+ ₹15",
  "time": "19 May, 9:28 am",
  "raw_screen": "Back|Show menu|Received from GAURAV S S|19 May, 9:28 am|₹15 credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nWallet\nUPI Transaction ID\n652603702065\nGoogle Transaction ID\nCICAgNjO9uHwNA\nPaid via\nExternal app\nCustomer paid\n₹15\nMDR + GST\n₹0\nFees charged on other payment methods like RuPay cards or wallets. Learn more\nAmount you get\n₹15|Learn more",
  "source": "gpay_business",
  "timestamp": "1779163139"
};

console.log("=== Testing Webhook Payload Parser ===");
console.log("Incoming Payload:", JSON.stringify(testPayload, null, 2));
console.log("\nRunning parseBankWebhookPayload...");

const result = sandbox.parseBankWebhookPayload(testPayload);

console.log("\n=== Parsed Results ===");
console.log("UTR (UPI ID):      ", result.utr, "  [Expected: '652603702065']");
console.log("Google Txn ID:    ", result.google_txn_id, "  [Expected: 'CICAgNjO9uHwNA']");
console.log("Amount:            ", result.amount, "  [Expected: 15]");
console.log("Payment Type:      ", result.payment_type, "  [Expected: 'credit']");
console.log("Sender Name:       ", result.sender_name, "  [Expected: 'GAURAV S S']");
console.log("Payment App:       ", result.payment_app, "  [Expected: 'PhonePe']");
console.log("Payment Method:    ", result.payment_method, "  [Expected: 'Wallet']");
console.log("Customer Paid:     ", result.customer_paid, "  [Expected: 15]");
console.log("MDR + GST:         ", result.mdr_gst, "  [Expected: 0]");
console.log("Amount Received:   ", result.amount_received, "  [Expected: 15]");
console.log("Paid At:           ", result.paid_at ? result.paid_at.toISOString() : null);
console.log("Source:            ", result.source);
console.log("Raw Amount String: ", result.raw_amount_string);

// Verify exact values
const isOk = 
  result.utr === '652603702065' &&
  result.google_txn_id === 'CICAgNjO9uHwNA' &&
  result.amount === 15 &&
  result.payment_type === 'credit' &&
  result.sender_name === 'GAURAV S S' &&
  result.payment_app === 'PhonePe' &&
  result.payment_method === 'Wallet' &&
  result.customer_paid === 15 &&
  result.mdr_gst === 0 &&
  result.amount_received === 15;

if (isOk) {
  console.log("\n✅ SUCCESS: All fields parsed 100% correctly!");
} else {
  console.log("\n❌ FAILURE: Mismatched fields detected!");
  process.exit(1);
}
