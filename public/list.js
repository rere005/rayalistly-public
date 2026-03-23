document.addEventListener("DOMContentLoaded", async () => {
  const myCreatedLists = document.getElementById("myCreatedLists");
  const toggleCreateMenuBtn = document.getElementById("toggleCreateMenuBtn");
  const createMenu = document.getElementById("mySubmenu");
  const historyListsEl = document.getElementById("historyLists");

  function getUserId() {
    const id = localStorage.getItem("userId");
    return id ? Number(id) : 0;
  }

  function createEmptyListMessage(text) {
    const li = document.createElement("li");
    li.className = "empty-list-item";
    li.textContent = text;
    return li;
  }

  function toggleCreateMenu() {
    if (!createMenu) return;
    createMenu.style.display = createMenu.style.display === "block" ? "none" : "block";
  }

  function getListPage(list) {
    if (list.list_type === "private") return "privatelist.html";
    if (list.list_type === "family") return "familylist.html";
    return "other.html";
  }

  async function fetchLists() {
    const userId = getUserId();
    if (!userId) return [];

    try {
      const res = await fetch(`/lists?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("GET LISTS ERROR:", data.message);
        return [];
      }

      return data.lists || [];
    } catch (err) {
      console.error("Could not fetch lists:", err);
      return [];
    }
  }

  async function fetchHistoryLists() {
    const userId = getUserId();
    if (!userId) return [];

    try {
      const res = await fetch(`/lists/history?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("GET HISTORY LISTS ERROR:", data.message);
        return [];
      }

      return data.lists || [];
    } catch (err) {
      console.error("Could not fetch history lists:", err);
      return [];
    }
  }

  async function moveListToHistory(listId) {
    const userId = getUserId();

    if (!userId || !listId) {
      return {
        ok: false,
        message: "Missing userId or listId."
      };
    }

    try {
      const res = await fetch(`/lists/${listId}?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          message: data.message || "Could not move list to history."
        };
      }

      return { ok: true, data };
    } catch (err) {
      console.error("DELETE LIST ERROR:", err);
      return {
        ok: false,
        message: "Server error while deleting the list."
      };
    }
  }

  async function restoreListFromHistory(listId) {
    const userId = getUserId();

    if (!userId || !listId) {
      return {
        ok: false,
        message: "Missing userId or listId."
      };
    }

    try {
      const res = await fetch(`/lists/${listId}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          message: data.message || "Could not restore the list."
        };
      }

      return { ok: true, data };
    } catch (err) {
      console.error("RESTORE LIST ERROR:", err);
      return {
        ok: false,
        message: "Server error while restoring the list."
      };
    }
  }

  async function deleteListForever(listId) {
    const userId = getUserId();

    if (!userId || !listId) {
      return {
        ok: false,
        message: "Missing userId or listId."
      };
    }

    try {
      const res = await fetch(`/lists/${listId}/history?userId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          message: data.message || "Could not delete the list permanently."
        };
      }

      return { ok: true, data };
    } catch (err) {
      console.error("DELETE HISTORY LIST ERROR:", err);
      return {
        ok: false,
        message: "Server error while deleting from history."
      };
    }
  }

  function createSavedListItem(list) {
    const li = document.createElement("li");
    li.className = "saved-list-item";

    const link = document.createElement("a");
    link.href = `${getListPage(list)}?id=${encodeURIComponent(list.id)}`;
    link.textContent = list.title;
    link.className = "saved-list-link";

    li.appendChild(link);

    if (list.relation_type === "owner") {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-list-btn";
      deleteBtn.setAttribute("aria-label", `Delete ${list.title}`);

      const icon = document.createElement("i");
      icon.className = "fa-solid fa-trash";
      deleteBtn.appendChild(icon);

      deleteBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const confirmed = confirm(`Move the list "${list.title}" to history?`);
        if (!confirmed) return;

        const result = await moveListToHistory(list.id);

        if (!result.ok) {
          alert(result.message);
          return;
        }

        await loadLists();
        await loadHistoryLists();
      });

      li.appendChild(deleteBtn);
    }

    return li;
  }

  function createHistoryListItem(list) {
    const li = document.createElement("li");
    li.className = "history-list-item";

    const link = document.createElement("a");
    link.href = "#";
    link.textContent = list.title;
    link.className = "history-list-link";

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.className = "restore-list-btn";
    restoreBtn.title = "Restore list";

    const restoreIcon = document.createElement("i");
    restoreIcon.className = "fa-solid fa-rotate-left";
    restoreBtn.appendChild(restoreIcon);

    restoreBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const result = await restoreListFromHistory(list.id);

      if (!result.ok) {
        alert(result.message);
        return;
      }

      await loadLists();
      await loadHistoryLists();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-history-btn";
    deleteBtn.title = "Delete permanently";

    const deleteIcon = document.createElement("i");
    deleteIcon.className = "fa-solid fa-trash";
    deleteBtn.appendChild(deleteIcon);

    deleteBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const confirmed = confirm(`Delete "${list.title}" permanently?`);
      if (!confirmed) return;

      const result = await deleteListForever(list.id);

      if (!result.ok) {
        alert(result.message);
        return;
      }

      await loadHistoryLists();
    });

    actions.appendChild(restoreBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(link);
    li.appendChild(actions);

    return li;
  }

  async function loadLists() {
    if (!myCreatedLists) return;

    const allLists = await fetchLists();
    myCreatedLists.innerHTML = "";

    if (allLists.length === 0) {
      myCreatedLists.appendChild(createEmptyListMessage("No lists yet"));
      return;
    }

    allLists.forEach((list) => {
      myCreatedLists.appendChild(createSavedListItem(list));
    });
  }

  async function loadHistoryLists() {
    if (!historyListsEl) return;

    const historyLists = await fetchHistoryLists();
    historyListsEl.innerHTML = "";

    if (historyLists.length === 0) {
      historyListsEl.appendChild(createEmptyListMessage("No history yet"));
      return;
    }

    historyLists.forEach((list) => {
      historyListsEl.appendChild(createHistoryListItem(list));
    });
  }

  toggleCreateMenuBtn?.addEventListener("click", toggleCreateMenu);

  await loadLists();
  await loadHistoryLists();
});

function toggleSavedLists() {
  const menu = document.getElementById("savedListsMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function toggleHistoryLists() {
  const menu = document.getElementById("historyMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}