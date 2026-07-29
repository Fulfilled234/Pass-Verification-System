const express = require('express');
const { createPassHandler, verifyPassHandler } = require('../controllers/passesController');

const router = express.Router();

router.post('/', createPassHandler);
router.post('/verify', verifyPassHandler);

module.exports = router;
