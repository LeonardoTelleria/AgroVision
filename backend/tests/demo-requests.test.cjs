const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test';
const prisma = require('../src/shared/database/prisma.ts').default;
const { demoRequestRoutes } = require('../src/modules/demo-requests/demoRequestRoutes.ts');

test('Demo: consentimiento, validación y confirmación solo tras guardar', async () => {
  const original = prisma.demoRequest.create;
  let calls = 0;
  let fail = false;
  prisma.demoRequest.create = async () => {
    calls++;
    if (fail) throw new Error('private database details');
    return { id: 1 };
  };
  const app = express();
  app.use(express.json());
  app.use('/api/demo-requests', demoRequestRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/demo-requests`;
  const valid = { name: 'Productor', email: 'persona@example.com', message: 'Quiero conocer el monitoreo de parcelas.', consent: 'true' };
  const post = body => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    for (const body of [{}, { ...valid, consent: undefined }, { ...valid, email: 'incorrecto' }, { ...valid, name: '  ' }, { ...valid, message: 'x'.repeat(2001) }]) {
      assert.equal((await post(body)).status, 400);
    }
    assert.equal(calls, 0, 'No guardar datos inválidos ni solicitudes sin consentimiento');
    let response = await post(valid);
    assert.equal(response.status, 201);
    assert.deepEqual((await response.json()).data, { id: 1 });
    fail = true;
    response = await post(valid);
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.success, false);
    assert.ok(!JSON.stringify(result).includes('private database details'));
    assert.equal((await fetch(url)).status, 404, 'No exponer un listado público de solicitudes');
  } finally {
    prisma.demoRequest.create = original;
    await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
  }
});
