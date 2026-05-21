# Tasker Android Integration & Configuration Guide

This guide details how to configure the **Tasker Android Automation app** to intercept mobile payment notifications (e.g. from Google Pay for Business, PhonePe Business, or Paytm Business) and POST them directly to the webhook endpoint.

---

## 📡 Webhook Connection Details

### Primary Endpoint (Recommended)
- **Method**: `POST` (also accepts `GET`, `PUT`, `PATCH`, `DELETE`)
- **Webhook URL**: `https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/bank`
- **Headers**: None required (but `Content-Type: application/json` is recommended)
- **Authentication**: Not required — all requests are accepted and logged
- **Payload Format**: JSON (also accepts URL-encoded, form-data, or raw text)

### Fallback Endpoint (Express Server)
- **Method**: `POST` (also accepts all methods)
- **Webhook URL**: `https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/payment`
- **Note**: This endpoint auto-forwards to the primary endpoint. Use this if you're running the Express webhook-system separately.

> **Important**: The webhook accepts ALL data formats and NEVER rejects a request. Any data you send will be logged and parsed automatically.

---

## 📱 Tasker Step-by-Step Setup

Follow these steps on your Android device to configure automated notifications forwarding.

### 1. Create a Profile (Notification Trigger)
1. Open Tasker, navigate to the **Profiles** tab, and click the **+** icon (bottom right).
2. Select **Event** -> **UI** -> **Notification**.
3. In the event configuration screen:
   - **Owner Application**: Tap and select your business payment apps (e.g. *Google Pay for Business*, *PhonePe Business*, *Paytm for Business*).
   - **Title**: Leave blank (or filter by terms like `Received` if you only want payment receipts).
   - **Text**: Leave blank (this allows Tasker to capture the full raw message).
4. Tap the back button (top left) to save and close the profile. Tasker will prompt you to link an **Action** or **New Task**.

### 2. Create the Task & HTTP Request Action
1. Select **New Task** and name it (e.g., `Ingest Payment Webhook`).
2. Inside the Task editor, tap the **+** button at the bottom center to add a new action.
3. Search for and select **Net** -> **HTTP Request**.
4. In the Action edit screen:
   - **Method**: Set to `POST`.
   - **URL**: Input your webhook endpoint URL:
     - **Primary**: `https://your-domain.com/api/webhooks/bank`
     - **Fallback**: `https://your-domain.com/api/webhooks/payment` (if running Express server separately)
   - **Headers**:
     ```text
     Content-Type: application/json
     ```
     > Note: Headers are optional. The endpoint accepts requests with or without headers.
   - **Body**: In the text area, paste the following structured JSON mapping block using Tasker variables:
     ```json
     {
       "amount": "%evtprm2",
       "time": "%TIME",
       "raw_screen": "%evtprm3|%evtprm2|%evtprm1",
       "source": "gpay_business",
       "timestamp": "%TIMEMS"
     }
     ```
     > [!NOTE]
     > - `%evtprm1` represents the Title of the notification.
     > - `%evtprm2` represents the Text body of the notification (which typically includes the amount, e.g., `+ ₹15`).
     > - `%evtprm3` represents sub-texts/extra info inside the notification container.
     > - Joining them with `|` pipes replicates the exact Google Pay raw screen format.

5. Save the action by tapping the back button.
6. Save and apply Tasker changes by clicking the checkmark icon at the top right of Tasker's main screen.

---

## 🔧 Supported Data Formats

The webhook endpoint accepts **ALL** of the following formats:

| Format | Content-Type | Example |
|--------|-------------|---------|
| JSON | `application/json` | `{"amount": "₹15", "utr": "123456789012"}` |
| URL-encoded | `application/x-www-form-urlencoded` | `amount=%E2%82%B915&utr=123456789012` |
| Form Data | `multipart/form-data` | Standard multipart form |
| Raw Text | `text/plain` | `Received from John | ₹15 | UTR: 123456789012` |
| Query Params (GET) | N/A | `/api/webhooks/bank?amount=15&utr=123456789012` |

---

## 🔍 Local Debugging & Dry Run Testing

To verify the ingestion flow without needing live physical device notifications, you can use:

### Option 1: Admin Dashboard Simulator
1. Open your browser and navigate to `https://your-domain.com/admin/webhooks`.
2. Click the **🧪 Simulate Webhook Payload** button.
3. Fill in the mock amount, sender name, and optional UTR.
4. Click **Dispatch Webhook** and observe the event appear immediately in the table.

### Option 2: cURL Command
```bash
# JSON payload
curl -X POST https://your-domain.com/api/webhooks/bank \
  -H "Content-Type: application/json" \
  -d '{"amount": "+ ₹15", "raw_screen": "Received from Test User|₹15|UTR: 123456789012", "source": "gpay_business"}'

# GET with query params
curl "https://your-domain.com/api/webhooks/bank?amount=15&utr=123456789012&source=test"

# URL-encoded
curl -X POST https://your-domain.com/api/webhooks/bank \
  -d "amount=15&utr=123456789012&source=test&raw_screen=Test+payment"

# Raw text
curl -X POST https://your-domain.com/api/webhooks/bank \
  -H "Content-Type: text/plain" \
  -d "Google Pay Business|Received from Test|₹15|UTR: 123456789012"
```

### Option 3: Express Dashboard (if running locally)
1. Open `http://localhost:3001`.
2. Use the built-in Tasker Payload Simulator.
3. Observe real-time updates via Socket.io.
