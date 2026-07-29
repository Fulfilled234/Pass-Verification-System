/**
 * Notification dispatch stub.
 *
 * In production this would route to an in-app push provider. For this
 * exercise it only logs what would be sent, so the call site and payload
 * shape are already correct when a real provider is wired in later.
 */
function dispatchInAppNotification({ event, pass }) {
  const payload = {
    channel: 'IN_APP',
    event,
    passId: pass.id,
    passCode: pass.code,
    guestName: pass.guest_name,
    timestamp: new Date().toISOString(),
  };

  console.log('[notification]', JSON.stringify(payload));
  return payload;
}

module.exports = { dispatchInAppNotification };
