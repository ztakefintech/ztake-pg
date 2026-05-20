// scripts/test-clean.ts
import { parseBankWebhookPayload } from '../lib/webhooks/parse-bank-payload';

// Payload 1: Original GPay payload (MDR + GST, 12-digit UTR on next line)
const payload1 = {
  "amount": "+ ₹15",
  "time": "19 May, 9:28 am",
  "raw_screen": "Back|Show menu|Received from GAURAV S S|19 May, 9:28 am|₹15 credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nWallet\nUPI Transaction ID\n652603702065\nGoogle Transaction ID\nCICAgNjO9uHwNA\nPaid via\nExternal app\nCustomer paid\n₹15\nMDR + GST\n₹0\nFees charged on other payment methods like RuPay cards or wallets. Learn more\nAmount you get\n₹15|Learn more",
  "source": "gpay_business",
  "timestamp": "1779163139"
};

// Payload 2: New GPay payload (no MDR+GST, UPI payment method, 12-digit UTR on next line)
const payload2 = {
  "amount": "+ ₹5",
  "time": "21 May, 4:14 am",
  "raw_screen": "Back|Show menu|Received from RANJEET K R|21 May, 4:14 am|₹5 credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n039518224994\nGoogle Transaction ID\nCICAgJimob3MYg\nPaid via\nExternal app\nCustomer paid\n₹5\nAmount you get\n₹5",
  "source": "gpay_business",
  "timestamp": "1779317079"
};

// Payload 3: Same-line UTR and Google Transaction ID
const payload3 = {
  "amount": "+ ₹100",
  "time": "21 May, 4:20 am",
  "raw_screen": "Received from JOHN DOE|₹100 credited|Payment from PhonePe|UPI Transaction ID: 987654321012\nGoogle Transaction ID - CICAgSomeGoogleId\nPayment method: UPI",
  "source": "gpay_business",
  "timestamp": "1779317080"
};

console.log("=== Running Hardened Webhook Payload Parser Tests ===");

console.log("\n--- Testing Payload 1 (Gaurav S S - ₹15) ---");
const res1 = parseBankWebhookPayload(payload1);
console.log(JSON.stringify(res1, null, 2));

console.log("\n--- Testing Payload 2 (RANJEET K R - ₹5) ---");
const res2 = parseBankWebhookPayload(payload2);
console.log(JSON.stringify(res2, null, 2));

console.log("\n--- Testing Payload 3 (Same-line - ₹100) ---");
const res3 = parseBankWebhookPayload(payload3);
console.log(JSON.stringify(res3, null, 2));

// Assertions
const ok1 = 
  res1.utr === "652603702065" && 
  res1.google_txn_id === "CICAgNjO9uHwNA" && 
  res1.amount === 15 && 
  res1.sender_name === "GAURAV S S" &&
  res1.payment_app === "PhonePe" &&
  res1.payment_method === "Wallet";

const ok2 = 
  res2.utr === "039518224994" && 
  res2.google_txn_id === "CICAgJimob3MYg" && 
  res2.amount === 5 && 
  res2.sender_name === "RANJEET K R" &&
  res2.payment_app === "PhonePe" &&
  res2.payment_method === "UPI";

const ok3 = 
  res3.utr === "987654321012" && 
  res3.google_txn_id === "CICAgSomeGoogleId" && 
  res3.amount === 100 && 
  res3.sender_name === "JOHN DOE" &&
  res3.payment_app === "PhonePe" &&
  res3.payment_method === "UPI";

if (ok1 && ok2 && ok3) {
  console.log("\n✅ ALL TESTS PASSED: Hardened parser extracted 100% correct data for all styles.");
} else {
  console.error("\n❌ TESTS FAILED!");
  console.log("ok1:", ok1);
  console.log("ok2:", ok2);
  console.log("ok3:", ok3);
  process.exit(1);
}
