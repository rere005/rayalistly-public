const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { fullName, username, email, password } = req.body;

  if (!fullName || !username || !email || !password) {
    return res.status(400).json({
      message: "Full name, username, email and password are required.",
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }


  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (full_name, username, email, password_hash, is_verified)
      VALUES (?, ?, ?, ?, 1)
    `;

    db.query(sql, [fullName, username, email, passwordHash], (err) => {
      if (err) {
        console.log("REGISTER ERROR:", err.code, err.message);

        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Username or email already exists.",
          });
        }

        return res.status(500).json({ message: "Database error." });
      }

      return res.status(201).json({
        message: "Account created successfully. You can log in now.",
      });
    });
  } catch (error) {
    console.log("REGISTER SERVER ERROR:", error.message);
    return res.status(500).json({ message: "Server error." });
  }
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required.",
    });
  }

  const sql = `
    SELECT id, password_hash
    FROM users
    WHERE username = ?
    LIMIT 1
  `;

  db.query(sql, [username], async (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({
        message: "Invalid username or password.",
      });
    }

    return res.json({
      message: "Login successful.",
      userId: user.id,
    });
  });
});

module.exports = router;