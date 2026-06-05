const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ALICE_PRIVATE_KEY = path.join(__dirname, '..', 'keys', 'alice_private.pem');
const ALICE_PUBLIC_KEY = path.join(__dirname, '..', 'keys', 'alice_public.pem');

function runOpenSsl(args) {
  return execFileSync('openssl', args, { encoding: 'utf8' }).trim();
}

function readPemHeader(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(256);
    const bytesRead = fs.readSync(fd, buf, 0, 256, 0);
    const firstLine = buf.slice(0, bytesRead).toString('utf8').split('\n')[0].trim();
    if (!firstLine) throw new Error(`Empty key file: ${path.basename(filePath)}`);
    return firstLine;
  } finally {
    fs.closeSync(fd);
  }
}

function detectKeyFormat(filePath) {
  const header = readPemHeader(filePath);
  if (header.includes('BEGIN RSA PRIVATE KEY') || header.includes('BEGIN RSA PUBLIC KEY')) {
    return 'PEM (PKCS#1)';
  }
  if (header.includes('BEGIN PRIVATE KEY') || header.includes('BEGIN PUBLIC KEY')) {
    return 'PEM (PKCS#8)';
  }
  if (header.startsWith('-----BEGIN')) {
    return 'PEM';
  }
  throw new Error(`Unrecognized PEM header in ${path.basename(filePath)}`);
}

function parsePublicKeyText(output) {
  const sizeMatch = output.match(/Public-Key:\s*\((\d+)\s*bit\)/);
  if (!sizeMatch) throw new Error('Could not parse public key size from OpenSSL output');

  const exponentMatch = output.match(/Exponent:\s*(\d+)\s*\((0x[0-9a-fA-F]+)\)/);
  if (!exponentMatch) throw new Error('Could not parse public exponent from OpenSSL output');

  const keySizeBits = parseInt(sizeMatch[1], 10);
  return {
    keySize: `${keySizeBits} bit`,
    keySizeBits,
    publicExponent: {
      decimal: parseInt(exponentMatch[1], 10),
      hex: exponentMatch[2],
    },
  };
}

function inspectPublicKey() {
  if (!fs.existsSync(ALICE_PUBLIC_KEY)) {
    return {
      status: 'waiting',
      role: 'Verification',
      algorithm: null,
      keySize: null,
      keySizeBits: null,
      keyFormat: null,
      publicExponent: null,
      securityContext: null,
    };
  }

  const output = runOpenSsl(['rsa', '-in', ALICE_PUBLIC_KEY, '-pubin', '-text', '-noout']);
  const parsed = parsePublicKeyText(output);
  const keyFormat = detectKeyFormat(ALICE_PUBLIC_KEY);

  return {
    status: 'ready',
    role: 'Verification',
    algorithm: 'RSA',
    keySize: parsed.keySize,
    keySizeBits: parsed.keySizeBits,
    keyFormat,
    publicExponent: parsed.publicExponent,
    securityContext:
      'The public key allows anyone to verify that a signature was produced by the holder of the matching private key. It cannot be used to forge signatures.',
  };
}

function inspectPrivateKey(publicMeta) {
  if (!fs.existsSync(ALICE_PRIVATE_KEY)) {
    return {
      status: 'waiting',
      role: 'Signing',
      algorithm: null,
      keySize: null,
      keySizeBits: null,
      keyFormat: null,
      securityContext: null,
      securityAssumption: null,
      impactIfCompromised: null,
    };
  }

  let keyFormat;
  try {
    keyFormat = detectKeyFormat(ALICE_PRIVATE_KEY);
  } catch (err) {
    throw new Error(`Private key format detection failed: ${err.message}`);
  }

  if (publicMeta.status !== 'ready') {
    throw new Error('Public key must be readable before private key metadata can be derived');
  }

  return {
    status: 'ready',
    role: 'Signing',
    algorithm: 'RSA',
    keySize: publicMeta.keySize,
    keySizeBits: publicMeta.keySizeBits,
    keyFormat,
    securityContext:
      'The private key is held exclusively on the server. It must never be transmitted, displayed, or shared.',
    securityAssumption:
      'Cryptographic security assumes this private key remains secret at all times.',
    impactIfCompromised:
      'If an attacker obtains this key, they can produce mathematically valid signatures for any message — as demonstrated in the Cryptanalysis Lab (Private Key Compromise attack).',
  };
}

function getAliceKeyMetadata() {
  const publicKey = inspectPublicKey();
  const privateKey = inspectPrivateKey(publicKey);

  const keysAvailable =
    fs.existsSync(ALICE_PUBLIC_KEY) &&
    fs.existsSync(ALICE_PRIVATE_KEY) &&
    publicKey.status === 'ready' &&
    privateKey.status === 'ready';

  return {
    keysAvailable,
    publicKey,
    privateKey,
  };
}

module.exports = { getAliceKeyMetadata };
