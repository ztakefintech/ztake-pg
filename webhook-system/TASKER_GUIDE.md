# Tasker Android Integration & Configuration Guide

This guide details how to configure the **Tasker Android Automation app** to intercept mobile payment notifications (e.g. from Google Pay for Business, PhonePe Business, or Paytm Business) and POST them directly to the Webhook Ingestion server.

---

## 📡 Webhook Connection Details

- **Method**: `POST`
- **Webhook URL**: `https://<YOUR_DEPLOYED_DOMAIN>/api/webhooks/payment`
- **Headers**:
  - `Content-Type: application/json`
- **Payload Format**: Raw JSON string

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
   - **URL**: Input your webhook endpoint URL, e.g., `https://your-domain.com/api/webhooks/payment` (for local dev testing, you can use a tunnel like ngrok pointing to port `3001`).
   - **Headers**:
     ```text
     Content-Type: application/json
     ```
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

## 🔍 Local Debugging & Dry Run Testing

To verify the ingestion flow without needing live physical device notifications, you can use the **Payload Simulator** built directly into the Webhook Dashboard:

1. Open your browser and navigate to `http://localhost:3001` (or your deployed URL).
2. Fill in the mock amount and customer name in the **Tasker Payload Simulator** block.
3. Click **Inject Test Webhook**.
4. Observe the live charts, stats counter, and detailed tables update instantaneously in the UI while checking the **Realtime Diagnostic Logs** panel to trace the SQL insert and socket broadcast status.
