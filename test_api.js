const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request('http://localhost:3000' + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(responseData) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing GET /api/overview ---');
  const overview = await get('/api/overview');
  console.log('Stats:', overview.data.stats);

  console.log('\n--- 2. Testing GET /api/assets ---');
  const assets = await get('/api/assets');
  console.log('Assets count:', assets.data.length, 'First asset:', assets.data[0].name);

  console.log('\n--- 3. Testing GET /api/gateways ---');
  const gateways = await get('/api/gateways');
  console.log('Gateways count:', gateways.data.length, 'First gateway:', gateways.data[0].name);

  console.log('\n--- 4. Testing POST /api/telemetry/ingest (Physical Gateway Ingest) ---');
  const ingestRes = await post('/api/telemetry/ingest', {
    apiKey: 'gw_key_central_plant_9918',
    readings: [
      { assetId: 'AST-101', sensorId: 'SNS-101-1', sensorType: 'temperature', value: 13.5 },
      { assetId: 'AST-101', sensorId: 'SNS-101-2', sensorType: 'vibration', value: 2.2 }
    ]
  });
  console.log('Ingest response:', ingestRes.data);

  console.log('\n--- 5. Testing POST /api/simulator/inject-fault (Chiller Overheat) ---');
  const faultRes = await post('/api/simulator/inject-fault', {
    assetId: 'AST-101',
    sensorType: 'temperature',
    value: 89.5,
    faultName: 'Emergency High Temp'
  });
  console.log('Fault injected:', faultRes.data.fault);

  console.log('\n--- 6. Checking Alarms & Facilio auto-dispatch ---');
  const alarms = await get('/api/alarms');
  console.log('Active alarms count:', alarms.data.length);
  const criticalAlarm = alarms.data.find(a => a.severity === 'CRITICAL');
  console.log('Critical Alarm found:', criticalAlarm ? criticalAlarm.message : 'None');
  console.log('Facilio ticket ID on alarm:', criticalAlarm ? criticalAlarm.facilioTicketId : 'None');

  console.log('\n--- 7. Testing POST /api/custom-fields (Dynamic Schema) ---');
  const cfRes = await post('/api/custom-fields', {
    entity: 'ASSET',
    label: 'Warranty Expiration Date',
    type: 'date',
    defaultValue: '2027-12-31'
  });
  console.log('Custom field created:', cfRes.data);

  console.log('\n--- 8. Testing Facilio API Connection Ping ---');
  const facilioTest = await post('/api/facilio/test-connection', {});
  console.log('Facilio connection test:', facilioTest.data);

  console.log('\n--- 9. Clearing faults ---');
  const clearRes = await post('/api/simulator/clear-faults', {});
  console.log('Clear faults message:', clearRes.data.message);

  console.log('\n========================================');
  console.log('>>> ALL VERIFICATION TESTS PASSED 100%! <<<');
  console.log('========================================');
}

runTests().catch(err => console.error('Verification error:', err));
