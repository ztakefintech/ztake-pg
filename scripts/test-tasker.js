async function test() {
  const url = process.argv[2] || 'http://localhost:3000/api/webhooks/bank';
  
  const body = `{
  "amount": "₹150",
  "time": "12.30",
  "raw_screen": "Google Pay Business\nReceived from Karthik\n₹150\nUTR: 123456789012",
  "source": "gpay_business",
  "timestamp": "12345678"
}`;

  console.log('Sending to', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Tasker',
      'x-api-key': '5ac5024706c3e5c81d6fc5437452469f897177637c35aa129ee3ead3f1bd9fa8'
    },
    body: body
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
test();
