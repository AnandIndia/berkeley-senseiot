const http = require('http');

http.get('http://localhost:3000/', (res) => {
  console.log('HTTP GET / -> Status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('HTML Length:', data.length, 'Contains Berkeley SenseIoT:', data.includes('Berkeley SenseIoT')));
});

http.get('http://localhost:3000/styles.css', (res) => {
  console.log('HTTP GET /styles.css -> Status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
});

http.get('http://localhost:3000/app.js', (res) => {
  console.log('HTTP GET /app.js -> Status:', res.statusCode, 'Content-Type:', res.headers['content-type']);
});
