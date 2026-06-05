const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HASH_BITS = 256;

function runOpenSsl(args) {
  return execFileSync('openssl', args, { encoding: 'utf8' }).trim();
}

function parseHashFromOpenSslOutput(output) {
  return output.split('=').pop().trim();
}

function hashText(text) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avalanche-'));
  const tmpFile = path.join(tmpDir, 'input.txt');
  try {
    fs.writeFileSync(tmpFile, text, 'utf8');
    const output = runOpenSsl(['dgst', '-sha256', tmpFile]);
    return parseHashFromOpenSslOutput(output);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function countBits(byte) {
  let count = 0;
  while (byte > 0) {
    byte &= byte - 1;
    count++;
  }
  return count;
}

function hammingDistance(hexA, hexB) {
  const bufferA = Buffer.from(hexA, 'hex');
  const bufferB = Buffer.from(hexB, 'hex');
  let bitDifference = 0;
  for (let i = 0; i < bufferA.length; i++) {
    bitDifference += countBits(bufferA[i] ^ bufferB[i]);
  }
  return bitDifference;
}

function countCharacterDifference(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  if (a.length > b.length) {
    const temp = a;
    a = b;
    b = temp;
  }

  let currentRow = Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) {
    currentRow[i] = i;
  }

  for (let j = 1; j <= b.length; j++) {
    let previousRow = currentRow;
    currentRow = Array(a.length + 1);
    currentRow[0] = j;

    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[i] = Math.min(
        currentRow[i - 1] + 1,
        previousRow[i] + 1,
        previousRow[i - 1] + indicator
      );
    }
  }

  return currentRow[a.length];
}

function buildVerdict(originalText, modifiedText, bitDifferencePercent) {
  if (originalText === modifiedText) {
    return {
      verdict: 'No change detected — identical inputs produce identical hashes',
      strongAvalanche: false,
    };
  }

  if (bitDifferencePercent < 20) {
    return { verdict: 'Weak Diffusion', strongAvalanche: false };
  }
  if (bitDifferencePercent < 40) {
    return { verdict: 'Moderate Diffusion', strongAvalanche: false };
  }
  if (bitDifferencePercent < 60) {
    return { verdict: 'Strong Avalanche Effect', strongAvalanche: true };
  }
  return { verdict: 'Excellent Diffusion', strongAvalanche: true };
}

function analyzeAvalanche(originalText, modifiedText) {
  const original = originalText ?? '';
  const modified = modifiedText ?? '';

  const originalHash = hashText(original);
  const modifiedHash = hashText(modified);
  const bitDifference = hammingDistance(originalHash, modifiedHash);
  const bitDifferencePercent = parseFloat(
    ((bitDifference / HASH_BITS) * 100).toFixed(2)
  );
  const characterDifference = countCharacterDifference(original, modified);
  const { verdict, strongAvalanche } = buildVerdict(
    original,
    modified,
    bitDifferencePercent
  );

  return {
    originalHash,
    modifiedHash,
    bitDifference,
    totalBits: HASH_BITS,
    bitDifferencePercent,
    characterDifference,
    verdict,
    strongAvalanche,
  };
}

module.exports = { analyzeAvalanche };
