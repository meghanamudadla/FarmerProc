/**
 * Generates a formatted timestamp string (HH:MM IST)
 */
export function getFormattedTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Creates an audit trail log entry
 */
export function createAuditEvent(event, role = 'Procurement Officer', details = '') {
  return {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: getFormattedTime(),
    date: new Date().toLocaleDateString('en-IN'),
    event,
    role,
    details,
  };
}
