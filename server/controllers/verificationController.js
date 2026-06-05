const verificationService = require('../services/verificationService');

function runPipeline(req, res) {
  const { scenario } = req.body || {};

  if (!scenario || !verificationService.VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({
      error: `Invalid scenario. Must be one of: ${verificationService.VALID_SCENARIOS.join(', ')}`,
    });
  }

  try {
    res.json(verificationService.runPipeline(scenario));
  } catch (err) {
    console.error('[verification-pipeline]', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { runPipeline };
