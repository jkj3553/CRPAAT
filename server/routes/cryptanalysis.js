const express = require('express');
const ctrl = require('../controllers/cryptanalysisController');

const router = express.Router();

router.post('/cryptanalysis/avalanche', ctrl.analyzeAvalanche);
router.post('/cryptanalysis/attack', ctrl.runAttack);

module.exports = router;
