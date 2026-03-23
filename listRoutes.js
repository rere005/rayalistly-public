const express = require("express");
const db = require("./db");

const router = express.Router();

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function badRequest(res, message) {
  return res.status(400).json({ message });
}

function serverError(res, label, err) {
  console.log(label, err.message);
  return res.status(500).json({ message: "Database error." });
}

async function getAccessibleList(listId, userId) {
  const sql = `
    SELECT l.*
    FROM lists l
    LEFT JOIN list_shares s ON l.id = s.list_id
    WHERE l.id = ?
      AND (l.owner_id = ? OR s.shared_with_user_id = ?)
    LIMIT 1
  `;
  const rows = await query(sql, [listId, userId, userId]);
  return rows[0] || null;
}

async function getOwnerList(listId, userId) {
  const sql = `
    SELECT id, owner_id, list_type, title
    FROM lists
    WHERE id = ? AND owner_id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [listId, userId]);
  return rows[0] || null;
}

async function findUserByQuery(q) {
  const sql = `
    SELECT id, username, email
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1
  `;
  const rows = await query(sql, [q, q]);
  return rows[0] || null;
}

async function isMember(listId, userId) {
  const sql = `
    SELECT id
    FROM list_shares
    WHERE list_id = ? AND shared_with_user_id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [listId, userId]);
  return rows.length > 0;
}

async function getListRole(listId, userId) {
  const sql = `
    SELECT
      l.id,
      l.owner_id,
      CASE
        WHEN l.owner_id = ? THEN 'owner'
        WHEN s.shared_with_user_id IS NOT NULL THEN 'member'
        ELSE 'none'
      END AS role,
      s.permission
    FROM lists l
    LEFT JOIN list_shares s
      ON s.list_id = l.id AND s.shared_with_user_id = ?
    WHERE l.id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [userId, userId, listId]);
  return rows[0] || null;
}

router.post("/lists", async (req, res) => {
  try {
    const userId = Number(req.body.userId);
    const title = (req.body.title || "").trim();
    const listType = (req.body.listType || "other").trim();

    if (!userId || !title) {
      return badRequest(res, "userId and title are required.");
    }

    const result = await query(
      `
      INSERT INTO lists (owner_id, title, list_type)
      VALUES (?, ?, ?)
      `,
      [userId, title, listType]
    );

    return res.status(201).json({
      message: "List created successfully.",
      listId: result.insertId
    });
  } catch (err) {
    return serverError(res, "CREATE LIST ERROR:", err);
  }
});

router.get("/lists", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return badRequest(res, "userId is required.");
    }

    const sql = `
      SELECT DISTINCT
        l.id,
        l.title,
        l.list_type,
        l.owner_id,
        l.created_at,
        l.updated_at,
        l.is_deleted,
        l.deleted_at,
        CASE
          WHEN l.owner_id = ? THEN 'owner'
          ELSE 'shared'
        END AS relation_type
      FROM lists l
      LEFT JOIN list_shares s ON l.id = s.list_id
      WHERE (l.owner_id = ? OR s.shared_with_user_id = ?)
        AND l.is_deleted = 0
      ORDER BY l.updated_at DESC, l.id DESC
    `;

    const rows = await query(sql, [userId, userId, userId]);
    return res.json({ lists: rows });
  } catch (err) {
    return serverError(res, "GET LISTS ERROR:", err);
  }
});
router.get("/lists/history", async (req, res) => {
  try {
    const userId = Number(req.query.userId);


    if (!userId) {
      return badRequest(res, "userId is required.");
    }


    const rows = await query(
      `
      SELECT
        id,
        title,
        list_type,
        owner_id,
        created_at,
        updated_at,
        is_deleted,
        deleted_at
      FROM lists
      WHERE owner_id = ?
        AND is_deleted = 1
      ORDER BY deleted_at DESC, id DESC
      `,
      [userId]
    );


    return res.json({ lists: rows });
  } catch (err) {
    return serverError(res, "GET HISTORY LISTS ERROR:", err);
  }
});
router.get("/lists/:id", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const list = await getAccessibleList(listId, userId);

    if (!list) {
      return res.status(404).json({ message: "List not found." });
    }

    return res.json({ list });
  } catch (err) {
    return serverError(res, "GET LIST ERROR:", err);
  }
});

router.get("/lists/:id/members", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const list = await getAccessibleList(listId, userId);

    if (!list) {
      return res.status(404).json({ message: "List not found." });
    }

    const members = await query(
      `
      SELECT ls.id, u.id AS user_id, u.username, u.email, ls.permission
      FROM list_shares ls
      JOIN users u ON u.id = ls.shared_with_user_id
      WHERE ls.list_id = ?
      ORDER BY u.username ASC
      `,
      [listId]
    );

    return res.json({ members });
  } catch (err) {
    return serverError(res, "GET LIST MEMBERS ERROR:", err);
  }
});

router.get("/lists/:id/items", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const list = await getAccessibleList(listId, userId);

    if (!list) {
      return res.status(404).json({ message: "List not found." });
    }

    const items = await query(
      `
      SELECT id, text, quantity, unit, is_completed, position_index, created_at
      FROM list_items
      WHERE list_id = ?
      ORDER BY position_index ASC, id ASC
      `,
      [listId]
    );

    return res.json({ items });
  } catch (err) {
    return serverError(res, "GET LIST ITEMS ERROR:", err);
  }
});

router.post("/lists/:id/items", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const text = (req.body.text || "").trim();
    const quantity = (req.body.quantity || "1").toString().trim();
    const unit = (req.body.unit || "pcs").toString().trim();

    if (!listId || !userId || !text) {
      return badRequest(res, "listId, userId and text are required.");
    }

    const list = await getAccessibleList(listId, userId);

    if (!list) {
      return res.status(404).json({ message: "List not found." });
    }

    if (list.owner_id !== userId) {
      const shareRows = await query(
        `
        SELECT permission
        FROM list_shares
        WHERE list_id = ? AND shared_with_user_id = ?
        LIMIT 1
        `,
        [listId, userId]
      );

      if (shareRows.length === 0 || shareRows[0].permission !== "edit") {
        return res.status(403).json({
          message: "You do not have permission to edit this list."
        });
      }
    }

    const posRows = await query(
      `
      SELECT COALESCE(MAX(position_index), -1) AS maxPos
      FROM list_items
      WHERE list_id = ?
      `,
      [listId]
    );

    const nextPos = Number(posRows[0].maxPos) + 1;

    const result = await query(
      `
      INSERT INTO list_items (list_id, text, quantity, unit, position_index)
      VALUES (?, ?, ?, ?, ?)
      `,
      [listId, text, quantity, unit, nextPos]
    );

    return res.status(201).json({
      message: "Item added successfully.",
      itemId: result.insertId
    });
  } catch (err) {
    return serverError(res, "ADD ITEM ERROR:", err);
  }
});

router.put("/items/:itemId", async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = Number(req.body.userId);
    const text = req.body.text;
    const isCompleted = req.body.is_completed;

    if (!itemId || !userId) {
      return badRequest(res, "itemId and userId are required.");
    }

    const rows = await query(
      `
      SELECT li.id, li.list_id, l.owner_id
      FROM list_items li
      JOIN lists l ON l.id = li.list_id
      LEFT JOIN list_shares s ON s.list_id = l.id AND s.shared_with_user_id = ?
      WHERE li.id = ?
        AND (l.owner_id = ? OR s.shared_with_user_id = ?)
      LIMIT 1
      `,
      [userId, itemId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Item not found." });
    }

    const itemRow = rows[0];

    if (itemRow.owner_id !== userId) {
      const shareRows = await query(
        `
        SELECT permission
        FROM list_shares
        WHERE list_id = ? AND shared_with_user_id = ?
        LIMIT 1
        `,
        [itemRow.list_id, userId]
      );

      if (shareRows.length === 0 || shareRows[0].permission !== "edit") {
        return res.status(403).json({
          message: "You do not have permission to edit this list."
        });
      }
    }

    const fields = [];
    const values = [];

    if (typeof text === "string") {
      fields.push("text = ?");
      values.push(text.trim());
    }

    if (typeof isCompleted !== "undefined") {
      fields.push("is_completed = ?");
      values.push(isCompleted ? 1 : 0);
    }

    if (fields.length === 0) {
      return badRequest(res, "Nothing to update.");
    }

    values.push(itemId);

    await query(
      `
      UPDATE list_items
      SET ${fields.join(", ")}
      WHERE id = ?
      `,
      values
    );

    return res.json({ message: "Item updated successfully." });
  } catch (err) {
    return serverError(res, "UPDATE ITEM ERROR:", err);
  }
});

router.delete("/items/:itemId", async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const userId = Number(req.query.userId);

    if (!itemId || !userId) {
      return badRequest(res, "itemId and userId are required.");
    }

    const rows = await query(
      `
      SELECT li.id, li.list_id, l.owner_id
      FROM list_items li
      JOIN lists l ON l.id = li.list_id
      LEFT JOIN list_shares s ON s.list_id = l.id AND s.shared_with_user_id = ?
      WHERE li.id = ?
        AND (l.owner_id = ? OR s.shared_with_user_id = ?)
      LIMIT 1
      `,
      [userId, itemId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Item not found." });
    }

    const itemRow = rows[0];

    if (itemRow.owner_id !== userId) {
      const shareRows = await query(
        `
        SELECT permission
        FROM list_shares
        WHERE list_id = ? AND shared_with_user_id = ?
        LIMIT 1
        `,
        [itemRow.list_id, userId]
      );

      if (shareRows.length === 0 || shareRows[0].permission !== "edit") {
        return res.status(403).json({
          message: "You do not have permission to edit this list."
        });
      }
    }

    await query(`DELETE FROM list_items WHERE id = ?`, [itemId]);
    return res.json({ message: "Item deleted successfully." });
  } catch (err) {
    return serverError(res, "DELETE ITEM ERROR:", err);
  }
});

router.delete("/lists/:id", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const list = await getOwnerList(listId, userId);

    if (!list) {
      return res.status(404).json({
        message: "List not found or access denied."
      });
    }

    await query(
      `
      UPDATE lists
      SET is_deleted = 1, deleted_at = NOW()
      WHERE id = ? AND owner_id = ?
      `,
      [listId, userId]
    );

    return res.json({ message: "List moved to history successfully." });
  } catch (err) {
    return serverError(res, "DELETE LIST ERROR:", err);
  }
});

router.post("/lists/:id/share", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const q = (req.body.q || "").trim();
    const permission = req.body.permission === "edit" ? "edit" : "view";

    if (!listId || !userId || !q) {
      return badRequest(res, "listId, userId and q are required.");
    }

    const list = await getOwnerList(listId, userId);

    if (!list) {
      return res.status(403).json({
        message: "Only the owner can share this list."
      });
    }

    const targetUser = await findUserByQuery(q);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.id === userId) {
      return badRequest(res, "You cannot share a list with yourself.");
    }

    if (await isMember(listId, targetUser.id)) {
      return badRequest(res, "This user is already a member of this list.");
    }

    const existingAccepted = await query(
      `
      SELECT id
      FROM list_share_requests
      WHERE list_id = ?
        AND requested_by_user_id = ?
        AND target_user_id = ?
        AND status = 'accepted'
      LIMIT 1
      `,
      [listId, userId, targetUser.id]
    );

    if (existingAccepted.length > 0) {
      return badRequest(res, "This user has already been invited before.");
    }

    const pendingRows = await query(
      `
      SELECT id
      FROM list_share_requests
      WHERE list_id = ?
        AND requested_by_user_id = ?
        AND target_user_id = ?
        AND status IN ('pending', 'pending_target')
      LIMIT 1
      `,
      [listId, userId, targetUser.id]
    );

    if (pendingRows.length > 0) {
      return badRequest(res, "A pending request already exists for this user.");
    }

    if (list.list_type === "family" || list.list_type === "other") {
      const result = await query(
        `
        INSERT INTO list_share_requests (list_id, requested_by_user_id, target_user_id, status)
        VALUES (?, ?, ?, 'pending_target')
        `,
        [listId, userId, targetUser.id]
      );

      return res.status(201).json({
        message: "Invitation sent to user.",
        requestId: result.insertId,
        user: targetUser
      });
    }

    const result = await query(
      `
      INSERT INTO list_shares (list_id, shared_with_user_id, permission)
      VALUES (?, ?, ?)
      `,
      [listId, targetUser.id, permission]
    );

    return res.status(201).json({
      message: "List shared successfully.",
      user: targetUser,
      shareId: result.insertId
    });
  } catch (err) {
    return serverError(res, "SHARE LIST ERROR:", err);
  }
});

router.post("/lists/:id/share-request", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const q = (req.body.q || "").trim();

    if (!listId || !userId || !q) {
      return badRequest(res, "listId, userId and q are required.");
    }

    const list = await getAccessibleList(listId, userId);

    if (!list) {
      return res.status(404).json({ message: "List not found." });
    }

    if (list.owner_id === userId) {
      return badRequest(res, "Owner can share directly.");
    }

    const targetUser = await findUserByQuery(q);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.id === userId) {
      return badRequest(res, "You cannot request yourself.");
    }

    if (targetUser.id === list.owner_id) {
      return badRequest(res, "That user already owns this list.");
    }

    if (await isMember(listId, targetUser.id)) {
      return badRequest(res, "That user is already a member of this list.");
    }

    const existingAccepted = await query(
      `
      SELECT id
      FROM list_share_requests
      WHERE list_id = ?
        AND requested_by_user_id = ?
        AND target_user_id = ?
        AND status = 'accepted'
      LIMIT 1
      `,
      [listId, userId, targetUser.id]
    );

    if (existingAccepted.length > 0) {
      return badRequest(res, "This user has already been requested before.");
    }

    const pendingRows = await query(
      `
      SELECT id
      FROM list_share_requests
      WHERE list_id = ?
        AND requested_by_user_id = ?
        AND target_user_id = ?
        AND status IN ('pending', 'pending_target')
      LIMIT 1
      `,
      [listId, userId, targetUser.id]
    );

    if (pendingRows.length > 0) {
      return badRequest(res, "A request is already pending for this user.");
    }

    const result = await query(
      `
      INSERT INTO list_share_requests (list_id, requested_by_user_id, target_user_id, status)
      VALUES (?, ?, ?, 'pending')
      `,
      [listId, userId, targetUser.id]
    );

    return res.status(201).json({
      message: "Request sent to owner.",
      requestId: result.insertId
    });
  } catch (err) {
    return serverError(res, "SHARE REQUEST ERROR:", err);
  }
});

router.get("/lists/:id/role", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const row = await getListRole(listId, userId);

    if (!row || row.role === "none") {
      return res.status(404).json({ message: "List not found." });
    }

    return res.json({
      role: row.role,
      permission: row.permission || null,
      ownerId: row.owner_id
    });
  } catch (err) {
    return serverError(res, "GET LIST ROLE ERROR:", err);
  }
});

router.get("/list-share-requests", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return badRequest(res, "userId is required.");
    }

    const requests = await query(
      `
      SELECT
        lsr.id,
        lsr.list_id,
        lsr.requested_by_user_id,
        lsr.target_user_id,
        lsr.status,
        l.title AS list_title,
        requester.username AS requester_username,
        target.username AS target_username
      FROM list_share_requests lsr
      JOIN lists l ON l.id = lsr.list_id
      JOIN users requester ON requester.id = lsr.requested_by_user_id
      JOIN users target ON target.id = lsr.target_user_id
      WHERE l.owner_id = ?
        AND lsr.status = 'pending'
      ORDER BY lsr.id DESC
      `,
      [userId]
    );

    return res.json({ requests });
  } catch (err) {
    return serverError(res, "GET LIST SHARE REQUESTS ERROR:", err);
  }
});

router.post("/list-share-requests/:id/accept", async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!requestId || !userId) {
      return badRequest(res, "requestId and userId are required.");
    }

    const rows = await query(
      `
      SELECT
        lsr.id,
        lsr.list_id,
        lsr.requested_by_user_id,
        lsr.target_user_id,
        lsr.status,
        l.owner_id
      FROM list_share_requests lsr
      JOIN lists l ON l.id = lsr.list_id
      WHERE lsr.id = ?
      LIMIT 1
      `,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const requestRow = rows[0];

    if (requestRow.owner_id !== userId) {
      return res.status(403).json({
        message: "Only the owner can accept this request."
      });
    }

    if (requestRow.status === "accepted") {
      return res.json({ message: "Request already accepted." });
    }

    if (requestRow.status !== "pending") {
      return badRequest(res, "This request is not pending.");
    }

    const existingPendingTarget = await query(
      `
      SELECT id
      FROM list_share_requests
      WHERE list_id = ?
        AND requested_by_user_id = ?
        AND target_user_id = ?
        AND status = 'pending_target'
        AND id <> ?
      LIMIT 1
      `,
      [
        requestRow.list_id,
        requestRow.requested_by_user_id,
        requestRow.target_user_id,
        requestId
      ]
    );

    if (existingPendingTarget.length > 0) {
      await query(`UPDATE list_share_requests SET status = 'declined' WHERE id = ?`, [requestId]);
      return res.json({
        message: "Invitation already exists for that user."
      });
    }

    await query(
      `UPDATE list_share_requests SET status = 'pending_target' WHERE id = ?`,
      [requestId]
    );

    return res.json({
      message: "Request approved. Invitation sent to the target user."
    });
  } catch (err) {
    return serverError(res, "ACCEPT LIST SHARE REQUEST ERROR:", err);
  }
});

router.post("/list-share-requests/:id/decline", async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!requestId || !userId) {
      return badRequest(res, "requestId and userId are required.");
    }

    const rows = await query(
      `
      SELECT
        lsr.id,
        l.owner_id,
        lsr.status
      FROM list_share_requests lsr
      JOIN lists l ON l.id = lsr.list_id
      WHERE lsr.id = ?
      LIMIT 1
      `,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const requestRow = rows[0];

    if (requestRow.owner_id !== userId) {
      return res.status(403).json({
        message: "Only the owner can decline this request."
      });
    }

    if (requestRow.status === "declined") {
      return res.json({ message: "Request already declined." });
    }

    await query(`UPDATE list_share_requests SET status = 'declined' WHERE id = ?`, [requestId]);

    return res.json({ message: "Request declined successfully." });
  } catch (err) {
    return serverError(res, "DECLINE LIST SHARE REQUEST ERROR:", err);
  }
});

router.get("/target-list-invitations", async (req, res) => {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return badRequest(res, "userId is required.");
    }

    const invitations = await query(
      `
      SELECT
        lsr.id,
        lsr.list_id,
        l.title AS list_title,
        l.owner_id,
        owner.username AS owner_username
      FROM list_share_requests lsr
      JOIN lists l ON l.id = lsr.list_id
      JOIN users owner ON owner.id = l.owner_id
      WHERE lsr.target_user_id = ?
        AND lsr.status = 'pending_target'
      ORDER BY lsr.id DESC
      `,
      [userId]
    );

    return res.json({ invitations });
  } catch (err) {
    return serverError(res, "GET TARGET INVITATIONS ERROR:", err);
  }
});

router.post("/target-list-invitations/:id/accept", async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!invitationId || !userId) {
      return badRequest(res, "invitationId and userId are required.");
    }

    const rows = await query(
      `
      SELECT
        lsr.id,
        lsr.list_id,
        lsr.target_user_id,
        lsr.status
      FROM list_share_requests lsr
      WHERE lsr.id = ?
      LIMIT 1
      `,
      [invitationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    const invitation = rows[0];

    if (invitation.target_user_id !== userId) {
      return res.status(403).json({
        message: "This invitation does not belong to you."
      });
    }

    if (invitation.status === "accepted") {
      return res.json({ message: "Invitation already accepted." });
    }

    if (invitation.status !== "pending_target") {
      return badRequest(res, "This invitation is not pending.");
    }

    if (!(await isMember(invitation.list_id, userId))) {
      await query(
        `
        INSERT INTO list_shares (list_id, shared_with_user_id, permission)
        VALUES (?, ?, 'edit')
        `,
        [invitation.list_id, userId]
      );
    }

    await query(
      `UPDATE list_share_requests SET status = 'accepted' WHERE id = ?`,
      [invitationId]
    );

    return res.json({ message: "Invitation accepted successfully." });
  } catch (err) {
    return serverError(res, "ACCEPT TARGET INVITATION ERROR:", err);
  }
});

router.post("/target-list-invitations/:id/decline", async (req, res) => {
  try {
    const invitationId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!invitationId || !userId) {
      return badRequest(res, "invitationId and userId are required.");
    }

    const rows = await query(
      `
      SELECT
        lsr.id,
        lsr.target_user_id,
        lsr.status
      FROM list_share_requests lsr
      WHERE lsr.id = ?
      LIMIT 1
      `,
      [invitationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invitation not found." });
    }

    const invitation = rows[0];

    if (invitation.target_user_id !== userId) {
      return res.status(403).json({
        message: "This invitation does not belong to you."
      });
    }

    if (invitation.status === "declined") {
      return res.json({ message: "Invitation already declined." });
    }

    await query(
      `UPDATE list_share_requests SET status = 'declined' WHERE id = ?`,
      [invitationId]
    );

    return res.json({ message: "Invitation declined successfully." });
  } catch (err) {
    return serverError(res, "DECLINE TARGET INVITATION ERROR:", err);
  }
});
router.post("/lists/:id/restore", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.body.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const rows = await query(
      `
      SELECT id
      FROM lists
      WHERE id = ? AND owner_id = ? AND is_deleted = 1
      LIMIT 1
      `,
      [listId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "List not found in history." });
    }

    await query(
      `
      UPDATE lists
      SET is_deleted = 0, deleted_at = NULL
      WHERE id = ? AND owner_id = ?
      `,
      [listId, userId]
    );

    return res.json({ message: "List restored successfully." });
  } catch (err) {
    return serverError(res, "RESTORE LIST ERROR:", err);
  }
});
router.delete("/lists/:id/history", async (req, res) => {
  try {
    const listId = Number(req.params.id);
    const userId = Number(req.query.userId);

    if (!listId || !userId) {
      return badRequest(res, "listId and userId are required.");
    }

    const rows = await query(
      `
      SELECT id
      FROM lists
      WHERE id = ? AND owner_id = ? AND is_deleted = 1
      LIMIT 1
      `,
      [listId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "List not found in history." });
    }

    await query(`DELETE FROM list_items WHERE list_id = ?`, [listId]);
    await query(`DELETE FROM list_shares WHERE list_id = ?`, [listId]);
    await query(`DELETE FROM list_share_requests WHERE list_id = ?`, [listId]);
    await query(`DELETE FROM lists WHERE id = ? AND owner_id = ?`, [listId, userId]);

    return res.json({ message: "List deleted permanently." });
  } catch (err) {
    return serverError(res, "DELETE HISTORY LIST ERROR:", err);
  }
});
module.exports = router;