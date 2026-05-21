import { parseBankWebhookPayload } from '../lib/webhooks/parse-bank-payload';

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

const result = parseBankWebhookPayload(testPayload);

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
