const express = require('express');
const { createPassHandler } = require('../controllers/passesController');

const router = express.Router();

router.post('/', createPassHandler);

// POST /passes/verify is implemented in the next step.

module.exports = router;
