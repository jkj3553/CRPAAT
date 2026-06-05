const avalancheService = require('../services/avalancheService');
const attackService = require('../services/attackService');

function analyzeAvalanche(req, res) {
  const { originalText, modifiedText } = req.body || {};

  if (typeof originalText !== 'string' || typeof modifiedText !== 'string') {
    return res.status(400).json({ error: 'originalText and modifiedText must be strings.' });
  }
  if (originalText.length === 0 || modifiedText.length === 0) {
    return res.status(400).json({ error: 'Inputs cannot be empty.' });
  }
  if (originalText.length > 5000 || modifiedText.length > 5000) {
    return res.status(400).json({ error: 'Input too long. Max 5000 characters.' });
  }

  try {
    const result = avalancheService.analyzeAvalanche(originalText, modifiedText);
    res.json(result);
  } catch (err) {
    console.error('[cryptanalysis]', err.message);
    res.status(500).json({ error: err.message });
  }
}

function runAttack(req, res) {
  const { attackType } = req.body || {};
  const validAttacks = ['random_signature', 'wrong_key', 'private_key_compromise'];

  if (!validAttacks.includes(attackType)) {
    return res.status(400).json({ error: 'Invalid attack type specified.' });
  }

  try {
    const result = attackService.executeAttack(attackType);
    res.json(result);
  } catch (err) {
    console.error('[attack]', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { analyzeAvalanche, runAttack };
