import http from 'http';

const rows = [];
for (let i = 0; i < 5000; i++) {
  rows.push({
    customer: "Test Customer " + i,
    stt: i.toString(),
    product: "Product " + i,
    product_group: "Group " + (i % 10),
    operation: "Op " + (i % 5),
    dinh_muc: (Math.random() * 100).toFixed(2)
  });
}

const data = JSON.stringify({ rows });
console.log(`Sending ${data.length} bytes of data...`);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/import-excel/master-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // Add a dummy token if needed, but for now let's see if we get 403 or 500 or 201
    // The server has verifyToken, so we might need a token.
    // However, if we get 403, it means the payload was accepted!
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
