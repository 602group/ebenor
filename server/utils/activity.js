const { getDB, saveDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

/**
 * Logs a meaningful action to the global activity log.
 * @param {string} userId - The ID of the user performing the action (from req.user)
 * @param {string} action - The action performed (e.g., 'created', 'updated', 'status_changed', 'deleted')
 * @param {string} recordType - The type of record (e.g., 'trade', 'property', 'note', 'document')
 * @param {string} recordId - The ID of the record affected
 * @param {string} recordTitle - A human-readable title/name of the record for the feed
 * @param {string} details - Optional supplementary details (e.g., "Status changed from planned to active")
 */
function logActivity(userId, action, recordType, recordId, recordTitle, details = null) {
  try {
    const db = getDB();
    db.run(
      `INSERT INTO activity_log (id, user_id, action, record_type, record_id, record_title, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId || null, action, recordType, recordId, recordTitle, details]
    );
    saveDB();
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

module.exports = { logActivity };
