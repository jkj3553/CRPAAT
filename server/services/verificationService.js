const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  runOpenSsl,
  hashFile,
  ALICE_PRIVATE_KEY,
  ALICE_PUBLIC_KEY,
  MALLORY_PRIVATE_KEY,
  MALLORY_PUBLIC_KEY,
  ORIG_FILE,
  TAMPERED_FILE,
  SIG_FILE,
} = require('./opensslService');

const VALID_SCENARIOS = [
  'normal',
  'mitm_tamper',
  'random_sig',
  'wrong_key',
  'private_key_compromise',
];

function rsautlDecrypt(pubKeyPath, sigPath) {
  try {
    return execFileSync('openssl', [
      'rsautl', '-verify', '-pubin', '-inkey', pubKeyPath, '-in', sigPath,
    ]);
  } catch {
    return null;
  }
}

function extractHashFromDecrypted(decrypted) {
  if (!decrypted || decrypted.length < 32) return null;
  return decrypted.slice(-32).toString('hex');
}

function trySignatureValidation(documentHash, sigPath) {
  const candidates = [
    { owner: 'alice', pubKey: ALICE_PUBLIC_KEY },
    { owner: 'mallory', pubKey: MALLORY_PUBLIC_KEY },
  ];

  for (const { owner, pubKey } of candidates) {
    const decrypted = rsautlDecrypt(pubKey, sigPath);
    const sigHash = extractHashFromDecrypted(decrypted);
    if (sigHash && sigHash === documentHash) {
      return { valid: true, signer: owner };
    }
  }

  return { valid: false, signer: null };
}

function setupScenario(scenario) {
  const timestamp = Date.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-pipe-'));
  const messageFile = path.join(tmpDir, 'message.txt');
  const signatureFile = path.join(tmpDir, 'signature.bin');

  switch (scenario) {
    case 'normal':
      return {
        documentFile: ORIG_FILE,
        signatureFile: SIG_FILE,
        signedBaselineHash: hashFile(ORIG_FILE),
        cleanup: null,
      };

    case 'mitm_tamper':
      if (!fs.existsSync(TAMPERED_FILE)) {
        throw new Error('Tampered document not found. Run the MITM attack first.');
      }
      return {
        documentFile: TAMPERED_FILE,
        signatureFile: SIG_FILE,
        signedBaselineHash: hashFile(ORIG_FILE),
        cleanup: null,
      };

    case 'random_sig': {
      const message = 'Transfer ₹1000 to Bob';
      fs.writeFileSync(messageFile, message, 'utf8');
      execFileSync('openssl', ['rand', '-out', signatureFile, '256']);
      return {
        documentFile: messageFile,
        signatureFile,
        signedBaselineHash: hashFile(messageFile),
        cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
      };
    }

    case 'wrong_key': {
      const message = 'Transfer ₹1000 to Bob';
      fs.writeFileSync(messageFile, message, 'utf8');
      runOpenSsl([
        'dgst', '-sha256', '-sign', MALLORY_PRIVATE_KEY, '-out', signatureFile, messageFile,
      ]);
      return {
        documentFile: messageFile,
        signatureFile,
        signedBaselineHash: hashFile(messageFile),
        cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
      };
    }

    case 'private_key_compromise': {
      const message = 'Transfer ₹500000 to Attacker';
      fs.writeFileSync(messageFile, message, 'utf8');
      runOpenSsl([
        'dgst', '-sha256', '-sign', ALICE_PRIVATE_KEY, '-out', signatureFile, messageFile,
      ]);
      return {
        documentFile: messageFile,
        signatureFile,
        signedBaselineHash: hashFile(messageFile),
        cleanup: () => fs.rmSync(tmpDir, { recursive: true, force: true }),
      };
    }

    default:
      throw new Error('Invalid scenario');
  }
}

function stageHashValidation(receivedHash, signedBaselineHash) {
  const pass = receivedHash === signedBaselineHash;
  return {
    stage: 'Hash Validation',
    status: pass ? 'PASS' : 'FAIL',
    explanation: pass
      ? `Document SHA-256 digest (${receivedHash.slice(0, 16)}…) matches the hash signed at transmission.`
      : `Document SHA-256 digest (${receivedHash.slice(0, 16)}…) does not match the signed baseline (${signedBaselineHash.slice(0, 16)}…). The payload was altered.`,
    securitySignificance: 'Proves Data Integrity.',
  };
}

function stageSignatureValidation(documentHash, sigPath) {
  const result = trySignatureValidation(documentHash, sigPath);

  if (result.valid) {
    return {
      stage: 'Signature Validation',
      status: 'PASS',
      explanation: `Signature decrypted successfully. Embedded hash matches the document digest (signer key: ${result.signer}).`,
      securitySignificance: 'Proves the mathematical validity of the RSA signature structure.',
      signer: result.signer,
    };
  }

  return {
    stage: 'Signature Validation',
    status: 'FAIL',
    explanation: 'RSA public-key decryption failed or recovered hash does not match the document digest. Invalid padding or corrupted signature bytes.',
    securitySignificance: 'Proves the mathematical validity of the RSA signature structure.',
    signer: null,
  };
}

function stageIdentityVerification(signer, sigPassed) {
  const expected = 'alice';

  if (!sigPassed) {
    return {
      stage: 'Identity Verification',
      status: 'FAIL',
      explanation: 'Identity cannot be established — signature validation did not succeed.',
      securitySignificance: 'Proves Origin Authenticity.',
    };
  }

  const pass = signer === expected;
  return {
    stage: 'Identity Verification',
    status: pass ? 'PASS' : 'FAIL',
    explanation: pass
      ? 'The public key that validated the signature belongs to Alice, the expected sender.'
      : `Signature is mathematically valid but was produced by ${signer === 'mallory' ? 'Mallory' : 'an unexpected keyholder'}, not Alice.`,
    securitySignificance: 'Proves Origin Authenticity.',
  };
}

function stageTrustDecision(hashPass, sigPass, identityPass) {
  const allPass = hashPass && sigPass && identityPass;
  return {
    stage: 'Trust Decision',
    status: allPass ? 'TRUST_ESTABLISHED' : 'TRUST_REJECTED',
    explanation: allPass
      ? 'All cryptographic and identity requirements met. Bob accepts the document as authentic.'
      : 'One or more verification stages failed. Trust cannot be established — the document is rejected.',
    securitySignificance: allPass
      ? 'Non-repudiation and safety guaranteed under the private-key secrecy assumption.'
      : 'Trust boundary enforced — failed stages prevent acceptance of a fraudulent or altered document.',
  };
}

function runPipeline(scenario) {
  if (!VALID_SCENARIOS.includes(scenario)) {
    throw new Error('Invalid scenario specified.');
  }

  if (scenario === 'normal' || scenario === 'mitm_tamper') {
    if (!fs.existsSync(SIG_FILE)) {
      throw new Error('No signature on file. Sign a document first.');
    }
    if (!fs.existsSync(ORIG_FILE)) {
      throw new Error('No document on file. Upload a document first.');
    }
  }

  const ctx = setupScenario(scenario);

  try {
    const receivedHash = hashFile(ctx.documentFile);
    const hashStage = stageHashValidation(receivedHash, ctx.signedBaselineHash);
    const hashPassed = hashStage.status === 'PASS';

    const sigStage = stageSignatureValidation(receivedHash, ctx.signatureFile);
    const sigPassed = sigStage.status === 'PASS';
    const signer = sigStage.signer;

    const identityStage = stageIdentityVerification(signer, sigPassed);
    const identityPassed = identityStage.status === 'PASS';

    const trustStage = stageTrustDecision(hashPassed, sigPassed, identityPassed);

    const pipeline = [hashStage, sigStage, identityStage, trustStage].map((s) => {
      const { signer: _s, ...rest } = s;
      return rest;
    });

    return {
      success: true,
      scenario,
      pipeline,
    };
  } finally {
    if (ctx.cleanup) ctx.cleanup();
  }
}

module.exports = { runPipeline, VALID_SCENARIOS };
