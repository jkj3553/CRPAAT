const fs = require('fs');
const openssl = require('../services/opensslService');

// In-memory application state
const state = {
  keysGenerated: false,
  fingerprint: null,
  uploaded: false,
  originalHash: null,
  signed: false,
  transmitted: false,
  tampered: false,
  originalContent: null,
  tamperedContent: null,
  verifyResult: null,
};

function generateKeypair(req, res) {
  try {
    const { fingerprint } = openssl.generateKeypair();
    state.keysGenerated = true;
    state.fingerprint = fingerprint;
    // Reset downstream state on re-keygen
    Object.assign(state, {
      uploaded: false, originalHash: null, signed: false,
      transmitted: false, tampered: false, originalContent: null,
      tamperedContent: null, verifyResult: null,
    });
    res.json({ success: true, fingerprint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function upload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    // multer has already saved to uploads/original.txt via diskStorage
    const hash = openssl.hashFile(openssl.ORIG_FILE);
    state.uploaded = true;
    state.originalHash = hash;
    state.originalContent = fs.readFileSync(openssl.ORIG_FILE, 'utf8');
    state.signed = false;
    state.transmitted = false;
    state.tampered = false;
    state.tamperedContent = null;
    state.verifyResult = null;
    res.json({ uploaded: true, originalHash: hash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function sign(req, res) {
  try {
    if (!state.uploaded) return res.status(400).json({ error: 'No document uploaded.' });
    openssl.signFile();
    state.signed = true;
    res.json({ signed: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function transmit(req, res) {
  if (!state.signed) return res.status(400).json({ error: 'Document not signed.' });
  state.transmitted = true;
  res.json({ transmitted: true });
}

function modify(req, res) {
  try {
    if (!state.transmitted) return res.status(400).json({ error: 'Document not transmitted.' });
    const { original, tampered } = openssl.createTamperedFile();
    state.tampered = true;
    state.originalContent = original;
    state.tamperedContent = tampered;
    res.json({ tampered: true, original, tampered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function verify(req, res) {
  try {
    if (!state.signed) return res.status(400).json({ error: 'Document not signed.' });
    const result = openssl.verifyFile(state.tampered);
    state.verifyResult = result;
    res.json({
      verified: true,
      ...result,
      tampered: state.tampered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

function getState(req, res) {
  res.json(state);
}

module.exports = { generateKeypair, upload, sign, transmit, modify, verify, getState };
