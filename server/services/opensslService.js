const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const KEYS_DIR       = path.join(__dirname, '..', 'keys');
const UPLOADS_DIR    = path.join(__dirname, '..', 'uploads');
const SIGS_DIR       = path.join(__dirname, '..', 'signatures');

[KEYS_DIR, UPLOADS_DIR, SIGS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const ALICE_PRIVATE_KEY = path.join(KEYS_DIR, 'alice_private.pem');
const ALICE_PUBLIC_KEY  = path.join(KEYS_DIR, 'alice_public.pem');
const MALLORY_PRIVATE_KEY = path.join(KEYS_DIR, 'mallory_private.pem');
const MALLORY_PUBLIC_KEY  = path.join(KEYS_DIR, 'mallory_public.pem');
const SIG_FILE    = path.join(SIGS_DIR, 'document.sig');
const ORIG_FILE   = path.join(UPLOADS_DIR, 'original.txt');
const TAMPERED_FILE = path.join(UPLOADS_DIR, 'tampered.txt');

function runOpenSsl(args) {
  return execFileSync('openssl', args, { encoding: 'utf8' }).trim();
}

function migrateLegacyAliceKeys() {
  const legacyPrivate = path.join(KEYS_DIR, 'private.pem');
  const legacyPublic = path.join(KEYS_DIR, 'public.pem');
  if (fs.existsSync(legacyPrivate) && !fs.existsSync(ALICE_PRIVATE_KEY)) {
    fs.renameSync(legacyPrivate, ALICE_PRIVATE_KEY);
  }
  if (fs.existsSync(legacyPublic) && !fs.existsSync(ALICE_PUBLIC_KEY)) {
    fs.renameSync(legacyPublic, ALICE_PUBLIC_KEY);
  }
}

function ensureAliceKeypair() {
  migrateLegacyAliceKeys();
  if (!fs.existsSync(ALICE_PRIVATE_KEY)) {
    runOpenSsl(['genrsa', '-out', ALICE_PRIVATE_KEY, '2048']);
    runOpenSsl(['rsa', '-in', ALICE_PRIVATE_KEY, '-pubout', '-out', ALICE_PUBLIC_KEY]);
  }
}

function generateMalloryKeypairOnce() {
  if (!fs.existsSync(MALLORY_PRIVATE_KEY)) {
    console.log('[OpenSSL Service] Generating Mallory\'s keypair...');
    runOpenSsl(['genrsa', '-out', MALLORY_PRIVATE_KEY, '2048']);
    runOpenSsl(['rsa', '-in', MALLORY_PRIVATE_KEY, '-pubout', '-out', MALLORY_PUBLIC_KEY]);
    console.log('[OpenSSL Service] Mallory\'s keypair generated.');
  }
}

function generateAliceKeypair() {
  ensureAliceKeypair();
  const pemLines = fs.readFileSync(ALICE_PUBLIC_KEY, 'utf8').split('\n');
  const body = pemLines.filter(l => l && !l.startsWith('---')).join('');
  const fingerprint = body.slice(0, 40) + '...';
  return { fingerprint };
}

ensureAliceKeypair();
generateMalloryKeypairOnce();

function hashFile(filePath) {
  const output = runOpenSsl(['dgst', '-sha256', filePath]);
  return output.split('=').pop().trim();
}

function signFile() {
  runOpenSsl(['dgst', '-sha256', '-sign', ALICE_PRIVATE_KEY, '-out', SIG_FILE, ORIG_FILE]);
}

function createTamperedFile(customContent) {
  const original = fs.readFileSync(ORIG_FILE, 'utf8');
  let tampered;
  if (customContent !== undefined && customContent !== null) {
    tampered = customContent;
  } else {
    const numMatch = original.match(/(\d+)/);
    if (numMatch) {
      tampered = original.replace(numMatch[0], String(parseInt(numMatch[0]) * 5));
    } else {
      tampered = original + '\n[TAMPERED BY ADVERSARY]';
    }
  }
  fs.writeFileSync(TAMPERED_FILE, tampered, 'utf8');
  return { original, tampered };
}

function verifyFile(useTampered) {
  const targetFile = useTampered ? TAMPERED_FILE : ORIG_FILE;

  let openSslResult;
  try {
    openSslResult = runOpenSsl([
      'dgst',
      '-sha256',
      '-verify',
      ALICE_PUBLIC_KEY,
      '-signature',
      SIG_FILE,
      targetFile
    ]);
  } catch (e) {
    openSslResult = e.stdout ? e.stdout.trim() : (e.stderr ? e.stderr.trim() : 'Verification Failure');
  }

  const originalHash = hashFile(ORIG_FILE);
  const currentHash  = hashFile(targetFile);
  const isValid      = openSslResult.includes('Verified OK');

  return {
    openSslResult,
    originalHash,
    currentHash,
    isValid,
    hashMatch: originalHash === currentHash,
  };
}

module.exports = {
  runOpenSsl,
  generateAliceKeypair,
  generateKeypair: generateAliceKeypair,
  generateMalloryKeypairOnce,
  hashFile,
  signFile,
  createTamperedFile,
  verifyFile,
  ALICE_PRIVATE_KEY,
  ALICE_PUBLIC_KEY,
  MALLORY_PRIVATE_KEY,
  MALLORY_PUBLIC_KEY,
  ORIG_FILE,
};
