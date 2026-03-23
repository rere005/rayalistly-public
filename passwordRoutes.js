const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./db");
const transporter = require("./mailer");

const router = express.Router();

router.post("/forgot-password", (req, res) => {
  const username = (req.body.username || "").trim();
  const email = (req.body.email || "").trim();

  if (!username || !email) {
    return res.status(400).json({
      message: "Username and email are required."
    });
  }

  const findUserSql = `
    SELECT id, username, email
    FROM users
    WHERE username = ? AND email = ?
    LIMIT 1
  `;

  db.query(findUserSql, [username, email], (err, rows) => {
    if (err) {
      console.log("FORGOT PASSWORD ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No matching user was found."
      });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    db.query("DELETE FROM password_resets WHERE user_id = ?", [user.id], (err2) => {
      if (err2) {
        console.log("DELETE OLD TOKEN ERROR:", err2.message);
        return res.status(500).json({ message: "Database error." });
      }

      const insertSql = `
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `;

      db.query(insertSql, [user.id, token, expiresAt], (err3) => {
        if (err3) {
          console.log("INSERT RESET TOKEN ERROR:", err3.message);
          return res.status(500).json({ message: "Database error." });
        }

        const resetLink = `${process.env.BASE_URL}/ResetPassword.html?token=${token}`;

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: "Reset your password - RayaListly",
          html: `
            <h2>Password Reset</h2>
            <p>You requested to reset your password.</p>
            <p>Click the link below:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>This link expires in 30 minutes.</p>
          `
        };

        transporter.sendMail(mailOptions, (error) => {
          if (error) {
            console.log("MAIL ERROR:", error);
            return res.status(500).json({ message: "Could not send email." });
          }

          return res.json({ message: "Check your email for the reset link." });
        });
      });
    });
  });
});

router.post("/reset-password", async (req, res) => {
  const token = (req.body.token || "").trim();
  const password = req.body.password;

  if (!token || !password) {
    return res.status(400).json({
      message: "Token and password are required.",
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long.",
    });
  }

  const sql = `
    SELECT user_id, expires_at
    FROM password_resets
    WHERE token = ?
    LIMIT 1
  `;

  db.query(sql, [token], async (err, rows) => {
    if (err) {
      console.log("RESET PASSWORD ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired reset link.",
      });
    }

    const resetRow = rows[0];

    if (new Date() > new Date(resetRow.expires_at)) {
      return res.status(400).json({
        message: "This reset link has expired.",
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      db.query(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [passwordHash, resetRow.user_id],
        (err2) => {
          if (err2) {
            return res.status(500).json({ message: "Database error." });
          }

          db.query(
            "DELETE FROM password_resets WHERE user_id = ?",
            [resetRow.user_id],
            (err3) => {
              if (err3) {
                return res.status(500).json({ message: "Database error." });
              }

              return res.json({ message: "Password updated successfully." });
            }
          );
        }
      );
    } catch (error) {
      console.log("RESET PASSWORD HASH ERROR:", error.message);
      return res.status(500).json({ message: "Server error." });
    }
  });
});

router.post("/change-password", async (req, res) => {
  const userId = Number(req.body.userId);
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;

  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({
      message: "userId, currentPassword and newPassword are required.",
    });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({
      message: "New password must be at least 6 characters long.",
    });
  }

  const sql = `
    SELECT password_hash
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [userId], async (err, rows) => {
    if (err) {
      console.log("CHANGE PASSWORD ERROR:", err.message);
      return res.status(500).json({ message: "Database error." });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    try {
      const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);

      if (!ok) {
        return res.status(401).json({
          message: "Current password is incorrect.",
        });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      db.query(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newPasswordHash, userId],
        (err2) => {
          if (err2) {
            return res.status(500).json({ message: "Database error." });
          }

          return res.json({ message: "Password changed successfully." });
        }
      );
    } catch (error) {
      console.log("CHANGE PASSWORD HASH ERROR:", error.message);
      return res.status(500).json({ message: "Server error." });
    }
  });
});

module.exports = router;