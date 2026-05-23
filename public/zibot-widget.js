(function () {
  // Ensure we don't run multiple times
  if (window.__ZiBotLoaded) return;
  window.__ZiBotLoaded = true;

  // 1. Resolve ZTake base URL dynamically from the script tag source
  const currentScript = document.currentScript;
  let baseUrl = 'https://www.ztake.in';
  if (currentScript && currentScript.src) {
    try {
      baseUrl = new URL(currentScript.src).origin;
    } catch (e) {
      console.warn('[ZiBot] Could not parse script URL, defaulting to:', baseUrl);
    }
  }

  // Retrieve vendor API key and bot configuration from window object
  const config = window.ZiBotConfig || {};
  const apiKey = config.apiKey;
  const botName = config.botName || 'ZiBot';

  if (!apiKey) {
    console.error('[ZiBot] Missing apiKey in window.ZiBotConfig. Chatbot will not initialize.');
    return;
  }

  // LocalStorage keys for persistence
  const SESSION_KEY = `zibot_sess_${apiKey.substring(0, 15)}`;

  let sessionId = localStorage.getItem(SESSION_KEY) || '';
  let isWindowOpen = false;
  let activeConfig = { bot_name: botName, is_active: true };

  // Fetch bot configuration from server
  async function fetchConfig() {
    try {
      const res = await fetch(`${baseUrl}/api/v2/chat/config`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          activeConfig = data.config;
          if (!activeConfig.is_active) {
            console.log('[ZiBot] Chatbot is disabled by the vendor.');
            hideWidget();
          } else {
            updateWidgetUI();
          }
        }
      }
    } catch (err) {
      console.error('[ZiBot] Failed to load chatbot config:', err);
    }
  }

  // Create UI Elements
  let stylesElement, bubbleElement, windowElement;

  function injectCSS() {
    stylesElement = document.createElement('style');
    stylesElement.innerHTML = `
      #zibot-widget-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      
      /* Bubble Button */
      .zibot-bubble {
        width: 60px;
        height: 60px;
        border-radius: 30px;
        background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), 0 8px 32px rgba(99, 102, 241, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
        border: none;
        outline: none;
      }
      
      .zibot-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5), 0 12px 40px rgba(99, 102, 241, 0.3);
      }
      
      .zibot-bubble:active {
        transform: scale(0.95);
      }
      
      .zibot-bubble svg {
        width: 28px;
        height: 28px;
        fill: white;
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      
      .zibot-bubble.open svg {
        transform: rotate(90deg) scale(0.85);
      }

      /* Notification Badge */
      .zibot-tooltip {
        position: absolute;
        bottom: 72px;
        right: 0;
        background: white;
        color: #1e293b;
        padding: 8px 14px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border: 1px border-slate-100;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s, transform 0.3s;
      }
      
      .zibot-tooltip.visible {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* Chat Window */
      .zibot-window {
        width: 370px;
        height: 520px;
        max-height: calc(100vh - 120px);
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0,0,0,0.05);
        border: 1px solid rgba(226, 232, 240, 0.8);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-bottom: 16px;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: bottom right;
      }
      
      .zibot-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      
      /* Header styling */
      .zibot-header {
        background: #0f172a;
        color: white;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .zibot-header-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .zibot-avatar {
        width: 36px;
        height: 36px;
        border-radius: 18px;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        color: white;
        box-shadow: 0 2px 6px rgba(99,102,241,0.4);
      }
      
      .zibot-header-title {
        font-size: 14px;
        font-weight: 700;
        margin: 0;
        letter-spacing: 0.2px;
      }
      
      .zibot-header-status {
        font-size: 11px;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        font-weight: 500;
      }
      
      .zibot-header-dot {
        width: 6px;
        height: 6px;
        border-radius: 3px;
        background-color: #10b981;
        display: inline-block;
        box-shadow: 0 0 6px #10b981;
        animation: zibot-pulse 2s infinite;
      }
      
      .zibot-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: color 0.2s, background-color 0.2s;
      }
      
      .zibot-close-btn:hover {
        color: white;
        background: rgba(255,255,255,0.1);
      }
      
      /* Messages Area */
      .zibot-messages {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        background-color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .zibot-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 13px;
        line-height: 1.5;
        word-wrap: break-word;
        box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      }
      
      .zibot-message.bot {
        background-color: #ffffff;
        color: #1e293b;
        align-self: flex-start;
        border-bottom-left-radius: 4px;
        border: 1px solid #f1f5f9;
      }
      
      .zibot-message.user {
        background-color: #4f46e5;
        color: #ffffff;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }
      
      /* Input Area */
      .zibot-input-area {
        padding: 12px 16px;
        background: white;
        border-top: 1px solid #e2e8f0;
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .zibot-input {
        flex: 1;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      
      .zibot-input:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
      }
      
      .zibot-send-btn {
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 12px;
        width: 38px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s, transform 0.2s;
      }
      
      .zibot-send-btn:hover {
        background: #4338ca;
      }
      
      .zibot-send-btn:active {
        transform: scale(0.92);
      }
      
      .zibot-send-btn:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        transform: none;
      }
      
      /* Typing Indicator */
      .zibot-typing {
        display: flex;
        gap: 4px;
        align-items: center;
        padding: 8px 12px;
      }
      
      .zibot-typing-dot {
        width: 6px;
        height: 6px;
        border-radius: 3px;
        background-color: #94a3b8;
        animation: zibot-bounce 1.4s infinite ease-in-out both;
      }
      
      .zibot-typing-dot:nth-child(1) { animation-delay: -0.32s; }
      .zibot-typing-dot:nth-child(2) { animation-delay: -0.16s; }
      
      /* Powered by branding */
      .zibot-branding {
        font-size: 10px;
        color: #94a3b8;
        text-align: center;
        padding: 4px 0 8px 0;
        background-color: #f8fafc;
        border-top: 1px solid #f1f5f9;
        font-weight: 500;
      }
      
      .zibot-branding a {
        color: #6366f1;
        text-decoration: none;
        font-weight: 600;
      }
      
      @keyframes zibot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      @keyframes zibot-pulse {
        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
      
      /* Responsive styling */
      @media (max-width: 480px) {
        #zibot-widget-container {
          bottom: 12px;
          right: 12px;
          left: 12px;
          align-items: stretch;
        }
        
        .zibot-bubble {
          align-self: flex-end;
        }
        
        .zibot-window {
          width: 100%;
          height: calc(100vh - 100px);
          max-height: none;
        }
      }
    `;
    document.head.appendChild(stylesElement);
  }

  function createDOM() {
    const container = document.createElement('div');
    container.id = 'zibot-widget-container';

    // Widget HTML template
    container.innerHTML = `
      <!-- Tooltip -->
      <div class="zibot-tooltip" id="zibot-tooltip">Chat with support</div>

      <!-- Chat window -->
      <div class="zibot-window" id="zibot-window">
        <div class="zibot-header">
          <div class="zibot-header-info">
            <div class="zibot-avatar" id="zibot-avatar">Z</div>
            <div>
              <h4 class="zibot-header-title" id="zibot-title">${botName}</h4>
              <div class="zibot-header-status">
                <span class="zibot-header-dot"></span>
                <span>Support Agent</span>
              </div>
            </div>
          </div>
          <button class="zibot-close-btn" id="zibot-close" aria-label="Close chat">
            <svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
          </button>
        </div>
        
        <!-- Chat log area -->
        <div class="zibot-messages" id="zibot-msg-box">
          <div class="zibot-message bot">
            Hello! I am your support assistant. Ask me questions about your payment statuses, refunds, or transaction queries.
          </div>
        </div>

        <!-- Chat form input -->
        <form class="zibot-input-area" id="zibot-input-form">
          <input type="text" class="zibot-input" id="zibot-text-input" placeholder="Type support question..." autocomplete="off">
          <button type="submit" class="zibot-send-btn" id="zibot-send-button" aria-label="Send message">
            <svg style="width:18px;height:18px;transform:rotate(45deg);margin-right:2px" viewBox="0 0 24 24"><path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/></svg>
          </button>
        </form>

        <!-- Branding label -->
        <div class="zibot-branding">
          Powered by <a href="https://ztake.in" target="_blank" rel="noopener">ZTake Gateway</a>
        </div>
      </div>

      <!-- Bubble toggle button -->
      <button class="zibot-bubble" id="zibot-toggle" aria-label="Open support chat">
        <svg id="zibot-bubble-icon" viewBox="0 0 24 24">
          <path fill="currentColor" d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16Z" />
        </svg>
      </button>
    `;

    document.body.appendChild(container);

    bubbleElement = document.getElementById('zibot-toggle');
    windowElement = document.getElementById('zibot-window');

    // Register event listeners
    bubbleElement.addEventListener('click', toggleChatWindow);
    document.getElementById('zibot-close').addEventListener('click', closeChatWindow);
    document.getElementById('zibot-input-form').addEventListener('submit', handleSend);

    // Initial tooltip display
    setTimeout(() => {
      const tooltip = document.getElementById('zibot-tooltip');
      if (tooltip && !isWindowOpen) {
        tooltip.classList.add('visible');
        setTimeout(() => tooltip.classList.remove('visible'), 5000);
      }
    }, 4000);
  }

  function updateWidgetUI() {
    const title = document.getElementById('zibot-title');
    const avatar = document.getElementById('zibot-avatar');
    if (title) title.innerText = activeConfig.bot_name || 'ZiBot';
    if (avatar) avatar.innerText = (activeConfig.bot_name || 'Z').charAt(0);
  }

  function hideWidget() {
    const container = document.getElementById('zibot-widget-container');
    if (container) container.style.display = 'none';
  }

  function toggleChatWindow() {
    if (isWindowOpen) {
      closeChatWindow();
    } else {
      openChatWindow();
    }
  }

  async function openChatWindow() {
    isWindowOpen = true;
    windowElement.classList.add('open');
    bubbleElement.classList.add('open');
    
    // Change bubble icon to Close
    const icon = document.getElementById('zibot-bubble-icon');
    if (icon) {
      icon.innerHTML = `<path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>`;
    }

    // Load history if sessionId exists
    if (sessionId) {
      loadHistory();
    }

    // Scroll to bottom
    scrollToBottom();
    
    // Focus input
    setTimeout(() => document.getElementById('zibot-text-input').focus(), 150);
  }

  function closeChatWindow() {
    isWindowOpen = false;
    windowElement.classList.remove('open');
    bubbleElement.classList.remove('open');
    
    // Restore chat icon
    const icon = document.getElementById('zibot-bubble-icon');
    if (icon) {
      icon.innerHTML = `<path fill="currentColor" d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16Z" />`;
    }
  }

  function appendMessage(role, text) {
    const msgBox = document.getElementById('zibot-msg-box');
    if (!msgBox) return;

    // Remove any typing indicators
    const indicator = document.getElementById('zibot-typing-indicator');
    if (indicator) indicator.remove();

    const msg = document.createElement('div');
    msg.className = `zibot-message ${role}`;
    msg.innerText = text;
    msgBox.appendChild(msg);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const msgBox = document.getElementById('zibot-msg-box');
    if (!msgBox || document.getElementById('zibot-typing-indicator')) return;

    const ind = document.createElement('div');
    ind.id = 'zibot-typing-indicator';
    ind.className = 'zibot-message bot';
    ind.innerHTML = `
      <div class="zibot-typing">
        <div class="zibot-typing-dot"></div>
        <div class="zibot-typing-dot"></div>
        <div class="zibot-typing-dot"></div>
      </div>
    `;
    msgBox.appendChild(ind);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('zibot-typing-indicator');
    if (indicator) indicator.remove();
  }

  function scrollToBottom() {
    const msgBox = document.getElementById('zibot-msg-box');
    if (msgBox) {
      msgBox.scrollTop = msgBox.scrollHeight;
    }
  }

  // Fetch session history from endpoint
  async function loadHistory() {
    try {
      const res = await fetch(`${baseUrl}/api/v2/chat/history?session_id=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
          const msgBox = document.getElementById('zibot-msg-box');
          if (msgBox) {
            msgBox.innerHTML = ''; // Clear default greeting if history exists
            data.messages.forEach(msg => {
              appendMessage(msg.role, msg.content);
            });
          }
        }
      }
    } catch (err) {
      console.warn('[ZiBot] Error restoring conversation logs:', err);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const input = document.getElementById('zibot-text-input');
    const sendBtn = document.getElementById('zibot-send-button');
    const text = input.value.trim();

    if (!text || input.disabled) return;

    // Append user message immediately
    appendMessage('user', text);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    // Show typing state
    showTypingIndicator();

    try {
      const res = await fetch(`${baseUrl}/api/v2/chat/webhook?format=json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionId
        })
      });

      const data = await res.json();
      removeTypingIndicator();

      if (data.success) {
        appendMessage('bot', data.reply);
        if (data.session_id && data.session_id !== sessionId) {
          sessionId = data.session_id;
          localStorage.setItem(SESSION_KEY, sessionId);
        }
      } else {
        appendMessage('bot', `Error: ${data.error || 'Failed to generate response.'}`);
      }
    } catch (err) {
      removeTypingIndicator();
      appendMessage('bot', 'Failed to connect. Please check your network connection.');
    } finally {
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Initialize
  injectCSS();
  createDOM();
  fetchConfig();
})();
