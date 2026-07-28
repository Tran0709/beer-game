const WebSocket = require('ws');

function connect(room) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:8787?room=${room}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

(async () => {
  // Test 1: two clients in the SAME room — A sends, B should receive; A should NOT receive its own message
  const a = await connect('TESTROOM');
  const b = await connect('TESTROOM');
  await new Promise(r => setTimeout(r, 200));

  let bReceived = null, aReceivedOwn = false;
  b.on('message', (data) => { bReceived = JSON.parse(data.toString()); });
  a.on('message', () => { aReceivedOwn = true; });

  a.send(JSON.stringify({ type: 'hello', from: 'A' }));
  await new Promise(r => setTimeout(r, 300));

  console.log('B received A\'s message:', JSON.stringify(bReceived));
  console.log('A did NOT receive its own message (should be false):', aReceivedOwn);

  // Test 2: a client in a DIFFERENT room should NOT see messages from TESTROOM
  const c = await connect('OTHERROOM');
  let cReceived = false;
  c.on('message', () => { cReceived = true; });
  a.send(JSON.stringify({ type: 'should_not_cross_rooms' }));
  await new Promise(r => setTimeout(r, 300));
  console.log('client in a different room did NOT receive cross-room message:', !cReceived);

  // Test 3: bidirectional — B sends, A should receive
  let aReceivedFromB = null;
  a.removeAllListeners('message');
  a.on('message', (data) => { aReceivedFromB = JSON.parse(data.toString()); });
  b.send(JSON.stringify({ type: 'reply', from: 'B' }));
  await new Promise(r => setTimeout(r, 300));
  console.log('A received B\'s reply (bidirectional):', JSON.stringify(aReceivedFromB));

  // Test 4: room cleanup after disconnect
  a.close(); b.close(); c.close();
  await new Promise(r => setTimeout(r, 300));
  const health = await fetch('http://localhost:8787/').then(r => r.text());
  console.log('rooms empty after all disconnect:', health.includes('(none)'));

  process.exit(0);
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
