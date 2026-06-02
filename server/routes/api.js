const express = require('express');
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/signatureController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, 'original.txt'),
});
const upload = multer({ storage });

router.post('/generate-keypair', ctrl.generateKeypair);
router.post('/upload',           upload.single('document'), ctrl.upload);
router.post('/sign',             ctrl.sign);
router.post('/transmit',         ctrl.transmit);
router.post('/modify',           ctrl.modify);
router.post('/verify',           ctrl.verify);
router.get('/state',             ctrl.getState);

module.exports = router;
