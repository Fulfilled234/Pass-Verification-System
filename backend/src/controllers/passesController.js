const { createPass } = require('../services/passesService');

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

module.exports = { createPassHandler };
