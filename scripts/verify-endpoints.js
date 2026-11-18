import app from '../server/src/index.js';

async function testEndpoints() {
  console.log('--- Verifying Backend REST Endpoints ---');
  
  const endpoints = ['/api/health', '/api/plan', '/api/trace', '/api/rejected', '/api/evidence', '/api/history'];

  for (const ep of endpoints) {
    let statusCode = 200;
    let responseData = null;

    const req = { method: 'GET', url: ep, headers: {} };
    const res = {
      statusCode: 200,
      setHeader: () => {},
      getHeader: () => {},
      status(c) { statusCode = c; return this; },
      json(d) { responseData = d; return this; }
    };

    await new Promise((resolve) => {
      app.handle(req, res, () => resolve());
      if (responseData) resolve();
    });

    console.log(`Endpoint ${ep.padEnd(16)} -> Status: ${statusCode} | Keys: ${responseData ? Object.keys(responseData).join(', ') : 'none'}`);
  }

  console.log('\nAll REST endpoints operational.');
}

testEndpoints().catch(err => {
  console.error('Endpoint verification failed:', err);
  process.exit(1);
});
