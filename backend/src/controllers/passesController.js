const { createPass, verifyPass } = require('../services/passesService');
const { dispatchInAppNotification } = require('../services/notificationService');

function isValidDateString(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

async function createPassHandler(req, res, next) {
  try {
    const { guest_name, host_reference, valid_date } = req.body || {};

    if (!guest_name || typeof guest_name !== 'string' || !guest_name.trim()) {
      return res.status(400).json({ error: 'guest_name is required' });
    }
    if (!host_reference || typeof host_reference !== 'string' || !host_reference.trim()) {
      return res.status(400).json({ error: 'host_reference is required' });
    }
    if (!valid_date || !isValidDateString(valid_date)) {
      return res.status(400).json({ error: 'valid_date is required and must be a valid date' });
    }

    const pass = await createPass({
      guestName: guest_name.trim(),
      hostReference: host_reference.trim(),
      validDate: valid_date,
    });

    return res.status(201).json(pass);
  } catch (err) {
    return next(err);
  }
}

async function verifyPassHandler(req, res, next) {
  try {
    const { code } = req.body || {};

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'code is required' });
    }

    const { result, pass } = await verifyPass(code.trim().toUpperCase());

    switch (result) {
      case 'NOT_FOUND':
        return res.status(404).json({ error: 'No pass found for this code' });
      case 'ALREADY_USED':
        return res.status(409).json({ error: 'Pass has already been used', pass });
      case 'EXPIRED':
        return res.status(409).json({ error: 'Pass has expired', pass });
      case 'VERIFIED':
        dispatchInAppNotification({ event: 'PASS_VERIFIED', pass });
        return res.status(200).json({ message: 'Pass verified', pass });
      default:
        return next(new Error(`Unhandled verify result: ${result}`));
    }
  } catch (err) {
    return next(err);
  }
}

module.exports = { createPassHandler, verifyPassHandler };
