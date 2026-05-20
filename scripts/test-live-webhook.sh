#!/bin/bash
# test-live-webhook.sh — Send a test webhook to the live endpoint
# Usage: ./scripts/test-live-webhook.sh [URL]
#
# Default URL: https://ztake.in/api/webhooks/bank
# Override: ./scripts/test-live-webhook.sh http://localhost:3000/api/webhooks/bank

set -euo pipefail

URL="${1:-https://ztake.in/api/webhooks/bank}"
TIMESTAMP=$(date +%s)

echo "============================================"
echo "  Webhook Pipeline Test"
echo "============================================"
echo ""

# Test 1: GET health check
echo "▸ Test 1: GET health check → $URL"
echo "---"
HTTP_CODE=$(curl -sL -o /tmp/webhook_get_response.json -w "%{http_code}" "$URL")
cat /tmp/webhook_get_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/webhook_get_response.json
echo ""
echo "  HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Health check PASSED"
else
  echo "  ✗ Health check FAILED (expected 200, got $HTTP_CODE)"
fi
echo ""

# Test 2: POST a realistic GPay Business payload
echo "▸ Test 2: POST test webhook payload → $URL"
echo "---"
PAYLOAD=$(cat <<EOF
{
  "amount": "+ ₹25",
  "time": "21 May, 4:30 am",
  "raw_screen": "Back|Show menu|Received from TEST USER|21 May, 4:30 am|₹25 credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n999900001111\nGoogle Transaction ID\nCICAgTestTxn123\nPaid via\nExternal app\nCustomer paid\n₹25\nMDR + GST\n₹0\nAmount you get\n₹25",
  "source": "gpay_business",
  "timestamp": "$TIMESTAMP"
}
EOF
)

echo "  Sending payload ($(echo "$PAYLOAD" | wc -c | tr -d ' ') bytes)..."
HTTP_CODE=$(curl -sL -o /tmp/webhook_post_response.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "User-Agent: TestScript/1.0" \
  -d "$PAYLOAD" \
  "$URL")

cat /tmp/webhook_post_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/webhook_post_response.json
echo ""
echo "  HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ POST webhook PASSED"
else
  echo "  ✗ POST webhook FAILED (expected 200, got $HTTP_CODE)"
fi
echo ""

# Test 3: POST with no UTR (edge case)
echo "▸ Test 3: POST minimal payload (no raw_screen) → $URL"
echo "---"
MINIMAL_PAYLOAD=$(cat <<EOF
{
  "amount": "+ ₹10",
  "time": "21 May, 4:31 am",
  "source": "gpay_business",
  "timestamp": "$TIMESTAMP"
}
EOF
)

HTTP_CODE=$(curl -sL -o /tmp/webhook_minimal_response.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$MINIMAL_PAYLOAD" \
  "$URL")

cat /tmp/webhook_minimal_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/webhook_minimal_response.json
echo ""
echo "  HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Minimal payload PASSED"
else
  echo "  ✗ Minimal payload FAILED"
fi
echo ""

# Test 4: POST with bad JSON
echo "▸ Test 4: POST invalid JSON → $URL"
echo "---"
HTTP_CODE=$(curl -sL -o /tmp/webhook_bad_response.json -w "%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "this is not json" \
  "$URL")

cat /tmp/webhook_bad_response.json | python3 -m json.tool 2>/dev/null || cat /tmp/webhook_bad_response.json
echo ""
echo "  HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "400" ]; then
  echo "  ✓ Bad JSON correctly rejected with 400"
else
  echo "  ✗ Bad JSON test unexpected status: $HTTP_CODE"
fi
echo ""

echo "============================================"
echo "  All tests complete!"
echo "  Check the admin dashboard at:"
echo "  https://ztake.in/admin/webhooks"
echo "============================================"
