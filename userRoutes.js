const express = require("express");
const db = require("./db");

const router = express.Router();

router.get("/user/:id", (req, res) => {
  const userId = Number(req.params.id);

  if (!userId) {
    return res.status(400).json({ message: "Invalid user ID." });
  }

  const sql = `
    SELECT id, full_name, username, email
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.log("GET USER ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json(rows[0]);
  });
});

router.get("/users/search", (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({ message: "Search query is required." });
  }

  const sql = `
    SELECT id, username, email
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;

  db.query(sql, [q, q], (err, rows) => {
    if (err) {
      console.log("SEARCH USER ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ user: rows[0] });
  });
});

module.exports = router;