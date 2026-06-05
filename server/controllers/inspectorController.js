const keyInspectorService = require('../services/keyInspectorService');

function getKeyMetadata(req, res) {
  try {
    res.json(keyInspectorService.getAliceKeyMetadata());
  } catch (err) {
    console.error('[inspector]', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getKeyMetadata };
