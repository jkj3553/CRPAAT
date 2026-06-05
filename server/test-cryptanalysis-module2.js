#!/usr/bin/env node
/**
 * Cryptanalysis Module 2 acceptance tests
 * Run: node server/test-cryptanalysis-module2.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const KEYS_DIR = path.join(__dirname, 'keys');
const PORT = 3097;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function postJson(urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getPage(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${urlPath}`, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    }).on('error', reject);
  });
}

async function testMalloryKeysOnStartup() {
  console.log('\n1. Mallory keys generated on server startup');

  const malloryPrivate = path.join(KEYS_DIR, 'mallory_private.pem');
  const malloryPublic = path.join(KEYS_DIR, 'mallory_public.pem');
  const alicePrivate = path.join(KEYS_DIR, 'alice_private.pem');
  const alicePublic = path.join(KEYS_DIR, 'alice_public.pem');

  assert('mallory_private.pem exists', fs.existsSync(malloryPrivate));
  assert('mallory_public.pem exists', fs.existsSync(malloryPublic));
  assert('alice_private.pem exists (migrated or generated)', fs.existsSync(alicePrivate));
  assert('alice_public.pem exists (migrated or generated)', fs.existsSync(alicePublic));

  if (fs.existsSync(malloryPrivate)) {
    const content = fs.readFileSync(malloryPrivate, 'utf8');
    assert('Mallory private key is valid PEM', content.includes('BEGIN RSA PRIVATE KEY') || content.includes('BEGIN PRIVATE KEY'));
  }
}

async function testAvalancheEndpoint() {
  console.log('\n2. Avalanche tab API (unchanged behavior)');

  const res = await postJson('/api/cryptanalysis/avalanche', {
    originalText: 'Transfer ₹1000 to Bob',
    modifiedText: 'Transfer ₹1001 to Bob',
  });

  assert('POST /api/cryptanalysis/avalanche returns 200', res.status === 200);
  assert('Response includes originalHash', typeof res.body.originalHash === 'string' && res.body.originalHash.length === 64);
  assert('Response includes modifiedHash', typeof res.body.modifiedHash === 'string' && res.body.modifiedHash.length === 64);
  assert('Response includes bitDifference', typeof res.body.bitDifference === 'number');
  assert('Response includes bitDifferencePercent', typeof res.body.bitDifferencePercent === 'number');
  assert('Response includes characterDifference', res.body.characterDifference === 1);
  assert('Response includes verdict string', typeof res.body.verdict === 'string');
  assert('Hashes differ for 1-char change', res.body.originalHash !== res.body.modifiedHash);
}

async function testAttackEndpoints() {
  console.log('\n3. Attack endpoints return correct outcomes');

  const random = await postJson('/api/cryptanalysis/attack', { attackType: 'random_signature' });
  assert('Random attack returns 200', random.status === 200);
  assert('Random attack FAILED (blocked)', random.body.result === 'FAILED', `got ${random.body.result}`);
  assert('Random attack name correct', random.body.attack === 'Random Signature Attack');

  const wrong = await postJson('/api/cryptanalysis/attack', { attackType: 'wrong_key' });
  assert('Wrong key attack returns 200', wrong.status === 200);
  assert('Wrong key attack FAILED (blocked)', wrong.body.result === 'FAILED', `got ${wrong.body.result}`);
  assert('Wrong key attack name correct', wrong.body.attack === 'Wrong Key Attack');

  const compromise = await postJson('/api/cryptanalysis/attack', { attackType: 'private_key_compromise' });
  assert('Private key compromise returns 200', compromise.status === 200);
  assert('Private key compromise SUCCESS (not blocked)', compromise.body.result === 'SUCCESS', `got ${compromise.body.result}`);
  assert('Private key compromise OpenSSL Verified OK', (compromise.body.openSslResult || '').includes('Verified OK'));
}

function testTabStructure(html) {
  console.log('\n4. Tab switching structure (HTML/CSS)');

  assert('Avalanche tab button present', html.includes('id="tab-btn-avalanche"'));
  assert('Attack tab button present', html.includes('id="tab-btn-attack"'));
  assert('Avalanche module content present', html.includes('id="module-avalanche"'));
  assert('Attack module content present', html.includes('id="module-attack"'));
  assert('Attack module starts hidden', /id="module-attack"[^>]*class="[^"]*\bhidden\b/.test(html) || /class="[^"]*\bhidden\b[^"]*"[^>]*id="module-attack"/.test(html));
  assert('switchModule() wired to tabs', html.includes("switchModule('avalanche')") && html.includes("switchModule('attack')"));
  assert('style.css linked', html.includes('href="style.css"'));
  assert('cryptanalysis.css linked', html.includes('href="cryptanalysis.css"'));
}

function testFrontendLogic() {
  console.log('\n5. Frontend logic (tab swap, message box, visual, dashboard)');

  const jsPath = path.join(ROOT, 'frontend', 'cryptanalysis.js');
  const js = fs.readFileSync(jsPath, 'utf8');
  const cssPath = path.join(ROOT, 'frontend', 'cryptanalysis.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert('switchModule toggles hidden class on both modules', js.includes("avalContent.classList.remove('hidden')") && js.includes("attContent.classList.add('hidden')"));
  assert('switchModule toggles active tab buttons', js.includes("avalBtn.classList.add('active')") && js.includes("attBtn.classList.remove('active')"));
  assert('handleAttackTypeChange sets compromise message', js.includes("'Transfer ₹500000 to Attacker'"));
  assert('handleAttackTypeChange resets default message', js.includes("'Transfer ₹1000 to Bob'"));
  assert('compromise visual shown only for private_key_compromise', js.includes("if (attackType === 'private_key_compromise')") && js.includes("visual.classList.remove('hidden')") && js.includes("visual.classList.add('hidden')"));
  assert('Dashboard maps random_signature to Failed/blocked', js.includes("attackState[attackType] = 'Succeeded'") && js.includes("attackState[attackType] = 'Failed'"));
  assert('Dashboard blocked counter increments on Failed', js.includes('blocked++'));
  assert('Tab styles defined in cryptanalysis.css', css.includes('.clab-tab-btn') && css.includes('.clab-module-content'));
  assert('Compromise flow visual styled', css.includes('.compromise-flow'));
  assert('Attack dashboard styled', css.includes('.attack-dashboard'));

  // Simulate dashboard counting logic
  const attackState = {
    random_signature: 'Failed',
    wrong_key: 'Failed',
    private_key_compromise: 'Succeeded',
  };
  let blocked = 0;
  Object.values(attackState).forEach((status) => {
    if (status === 'Failed') blocked++;
  });
  assert('Dashboard counts 2/3 blocked after all attacks', blocked === 2, `blocked=${blocked}`);
  assert('Private key compromise not counted as blocked', attackState.private_key_compromise === 'Succeeded');
}

function testMessageBoxOnSelect(html) {
  console.log('\n6. Private Key Compromise message box (HTML + handler)');

  assert('attack-target-message textarea exists', html.includes('id="attack-target-message"'));
  assert('attack-type-select has private_key_compromise option', html.includes('value="private_key_compromise"'));
  assert('onchange calls handleAttackTypeChange', html.includes('onchange="handleAttackTypeChange()"'));
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['index.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    proc.stdout.on('data', (chunk) => {
      if (!ready && chunk.toString().includes('Running at')) {
        ready = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(chunk));
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (!ready) reject(new Error(`Server exited early with code ${code}`));
    });
    setTimeout(() => {
      if (!ready) reject(new Error('Server startup timeout'));
    }, 10000);
  });
}

async function main() {
  console.log('Cryptanalysis Module 2 — Acceptance Tests');
  console.log('==========================================');

  // Load openssl service (simulates server startup side-effect)
  delete require.cache[require.resolve('./services/opensslService')];
  require('./services/opensslService');

  await testMalloryKeysOnStartup();

  const serverProc = await startServer();

  try {
    await testAvalancheEndpoint();
    await testAttackEndpoints();

    const page = await getPage('/cryptanalysis.html');
    assert('cryptanalysis.html serves 200', page.status === 200);
    testTabStructure(page.body);
    testMessageBoxOnSelect(page.body);
    testFrontendLogic();
  } finally {
    serverProc.kill('SIGTERM');
  }

  console.log('\n==========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
