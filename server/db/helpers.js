const { v4: uuidv4 } = require('uuid');

/**
 * Run db.exec and return structured results
 */
function query(db, sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const results = stmt.getAsObject ? [] : null;

    // For SELECT queries
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err) {
    throw err;
  }
}

/**
 * Run a write query (INSERT, UPDATE, DELETE)
 * sql.js requires null (not undefined) for unset values
 */
function run(db, sql, params = []) {
  db.run(sql, params.map(v => v === undefined ? null : v));
}

/**
 * Get tags for a record
 */
function getTagsForRecord(db, recordType, recordId) {
  return query(db, `
    SELECT t.* FROM tags t
    INNER JOIN record_tags rt ON rt.tag_id = t.id
    WHERE rt.record_type = ? AND rt.record_id = ?
    ORDER BY t.name
  `, [recordType, recordId]);
}

/**
 * Set tags on a record (replace all)
 */
function setTagsOnRecord(db, recordType, recordId, tagIds = []) {
  run(db, `DELETE FROM record_tags WHERE record_type = ? AND record_id = ?`, [recordType, recordId]);
  for (const tagId of tagIds) {
    run(db, `INSERT INTO record_tags (id, tag_id, record_type, record_id) VALUES (?,?,?,?)`,
      [uuidv4(), tagId, recordType, recordId]);
  }
}

/**
 * Get notes for a record
 */
function getNotesForRecord(db, recordType, recordId) {
  return query(db, `
    SELECT n.* FROM notes n
    INNER JOIN record_notes rn ON rn.note_id = n.id
    WHERE rn.record_type = ? AND rn.record_id = ?
    ORDER BY n.created_at DESC
  `, [recordType, recordId]);
}

/**
 * Link a note to a record
 */
function attachNoteToRecord(db, noteId, recordType, recordId) {
  const existing = query(db, `SELECT id FROM record_notes WHERE note_id = ? AND record_type = ? AND record_id = ?`,
    [noteId, recordType, recordId]);
  if (!existing.length) {
    run(db, `INSERT INTO record_notes (id, note_id, record_type, record_id) VALUES (?,?,?,?)`,
      [uuidv4(), noteId, recordType, recordId]);
  }
}

/**
 * Get links for a record
 */
function getLinksForRecord(db, recordType, recordId) {
  const asSource = query(db, `
    SELECT * FROM record_links WHERE source_type = ? AND source_id = ?
  `, [recordType, recordId]);
  const asTarget = query(db, `
    SELECT * FROM record_links WHERE target_type = ? AND target_id = ?
  `, [recordType, recordId]);
  return { outgoing: asSource, incoming: asTarget };
}

/**
 * Log activity
 */
function logActivity(db, action, recordType, recordId, recordTitle, details = null) {
  run(db, `INSERT INTO activity_log (id, action, record_type, record_id, record_title, details)
    VALUES (?,?,?,?,?,?)`,
    [uuidv4(), action, recordType, recordId, recordTitle, details]);
}

module.exports = { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord, attachNoteToRecord, getLinksForRecord, logActivity };
