// middleware/logger.js

/**
 * Capture raw body text for every request, regardless of Content-Type.
 * This is crucial for Tasker payloads which are sometimes sent as application/json
 * but encoded as raw text, or text/plain, or urlencoded without proper parsing.
 */
const rawBodyParser = (req, res, next) => {
  const method = req.method;
  
  if (method === 'GET' || method === 'HEAD') {
    req.rawBody = req.url.split('?')[1] || '';
    req.parsedBody = req.query || {};
    return next();
  }

  let data = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    
    // Attempt parsing based on content-type or raw contents
    req.parsedBody = {};
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    const trimmedData = data.trim();

    if (trimmedData) {
      // 1. Try parsing as JSON (always, as Tasker content types can be misconfigured)
      try {
        req.parsedBody = JSON.parse(trimmedData);
      } catch (jsonErr) {
        // 2. If JSON fails, try URLSearchParams (for form urlencoded)
        if (trimmedData.includes('=') && !trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
          try {
            const params = new URLSearchParams(trimmedData);
            const obj = {};
            for (const [key, value] of params.entries()) {
              obj[key] = value;
            }
            req.parsedBody = obj;
          } catch (urlErr) {
            // Fallback: treat raw body as raw_screen
            req.parsedBody = { raw_screen: trimmedData, source: 'raw_text' };
          }
        } else {
          // 3. Fallback: treat as raw text
          req.parsedBody = { raw_screen: trimmedData, source: 'raw_text' };
        }
      }
    }
    
    // Merge query parameters as fallback
    req.parsedBody = {
      ...(req.query || {}),
      ...req.parsedBody
    };
    
    next();
  });
};

/**
 * Detailed request logging middleware to print ingestion metadata to the server console.
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const contentType = req.headers['content-type'] || 'none';

  console.log(`\n================== 📥 INCOMING REQUEST [${timestamp}] ==================`);
  console.log(`🌐 Route:        ${method} ${url}`);
  console.log(`🔌 Client IP:    ${ip}`);
  console.log(`📄 Content-Type: ${contentType}`);
  console.log(`------------------------------ HEADERS ------------------------------`);
  console.log(JSON.stringify(req.headers, null, 2));
  console.log(`----------------------------- RAW BODY -----------------------------`);
  console.log(req.rawBody || '[Empty Body]');
  console.log(`--------------------------- PARSED PAYLOAD ---------------------------`);
  console.log(JSON.stringify(req.parsedBody, null, 2));
  console.log('=====================================================================\n');
  
  next();
};

module.exports = {
  rawBodyParser,
  requestLogger
};
