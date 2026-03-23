const express = require("express");
const db = require("./db");

const router = express.Router();

router.get("/contacts", (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  const sql = `
    SELECT c.id AS contactId, u.id AS userId, u.username, u.email
    FROM contacts c
    JOIN users u ON u.id = c.contact_user_id
    WHERE c.user_id = ?
    ORDER BY u.username ASC
  `;
  
  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.log("GET CONTACTS ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    return res.json({ contacts: rows });
  });
});

router.post("/contacts", (req, res) => {
  const userId = Number(req.body.userId);
  const q = (req.body.q || "").trim();

  if (!userId || !q) {
    return res.status(400).json({ message: "userId and q are required." });
  }

  const findSql = `
    SELECT id, username, email
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;

  db.query(findSql, [q, q], (err, rows) => {
    if (err) {
      console.log("FIND CONTACT USER ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const contactUser = rows[0];

    if (contactUser.id === userId) {
      return res.status(400).json({
        message: "You cannot add yourself as a contact.",
      });
    }

    const insertSql = `
      INSERT INTO contacts (user_id, contact_user_id)
      VALUES (?, ?)
    `;

    db.query(insertSql, [userId, contactUser.id], (err2) => {
      if (err2) {
        if (err2.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "This contact already exists.",
          });
        }

        console.log("INSERT CONTACT ERROR:", err2.message);
        return res.status(500).json({ message: "Database error." });
      }

      return res.status(201).json({
        message: "Contact added successfully.",
        contact: contactUser,
      });
    });
  });
});

router.delete("/contacts/:contactId", (req, res) => {
  const contactId = Number(req.params.contactId);
  const userId = Number(req.query.userId);

  if (!contactId || !userId) {
    return res.status(400).json({
      message: "contactId and userId are required.",
    });
  }

  const findSql = `
    SELECT contact_user_id
    FROM contacts
    WHERE id = ? AND user_id = ?
    LIMIT 1
  `;

  db.query(findSql, [contactId, userId], (err, rows) => {
    if (err) {
      console.log("DELETE CONTACT FIND ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Contact not found." });
    }

    const otherUserId = rows[0].contact_user_id;

    const deleteSql = `
      DELETE FROM contacts
      WHERE (user_id = ? AND contact_user_id = ?)
         OR (user_id = ? AND contact_user_id = ?)
    `;

    db.query(deleteSql, [userId, otherUserId, otherUserId, userId], (err2) => {
      if (err2) {
        console.log("DELETE CONTACT ERROR:", err2.message);
        return res.status(500).json({ message: "Database error." });
      }

      return res.json({ message: "Contact removed successfully." });
    });
  });
});

module.exports = router;