// ─── Session State ────────────────────────────────────────────────────────────
const session = {
  e: null,
  d: null,
  n: null,
  currentSignature: null,
  currentDoc: null
};

// ─── Navigation ───────────────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.getElementById('nav-' + id);
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  updateKeyStatusBars();
}

// ─── Update Key Status Indicators ────────────────────────────────────────────
function updateKeyStatusBars() {
  // Sign section key status
  const signBar  = document.getElementById('key-status-sign');
  const signIcon = document.getElementById('key-status-sign-icon');
  const signText = document.getElementById('key-status-sign-text');
  if (session.e && session.d && session.n) {
    signBar.classList.add('ok');
    signIcon.textContent = '✅';
    signText.textContent = `Keys loaded — Public (e=${session.e}, n=${session.n}) · Private (d=${session.d})`;
    signBar.querySelector('.btn-small').style.display = 'none';
  } else {
    signBar.classList.remove('ok');
    signIcon.textContent = '⚠️';
    signText.textContent = 'No keys loaded. Please generate keys first.';
    signBar.querySelector('.btn-small').style.display = '';
  }

  // Tamper section key status
  const tamperBar = document.getElementById('tamper-key-status');
  if (session.currentSignature) {
    tamperBar.classList.add('ok');
    tamperBar.innerHTML = `<span>✅</span><span>Signature loaded from Step 2 — ready to test tampering.</span>`;
    // Update original doc display
    const origDisplay = document.getElementById('tamper-original-doc');
    if (session.currentDoc && origDisplay) {
      origDisplay.textContent = session.currentDoc;
    }
  }
}

// ─── Step 1: Key Generation ───────────────────────────────────────────────────
async function generateKeys() {
  const btn = document.getElementById('btn-keygen');
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';

  try {
    const res  = await fetch('/api/keygen');
    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();

    session.e = data.e;
    session.d = data.d;
    session.n = data.n_pub;

    document.getElementById('pub-e').textContent  = data.e;
    document.getElementById('pub-n').textContent  = data.n_pub;
    document.getElementById('priv-d').textContent = data.d;
    document.getElementById('priv-n').textContent = data.n_priv;

    document.getElementById('key-output').classList.remove('hidden');
    updateKeyStatusBars();

    btn.textContent = '✅ Keys Generated';
    btn.style.background = 'linear-gradient(135deg, #00ff88, #00cc66)';
  } catch (err) {
    alert('❌ Error generating keys.\n\nMake sure the Flask server is running:\n  cd server/ && python app.py\n\nAlso verify the C++ binary was compiled:\n  make');
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span> Generate RSA Key Pair';
  }
}

// ─── Step 2: Sign Document ────────────────────────────────────────────────────
async function signDoc() {
  if (!session.d || !session.n) {
    alert('⚠️ Please generate keys first (Step 1).');
    showSection('keygen');
    return;
  }

  const message = document.getElementById('doc-input').value.trim();
  if (!message) {
    alert('⚠️ Please enter a document to sign.');
    return;
  }

  const btn = document.getElementById('btn-sign');
  btn.disabled = true;
  btn.textContent = '⏳ Signing…';

  try {
    const res  = await fetch('/api/sign', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message, d: session.d, n: session.n })
    });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();

    session.currentSignature = data.signature;
    session.currentDoc       = message;

    document.getElementById('hash-val').textContent = data.hash;
    document.getElementById('sig-val').textContent  = data.signature;
    document.getElementById('sign-output').classList.remove('hidden');

    // Auto-fill verify section
    document.getElementById('verify-doc').value = message;
    document.getElementById('verify-sig').value = data.signature;

    updateKeyStatusBars();
  } catch (err) {
    alert('❌ Error signing document. Check that the Flask server is running.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✍️</span> Generate Signature';
  }
}

// ─── Step 3: Verify Document ──────────────────────────────────────────────────
async function verifyDoc() {
  if (!session.e || !session.n) {
    alert('⚠️ Please generate keys first (Step 1).');
    showSection('keygen');
    return;
  }

  const message   = document.getElementById('verify-doc').value.trim();
  const signature = document.getElementById('verify-sig').value.trim();

  if (!message || !signature) {
    alert('⚠️ Please enter both the document and signature.');
    return;
  }

  try {
    const res  = await fetch('/api/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message, signature, e: session.e, n: session.n })
    });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();

    const box = document.getElementById('verify-result');
    box.classList.remove('hidden');

    if (data.result === 'VALID') {
      box.innerHTML = `
        <div class="status valid">✅ VALID SIGNATURE — Document is Authentic</div>
        <p style="margin-top:12px; color:var(--text-dim); font-size:0.86em; line-height:1.7">
          The recovered hash <code style="color:var(--cyan);font-family:monospace">σ<sup>e</sup> mod n</code>
          matches the recomputed hash <code style="color:var(--cyan);font-family:monospace">H(message)</code>.
          The document has not been tampered with and the signature is valid.
        </p>`;
    } else {
      box.innerHTML = `
        <div class="status invalid">❌ INVALID SIGNATURE — Verification Failed</div>
        <p style="margin-top:12px; color:var(--text-dim); font-size:0.86em; line-height:1.7">
          The recovered hash does not match the recomputed hash.
          The document has been modified or the signature is incorrect.
        </p>`;
    }
  } catch (err) {
    alert('❌ Error verifying document. Check that the Flask server is running.');
    console.error(err);
  }
}

// ─── Step 4: Tamper Demo ──────────────────────────────────────────────────────
async function runTamperDemo() {
  if (!session.currentSignature) {
    alert('⚠️ Please sign a document first (Step 2) to get a signature for testing.');
    showSection('sign');
    return;
  }

  const tamperedDoc = document.getElementById('tamper-doc').value.trim();
  if (!tamperedDoc) {
    alert('⚠️ Please enter a (tampered) document to test.');
    return;
  }

  try {
    const res  = await fetch('/api/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        message:   tamperedDoc,
        signature: session.currentSignature,
        e:         session.e,
        n:         session.n
      })
    });
    if (!res.ok) throw new Error('Server error: ' + res.status);
    const data = await res.json();

    const resultBox  = document.getElementById('tamper-result');
    const explainBox = document.getElementById('tamper-explanation');
    resultBox.classList.remove('hidden');

    if (data.result === 'VALID') {
      resultBox.innerHTML = `
        <div class="status valid">
          ✅ VALID (Hash collision detected — try a different modification)
        </div>
        <p class="note" style="margin-top:8px">
          This document happened to produce the same hash. Try changing more characters.
        </p>`;
    } else {
      resultBox.innerHTML = `
        <div class="status invalid">
          ⚠️ DOCUMENT TAMPERED — INTEGRITY FAILURE DETECTED
        </div>
        <p class="note" style="margin-top:8px">
          The signature was valid for the original document. This tampered version fails verification.
        </p>`;
      explainBox.classList.remove('hidden');
    }
  } catch (err) {
    alert('❌ Error running tamper demo. Check that the Flask server is running.');
    console.error(err);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showSection('home');
});
