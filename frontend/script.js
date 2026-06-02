// ── Session State ────────────────────────────────────────────────────────────
const session = {
  documentUploaded: false,
  signed:           false,
  transmitted:      false,
  tampered:         false,
  verified:         false,
  originalHash:     null,
  currentHash:      null,
  verdict:          null,
  selectedFile:     null,
};

// ── Timeline Helper ──────────────────────────────────────────────────────────
const TL_STEPS = ['upload','hash','sign','transmit','modify','verify'];

function setTimelineStep(name, state) {
  // state: 'active' | 'done' | 'threat' | 'inactive'
  const el = document.getElementById('tl-' + name);
  if (!el) return;
  el.className = 'timeline-step step--' + (state === 'inactive' ? 'inactive' : state);
}

function setConnector(id, state) {
  const el = document.getElementById('tl-c' + id);
  if (!el) return;
  el.className = 'timeline-connector ' + state;
}

// ── Actor UI Helpers ─────────────────────────────────────────────────────────
function setActorState(actorPrefix, field, stateClass, text) {
  const el = document.getElementById(actorPrefix + '-' + field + '-state');
  if (!el) return;
  el.className = 'si-state ' + stateClass;
  el.textContent = text;
}

function setBtn(id, enabled) {
  const el = document.getElementById(id);
  if (el) el.disabled = !enabled;
}

function truncateHash(hash, n = 16) {
  if (!hash) return '—';
  return hash.slice(0, n) + '…' + hash.slice(-8);
}

// ── API 0: Generate Keypair ──────────────────────────────────────────────────
async function generateKeypair() {
  const btn = document.getElementById('btn-keygen');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> Generating…';

  try {
    const res  = await fetch('/api/generate-keypair', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    document.getElementById('pub-fingerprint').textContent = data.fingerprint;
    document.getElementById('keygen-result').classList.remove('hidden');
    btn.innerHTML = '<span class="btn-icon">✅</span> Keys Generated';
    btn.style.background = 'linear-gradient(135deg, #00aa44, #007733)';

    const pill = document.querySelector('.key-status-pill');
    pill.classList.add('ready');
    document.getElementById('key-pill-text').textContent = 'RSA-2048 · Keys Ready';

    setBtn('btn-upload', false); // will enable after file select
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">⚡</span> Generate RSA-2048 Key Pair';
    alert('❌ Key generation failed.\n\n' + err.message);
  }
}

// ── File Select ──────────────────────────────────────────────────────────────
function onFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  session.selectedFile = file;
  document.getElementById('file-label-text').textContent = file.name;
  document.getElementById('file-upload-label').style.borderColor = 'var(--cyan)';
  document.getElementById('file-upload-label').style.color = 'var(--cyan)';
  setBtn('btn-upload', true);
}

// ── API 1: Upload ────────────────────────────────────────────────────────────
async function uploadDocument() {
  if (!session.selectedFile) return;
  const btn = document.getElementById('btn-upload');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Uploading…';

  const form = new FormData();
  form.append('document', session.selectedFile);

  try {
    const res  = await fetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    session.documentUploaded = true;
    session.originalHash = data.originalHash;

    // Update Alice doc status
    setActorState('alice', 'doc', 'si-active', 'Uploaded');
    setTimelineStep('upload', 'done');
    setTimelineStep('hash',   'active');
    setConnector(1, 'done');

    // Show hash step completing
    setTimeout(() => {
      setTimelineStep('hash', 'done');
      setConnector(2, 'active');
      setBtn('btn-sign', true);
    }, 800);

    btn.innerHTML = '<span>✅</span> Uploaded';
    btn.style.background = 'linear-gradient(135deg,#00aa44,#007733)';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>⬆️</span> Upload';
    alert('❌ Upload failed.\n\n' + err.message);
  }
}

// ── API 2: Sign ──────────────────────────────────────────────────────────────
async function signDocument() {
  const btn = document.getElementById('btn-sign');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Signing…';

  try {
    const res  = await fetch('/api/sign', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    session.signed = true;

    setActorState('alice', 'sig', 'si-done', 'Signed');
    setTimelineStep('sign', 'done');
    setConnector(2, 'done');
    setConnector(3, 'active');
    setTimelineStep('transmit', 'active');
    setBtn('btn-transmit', true);

    btn.innerHTML = '<span>✅</span> Signed';
    btn.style.background = 'linear-gradient(135deg,#00aa44,#007733)';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>✍️</span> Sign Document';
    alert('❌ Signing failed.\n\n' + err.message);
  }
}

// ── API 3: Transmit ──────────────────────────────────────────────────────────
async function transmitDocument() {
  const btn = document.getElementById('btn-transmit');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Transmitting…';

  try {
    const res  = await fetch('/api/transmit', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    session.transmitted = true;

    setTimelineStep('transmit', 'done');
    setConnector(3, 'done');
    setConnector(4, 'active');
    setTimelineStep('modify', 'active');

    // Activate Bob card
    document.getElementById('bob-card').classList.add('active');
    setActorState('bob', 'doc', 'si-active', 'Received');
    setActorState('bob', 'sig', 'si-active', 'Received');

    // Enable adversary and Bob verify
    setBtn('btn-modify', true);
    setBtn('btn-verify', true);

    btn.innerHTML = '<span>✅</span> Transmitted';
    btn.style.background = 'linear-gradient(135deg,#00aa44,#007733)';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>📡</span> Transmit';
    alert('❌ Transmit failed.\n\n' + err.message);
  }
}

// ── API 4: Modify ────────────────────────────────────────────────────────────
async function modifyDocument() {
  const btn = document.getElementById('btn-modify');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Modifying…';

  try {
    const res  = await fetch('/api/modify', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    session.tampered = true;

    // Adversary card goes RED
    const advCard = document.getElementById('adversary-card');
    advCard.classList.add('threat-active');
    document.getElementById('tamper-status-box').classList.add('threat');
    document.getElementById('tsb-text').textContent = '⚠️ Document tampered!';

    // Show diff
    const origText = data.original || '';
    const tampText = data.tampered || '';
    document.getElementById('diff-original').textContent = origText.trim().slice(0, 60);
    document.getElementById('diff-tampered').textContent = tampText.trim().slice(0, 60);
    document.getElementById('tamper-diff').classList.remove('hidden');

    // Bob statuses go to threat
    setActorState('bob', 'doc', 'si-threat', 'Tampered');

    // Timeline
    setTimelineStep('modify',  'threat');
    setConnector(4, 'threat');
    setConnector(5, 'threat');
    setTimelineStep('verify',  'active');

    btn.innerHTML = '<span>✅</span> Modified';
    btn.style.background = 'linear-gradient(135deg,#aa0000,#770000)';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>✂️</span> Modify Document';
    alert('❌ Modify failed.\n\n' + err.message);
  }
}

// ── API 5: Verify ────────────────────────────────────────────────────────────
async function verifyDocument() {
  const btn = document.getElementById('btn-verify');
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Verifying…';

  try {
    const res  = await fetch('/api/verify', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    session.verified    = true;
    session.originalHash = data.originalHash;
    session.currentHash  = data.currentHash;
    session.verdict      = data.isValid ? 'valid' : 'invalid';

    // Timeline
    setTimelineStep('verify', 'done');
    if (!session.tampered) {
      setConnector(4, 'done');
      setConnector(5, 'done');
    }

    // Bob statuses
    if (data.isValid) {
      setActorState('bob', 'doc', 'si-done', 'Authentic');
      setActorState('bob', 'sig', 'si-done', 'Valid');
    } else {
      setActorState('bob', 'doc', 'si-threat', 'Tampered');
      setActorState('bob', 'sig', 'si-threat', 'INVALID');
    }

    // Bob verdict banner
    const banner = document.getElementById('verdict-banner');
    banner.style.background   = data.isValid ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.1)';
    banner.style.borderColor  = data.isValid ? 'rgba(0,255,136,0.3)'  : 'rgba(255,68,68,0.4)';
    banner.style.color        = data.isValid ? 'var(--green)'         : 'var(--red)';
    banner.textContent        = data.isValid ? '✅ Signature Valid — Document Authentic' : '❌ Signature Invalid — Document Tampered';
    document.getElementById('bob-result').classList.remove('hidden');

    // Build report
    buildReport(data);

    btn.innerHTML = '<span>✅</span> Verified';
    btn.style.background = data.isValid
      ? 'linear-gradient(135deg,#00aa44,#007733)'
      : 'linear-gradient(135deg,var(--red),#aa1111)';
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span> Verify Signature';
    alert('❌ Verification failed.\n\n' + err.message);
  }
}

// ── Build Report Panel ───────────────────────────────────────────────────────
function buildReport(data) {
  // Hashes
  document.getElementById('rpt-original-hash').textContent = data.originalHash || '—';
  document.getElementById('rpt-current-hash').textContent  = data.currentHash  || '—';

  // Highlight hash row red if mismatch
  if (!data.hashMatch) {
    document.getElementById('rr-current').style.background     = 'rgba(255,68,68,0.05)';
    document.getElementById('rr-current').style.borderColor    = 'rgba(255,68,68,0.3)';
  }

  // Badges
  setBadge('rpt-integrity',    data.hashMatch,  'INTACT',   'MODIFIED');
  setBadge('rpt-signature',    data.isValid,    'VALID',    'INVALID');
  setBadge('rpt-authenticity', data.isValid,    'VERIFIED', 'FAILED');

  // OpenSSL raw output
  const opensslEl = document.getElementById('rpt-openssl');
  opensslEl.textContent = data.openSslResult || '—';
  opensslEl.className   = 'openssl-output ' + (data.isValid ? 'ok' : 'bad');

  // Final verdict
  const statusEl = document.getElementById('verdict-status');
  if (data.isValid) {
    statusEl.textContent = '✅ INTEGRITY VERIFIED — Document is Authentic and Unmodified';
    statusEl.className   = 'status valid';
  } else {
    statusEl.textContent = '🚨 INTEGRITY BREACH — Document was Modified After Signing';
    statusEl.className   = 'status invalid';
  }

  document.getElementById('report-panel').classList.remove('hidden');
  document.getElementById('report-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setBadge(id, isOk, okText, badText) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = isOk ? okText : badText;
  el.className   = 'rr-badge ' + (isOk ? 'ok' : 'bad');
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // All actor buttons start disabled
  ['btn-upload','btn-sign','btn-transmit','btn-modify','btn-verify']
    .forEach(id => setBtn(id, false));
});
