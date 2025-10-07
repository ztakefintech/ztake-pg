# Telegram Bot Token Integration Guide

This guide explains how to use the new BOT_TOKEN feature in the ztake payment system.

## Overview

The BOT_TOKEN feature allows each vendor to configure their own Telegram bot token, enabling personalized bot notifications and updates for that specific vendor.

## Setting Up Bot Token

### 1. Get Bot Token from Telegram

1. Open Telegram and search for `@BotFather`
2. Start a conversation with BotFather
3. Use `/newbot` command to create a new bot
4. Follow the instructions to set up your bot
5. BotFather will provide you with a bot token in the format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Configure Bot Token in Profile

1. Log in to your vendor account
2. Go to the Profile section
3. Scroll down to the "Telegram Bot Token" field
4. Enter your bot token (it will be hidden for security)
5. Click "Save Changes"

## API Endpoints for Bot Scripts

### 1. Get Bot Token (Simple)

**Endpoint:** `GET /api/vendor/bot-token?vendor_id={vendor_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "vendor_id": 1,
    "business_name": "My Business",
    "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
  }
}
```

### 2. Get Bot Token (Secure with API Key)

**Endpoint:** `GET /api/vendor/bot-token-secure?vendor_id={vendor_id}`

**Headers:**
```
Authorization: Bearer your_api_key_here
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vendor_id": 1,
    "business_name": "My Business",
    "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chat_id": "123456789"
  }
}
```

**Security:** This endpoint uses API key authentication (same as `/api/payments/update`) for secure access to bot tokens and chat IDs.

## Bot Script Integration

### Example Python Bot Script

```python
import requests
import asyncio
from telegram import Bot

# Configuration
API_BASE_URL = "https://your-domain.com"
VENDOR_ID = 1
API_KEY = "your_api_key_here"  # API key for secure endpoint

async def get_vendor_bot_token():
    """Fetch bot token for specific vendor"""
    try:
        # Use secure endpoint with API key
        headers = {"Authorization": f"Bearer {API_KEY}"}
        
        response = requests.get(
            f"{API_BASE_URL}/api/vendor/bot-token-secure",
            params={"vendor_id": VENDOR_ID},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            return data["data"]["bot_token"]
        else:
            print(f"Error fetching bot token: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

async def send_notification(message):
    """Send notification using vendor's bot token"""
    bot_token = await get_vendor_bot_token()
    if not bot_token:
        print("Failed to get bot token")
        return
    
    bot = Bot(token=bot_token)
    
    # Replace with actual chat ID
    chat_id = "YOUR_CHAT_ID"
    
    try:
        await bot.send_message(chat_id=chat_id, text=message)
        print("Notification sent successfully")
    except Exception as e:
        print(f"Failed to send notification: {e}")

# Example usage
if __name__ == "__main__":
    asyncio.run(send_notification("Payment received for vendor!"))
```

### Example Node.js Bot Script

```javascript
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

const API_BASE_URL = 'https://your-domain.com';
const VENDOR_ID = 1;
const API_KEY = 'your_api_key_here'; // API key for secure endpoint

async function getVendorBotToken() {
    try {
        const headers = { 'Authorization': `Bearer ${API_KEY}` };
        
        const response = await axios.get(
            `${API_BASE_URL}/api/vendor/bot-token-secure`,
            {
                params: { vendor_id: VENDOR_ID },
                headers
            }
        );
        
        return response.data.data.bot_token;
    } catch (error) {
        console.error('Error fetching bot token:', error.message);
        return null;
    }
}

async function sendNotification(message) {
    const botToken = await getVendorBotToken();
    if (!botToken) {
        console.log('Failed to get bot token');
        return;
    }
    
    const bot = new TelegramBot(botToken, { polling: false });
    const chatId = 'YOUR_CHAT_ID'; // Replace with actual chat ID
    
    try {
        await bot.sendMessage(chatId, message);
        console.log('Notification sent successfully');
    } catch (error) {
        console.error('Failed to send notification:', error.message);
    }
}

// Example usage
sendNotification('Payment received for vendor!');
```

## Security Considerations

1. **Bot Token Security**: Bot tokens are stored securely in the database and are masked in the UI
2. **API Key Authentication**: Use the secure endpoint with API keys for production environments
3. **Vendor Isolation**: Each vendor can only access their own bot token
4. **Token Validation**: Bot tokens are validated using the standard Telegram format

## Error Handling

The API returns appropriate error messages for common scenarios:

- `400`: Missing vendor_id parameter
- `401`: Invalid or missing API key (secure endpoint only)
- `404`: Vendor not found or bot token not configured
- `500`: Server error

## Database Schema

The `bot_token` field has been added to the `vendors` table:

```sql
ALTER TABLE vendors ADD COLUMN bot_token VARCHAR(255);
```

## Validation

Bot tokens are validated using the pattern: `^\d+:[A-Za-z0-9_-]{35}$`

This ensures the token follows the standard Telegram bot token format.
