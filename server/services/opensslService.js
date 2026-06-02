const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const KEYS_DIR       = path.join(__dirname, '..', 'keys');
const UPLOADS_DIR    = path.join(__dirname, '..', 'uploads');
const SIGS_DIR       = path.join(__dirname, '..', 'signatures');

// Ensure directories exist
[KEYS_DIR, UPLOADS_DIR, SIGS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const PRIVATE_KEY = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY  = path.join(KEYS_DIR, 'public.pem');
const SIG_FILE    = path.join(SIGS_DIR, 'document.sig');
const ORIG_FILE   = path.join(UPLOADS_DIR, 'original.txt');
const TAMPERED_FILE = path.join(UPLOADS_DIR, 'tampered.txt');

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function generateKeypair() {
  run(`openssl genrsa -out "${PRIVATE_KEY}" 2048`);
  run(`openssl rsa -in "${PRIVATE_KEY}" -pubout -out "${PUBLIC_KEY}"`);

  // Extract a fingerprint: first 40 base64 chars of public key body
  const pemLines = fs.readFileSync(PUBLIC_KEY, 'utf8').split('\n');
  const body = pemLines.filter(l => l && !l.startsWith('---')).join('');
  const fingerprint = body.slice(0, 40) + '...';

  return { fingerprint };
}

function hashFile(filePath) {
  const output = run(`openssl dgst -sha256 "${filePath}"`);
  // Output format: SHA2-256(file.txt)= abc123...
  return output.split('=').pop().trim();
}

function signFile() {
  run(`openssl dgst -sha256 -sign "${PRIVATE_KEY}" -out "${SIG_FILE}" "${ORIG_FILE}"`);
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
    openSslResult = run(
      `openssl dgst -sha256 -verify "${PUBLIC_KEY}" -signature "${SIG_FILE}" "${targetFile}"`
    );
  } catch (e) {
    // openssl exits with code 1 on failure — execSync throws
    openSslResult = e.stdout ? e.stdout.trim() : 'Verification Failure';
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
  generateKeypair,
  hashFile,
  signFile,
  createTamperedFile,
  verifyFile,
  ORIG_FILE,
};
