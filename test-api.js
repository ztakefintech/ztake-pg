import fetch from 'node-fetch';

async function testApi() {
  try {
    const response = await fetch('http://localhost:3000/api/payments/update', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer pk_BzXgksssdY2HpCGJkxYTIDj87LbeuHtZ',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        utr: '690518190930',
        amount: 100.50,
        vendor_id: 1
      })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();
