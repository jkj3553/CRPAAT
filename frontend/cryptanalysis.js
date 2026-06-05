// Global Session state for Attack Dashboard
const attackState = {
  random_signature: 'Pending',
  wrong_key: 'Pending',
  private_key_compromise: 'Pending'
};

// --- Module 1: Avalanche Effect Analysis ---
async function runAnalysis() {
  const btn = document.getElementById('btn-analyze');
  const errorBox = document.getElementById('clab-error');
  const originalText = document.getElementById('input-original').value;
  const modifiedText = document.getElementById('input-modified').value;

  errorBox.classList.add('hidden');
  errorBox.textContent = '';

  if (!originalText.trim() || !modifiedText.trim()) {
    errorBox.textContent = 'Both fields are required.';
    errorBox.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  try {
    const res = await fetch('/api/cryptanalysis/avalanche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalText, modifiedText }),
    });
    const data = await res.json();

    if (!res.ok || data.error) throw new Error(data.error || 'Server error');

    document.getElementById('res-hashA').textContent = data.originalHash;
    document.getElementById('res-hashB').textContent = data.modifiedHash;
    document.getElementById('res-charDiff').textContent = data.characterDifference;
    document.getElementById('res-bitDiff').textContent =
      `${data.bitDifference} / ${data.totalBits}`;
    document.getElementById('res-pct').textContent = `${data.bitDifferencePercent}%`;

    const pct = data.bitDifferencePercent;
    const barFill = document.getElementById('res-bar-fill');
    barFill.style.width = `${Math.min(pct, 100)}%`;
    document.getElementById('res-bar-pct').textContent = `${pct}%`;

    barFill.className = 'clab-bar-fill';
    if (pct < 20) barFill.classList.add('bar--weak');
    else if (pct >= 60) barFill.classList.add('bar--excellent');

    const verdictBox = document.getElementById('res-verdict-box');
    document.getElementById('res-verdict').textContent = data.verdict;
    verdictBox.className = 'clab-verdict';
    if (data.strongAvalanche && pct < 60) verdictBox.classList.add('verdict--strong');
    else if (pct >= 60) verdictBox.classList.add('verdict--excellent');
    else if (pct < 20) verdictBox.classList.add('verdict--weak');

    document.getElementById('results-placeholder').classList.add('hidden');
    document.getElementById('results-content').classList.remove('hidden');
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
     btn.textContent = 'Analyze Avalanche Effect';
  }
}

// --- Module 2: Digital Signature Attack Analysis ---

// 1. Switch between Avalanche and Attack modules
function switchModule(moduleName) {
  const avalBtn = document.getElementById('tab-btn-avalanche');
  const attBtn = document.getElementById('tab-btn-attack');
  const avalContent = document.getElementById('module-avalanche');
  const attContent = document.getElementById('module-attack');
  const subtitle = document.getElementById('clab-subtitle');

  if (moduleName === 'avalanche') {
    avalContent.classList.remove('hidden');
    attContent.classList.add('hidden');
    avalBtn.classList.add('active');
    attBtn.classList.remove('active');
    if (subtitle) subtitle.textContent = 'Avalanche Effect Analyzer · SHA-256';
  } else {
    avalContent.classList.add('hidden');
    attContent.classList.remove('hidden');
    avalBtn.classList.remove('active');
    attBtn.classList.add('active');
    if (subtitle) subtitle.textContent = 'Digital Signature Attack Analysis · RSA-2048';
  }
}

// 2. Adjust target message textarea depending on attack dropdown selection
function handleAttackTypeChange() {
  const type = document.getElementById('attack-type-select').value;
  const msgBox = document.getElementById('attack-target-message');
  if (type === 'private_key_compromise') {
    msgBox.value = 'Transfer ₹500000 to Attacker';
  } else {
    msgBox.value = 'Transfer ₹1000 to Bob';
  }
}

// 3. Post attack, parse details, draw flow diagrams, and refresh summary table
async function executeAttack() {
  const select = document.getElementById('attack-type-select');
  const attackType = select.value;
  const btn = document.getElementById('btn-attempt-attack');
  const errBox = document.getElementById('attack-error');
  const resultsPlaceholder = document.getElementById('attack-results-placeholder');
  const resultsContent = document.getElementById('attack-results-content');
  const dashEl = document.getElementById('attack-dashboard');

  errBox.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Attempting Attack…';

  try {
    const res = await fetch('/api/cryptanalysis/attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attackType })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error occurred');

    // Populate Fields
    document.getElementById('res-attack-name').textContent = data.attack;
    document.getElementById('res-attack-goal').textContent = data.goal;
    document.getElementById('res-attack-outcome').textContent = `Verification System: ${data.openSslResult}`;
    document.getElementById('res-attack-sig').textContent = data.signatureHex;

    const badge = document.getElementById('res-attack-badge');
    badge.textContent = data.result;
    if (data.result === 'SUCCESS') {
      badge.className = 'status-badge success';
      attackState[attackType] = 'Succeeded'; // Attack succeeded
    } else {
      badge.className = 'status-badge failed';
      attackState[attackType] = 'Failed'; // Attack failed
    }

    // Toggle Compromise Visualization
    const visual = document.getElementById('compromise-visual');
    if (attackType === 'private_key_compromise') {
      visual.classList.remove('hidden');
    } else {
      visual.classList.add('hidden');
    }

    // Security Note updates
    const securityNote = document.getElementById('res-attack-security-note');
    if (attackType === 'random_signature') {
      securityNote.innerHTML = '<strong>Security Analysis:</strong> Verification fails immediately. Without the private key, generating standard 2048-bit signature bytes that decrypt to a valid SHA-256 hash using the public key is mathematically impossible (equivalent to factoring a large semi-prime).';
    } else if (attackType === 'wrong_key') {
      securityNote.innerHTML = '<strong>Security Analysis:</strong> The attacker\'s goal was to impersonate Alice by signing the message with Mallory\'s own RSA keypair. Although the generated signature is cryptographically valid, it is valid only for Mallory\'s public key—not Alice\'s. During verification, Bob uses Alice\'s public key, causing the signature check to fail. This demonstrates that digital signatures provide authenticity because a signature must be mathematically linked to the expected identity\'s public key. Possessing a different valid keypair is insufficient to impersonate another user.';
    } else {
      securityNote.innerHTML = '<strong>Security Analysis:</strong> The signature is mathematically valid because it was signed with the correct private key. Bob\'s system trusts the key and accepts the request. This highlights that cryptography only verifies key possession, not the physical identity of the sender.';
    }

    // Render results pane
    resultsPlaceholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    
    // Refresh Dashboard Status
    updateDashboardUI();
    dashEl.classList.remove('hidden');
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Attempt Attack';
  }
}

// 4. Update the Session Dashboard
function updateDashboardUI() {
  const mapping = {
    random_signature: 'row-random',
    wrong_key: 'row-wrong',
    private_key_compromise: 'row-compromise'
  };

  let blocked = 0;
  let totalRun = 0;

  Object.keys(attackState).forEach(type => {
    const status = attackState[type];
    const row = document.getElementById(mapping[type]);
    const statusTd = row.querySelector('.dash-status');
    statusTd.textContent = status;

    statusTd.className = 'dash-status';
    if (status === 'Succeeded') {
      statusTd.classList.add('success'); // Green
      totalRun++;
    } else if (status === 'Failed') {
      statusTd.classList.add('failed'); // Red
      blocked++;
      totalRun++;
    }
  });

  document.getElementById('dash-blocked-count').textContent = `${blocked}/3 attacks blocked`;
}