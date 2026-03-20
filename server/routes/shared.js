const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

function buildCrud(tableName, requiredField, recordType, updatableFields) {
  // GET all
  router.get(`/${tableName}`, (req, res) => {
    const db = req.app.locals.db;
    const rows = query(db, `SELECT * FROM ${tableName} ORDER BY created_at DESC`);
    const result = rows.map(r => ({ ...r, tags: getTagsForRecord(db, recordType, r.id) }));
    res.json(result);
  });

  // GET one
  router.get(`/${tableName}/:id`, (req, res) => {
    const db = req.app.locals.db;
    const rows = query(db, `SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const row = rows[0];
    row.tags = getTagsForRecord(db, recordType, row.id);
    row.notes = getNotesForRecord(db, recordType, row.id);
    res.json(row);
  });
}

module.exports = router;
