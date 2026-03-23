const express = require("express");
const db = require("./db");

const router = express.Router();

router.post("/friend-requests", (req, res) => {
  const fromUserId = Number(req.body.fromUserId);
  const q = (req.body.q || "").trim();

  if (!fromUserId || !q) {
    return res.status(400).json({
      message: "fromUserId and q are required.",
    });
  }

  const findSql = `
    SELECT id, username, email
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;

  db.query(findSql, [q, q], (err, rows) => {
    if (err) {
      console.log("FR FIND USER ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const toUser = rows[0];

    if (toUser.id === fromUserId) {
      return res.status(400).json({
        message: "You cannot send a request to yourself.",
      });
    }

    const contactCheckSql = `
      SELECT 1
      FROM contacts
      WHERE user_id = ? AND contact_user_id = ?
      LIMIT 1
    `;

    db.query(contactCheckSql, [fromUserId, toUser.id], (err2, rows2) => {
      if (err2) {
        return res.status(500).json({ message: "Database error." });
      }

      if (rows2.length > 0) {
        return res.status(400).json({
          message: "You are already contacts.",
        });
      }

      const insertSql = `
        INSERT INTO friend_requests (from_user_id, to_user_id, status)
        VALUES (?, ?, 'pending')
      `;

      db.query(insertSql, [fromUserId, toUser.id], (err3) => {
        if (err3) {
          if (err3.code === "ER_DUP_ENTRY") {
            return res.status(400).json({
              message: "A request already exists.",
            });
          }

          console.log("FR INSERT ERROR:", err3.message);
          return res.status(500).json({ message: "Database error." });
        }

        return res.status(201).json({
          message: "Friend request sent successfully.",
          toUser,
        });
      });
    });
  });
});

router.get("/friend-requests", (req, res) => {
  const userId = Number(req.query.userId);

  if (!userId) {
    return res.status(400).json({ message: "userId is required." });
  }

  const sql = `
    SELECT fr.id, fr.from_user_id, u.username, u.email, fr.created_at
    FROM friend_requests fr
    JOIN users u ON u.id = fr.from_user_id
    WHERE fr.to_user_id = ? AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.log("GET FRIEND REQUESTS ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    return res.json({ requests: rows });
  });
});

router.post("/friend-requests/:id/accept", (req, res) => {
  const requestId = Number(req.params.id);
  const userId = Number(req.body.userId);

  if (!requestId || !userId) {
    return res.status(400).json({
      message: "requestId and userId are required.",
    });
  }

  const getSql = `
    SELECT id, from_user_id, to_user_id, status
    FROM friend_requests
    WHERE id = ?
    LIMIT 1
  `;

  db.query(getSql, [requestId], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    const fr = rows[0];

    if (fr.to_user_id !== userId) {
      return res.status(403).json({ message: "Not allowed." });
    }

    if (fr.status !== "pending") {
      return res.status(400).json({ message: "This request is not pending." });
    }

    const insertSql = `
      INSERT INTO contacts (user_id, contact_user_id)
      VALUES (?, ?)
    `;

    db.query(insertSql, [fr.to_user_id, fr.from_user_id], (err2) => {
      if (err2 && err2.code !== "ER_DUP_ENTRY") {
        return res.status(500).json({ message: "Database error." });
      }

      db.query(insertSql, [fr.from_user_id, fr.to_user_id], (err3) => {
        if (err3 && err3.code !== "ER_DUP_ENTRY") {
          return res.status(500).json({ message: "Database error." });
        }

        db.query(
          "DELETE FROM friend_requests WHERE id = ?",
          [requestId],
          (err4) => {
            if (err4) {
              return res.status(500).json({ message: "Database error." });
            }

            return res.json({ message: "Friend request accepted." });
          }
        );
      });
    });
  });
});

router.post("/friend-requests/:id/decline", (req, res) => {
  const requestId = Number(req.params.id);
  const userId = Number(req.body.userId);

  if (!requestId || !userId) {
    return res.status(400).json({
      message: "requestId and userId are required.",
    });
  }

  const sql = `
    DELETE FROM friend_requests
    WHERE id = ? AND to_user_id = ? AND status = 'pending'
  `;

  db.query(sql, [requestId, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    return res.json({ message: "Friend request declined." });
  });
});

module.exports = router;