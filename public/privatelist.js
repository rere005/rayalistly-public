const itemNameInput = document.getElementById("itemNameInput");
const quantityInput = document.getElementById("quantityInput");
const unitSelect = document.getElementById("unitSelect");
const addItemBtn = document.getElementById("addItemBtn");
const visualItemList = document.getElementById("visualItemList");
const listNameInput = document.getElementById("listNameInput");
const saveListBtn = document.getElementById("saveListBtn");

let currentListId = null;
let shoppingItems = [];

function getUserId() {
  const id = localStorage.getItem("userId");
  return id ? Number(id) : 0;
}

function createEmptyState() {
  const li = document.createElement("li");
  li.className = "empty-state";
  li.textContent = "No items added yet.";
  return li;
}

function createCheckButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "check-btn";
  button.setAttribute("data-item-id", item.id);

  if (item.is_completed) {
    button.classList.add("checked");
  }

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-check";
  button.appendChild(icon);

  return button;
}

function createItemText(item) {
  const span = document.createElement("span");
  span.className = "item-text";
  span.textContent = item.text;

  if (item.is_completed) {
    span.classList.add("completed");
  }

  return span;
}

function createBadge(item) {
  const badge = document.createElement("span");
  badge.className = "item-badge";
  badge.textContent = item.is_completed ? "Bought" : `${item.quantity} ${item.unit}`;
  return badge;
}

function createActionButton(className, iconClass, dataAttribute, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute(dataAttribute, value);

  const icon = document.createElement("i");
  icon.className = iconClass;
  button.appendChild(icon);

  return button;
}

function createItemRow(item) {
  const li = document.createElement("li");
  li.className = "item-row";

  const left = document.createElement("div");
  left.className = "item-left";

  const actions = document.createElement("div");
  actions.className = "item-actions";

  const checkBtn = createCheckButton(item);
  const text = createItemText(item);
  const badge = createBadge(item);
  const editBtn = createActionButton("edit-btn", "fa-solid fa-pen", "data-edit-item-id", item.id);
  const deleteBtn = createActionButton("delete-btn", "fa-solid fa-trash", "data-delete-item-id", item.id);

  left.appendChild(checkBtn);
  left.appendChild(text);

  actions.appendChild(badge);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(left);
  li.appendChild(actions);

  return li;
}

function renderList() {
  visualItemList.innerHTML = "";

  if (shoppingItems.length === 0) {
    visualItemList.appendChild(createEmptyState());
    return;
  }

  shoppingItems.forEach((item) => {
    visualItemList.appendChild(createItemRow(item));
  });
}

async function loadListById(listId) {
  const userId = getUserId();

  if (!userId || !listId) return;

  try {
    const res = await fetch(`/lists/${listId}?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not load list.");
      return;
    }

    currentListId = data.list.id;
    listNameInput.value = data.list.title;
    listNameInput.disabled = true;
    saveListBtn.textContent = "Saved";
  } catch (error) {
    console.error("LOAD PRIVATE LIST ERROR:", error);
    alert("Server error while loading the list.");
  }
}

async function loadItems() {
  const userId = getUserId();

  if (!userId || !currentListId) return;

  try {
    const res = await fetch(`/lists/${currentListId}/items?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not load items.");
      return;
    }

    shoppingItems = data.items || [];
    renderList();
  } catch (error) {
    console.error("LOAD PRIVATE LIST ITEMS ERROR:", error);
    alert("Server error while loading items.");
  }
}

async function createPrivateList() {
  const userId = getUserId();
  const listName = listNameInput.value.trim();

  if (!userId) {
    alert("You must be logged in.");
    return false;
  }

  if (!listName) {
    alert("Please enter a list name.");
    return false;
  }

  try {
    const res = await fetch("/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title: listName, listType: "private" }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not create the private list.");
      return false;
    }

    currentListId = data.listId;
    listNameInput.disabled = true;
    return true;
  } catch (error) {
    console.error("CREATE PRIVATE LIST ERROR:", error);
    alert("Server error while creating the list.");
    return false;
  }
}

async function addItem() {
  const userId = getUserId();
  const itemName = itemNameInput.value.trim();
  const quantity = quantityInput.value.trim() || "1";
  const unit = unitSelect.value || "pcs";

  if (!itemName) return;

  if (!currentListId) {
    const created = await createPrivateList();
    if (!created) return;
  }

  try {
    const res = await fetch(`/lists/${currentListId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, text: itemName, quantity, unit }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not add item.");
      return;
    }

    itemNameInput.value = "";
    quantityInput.value = "";
    unitSelect.value = "pcs";

    await loadItems();
  } catch (error) {
    console.error("ADD PRIVATE ITEM ERROR:", error);
    alert("Server error while adding the item.");
  }
}

async function toggleComplete(itemId) {
  const userId = getUserId();
  const item = shoppingItems.find((x) => x.id === itemId);

  if (!item) return;

  try {
    const res = await fetch(`/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_completed: !item.is_completed }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not update item.");
      return;
    }

    await loadItems();
  } catch (error) {
    console.error("TOGGLE PRIVATE ITEM ERROR:", error);
    alert("Server error while updating the item.");
  }
}

async function removeItem(itemId) {
  const userId = getUserId();

  try {
    const res = await fetch(`/items/${itemId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not delete item.");
      return;
    }

    await loadItems();
  } catch (error) {
    console.error("DELETE PRIVATE ITEM ERROR:", error);
    alert("Server error while deleting the item.");
  }
}

async function editItem(itemId) {
  const userId = getUserId();
  const item = shoppingItems.find((x) => x.id === itemId);

  if (!item) return;

  const newText = prompt("Edit item:", item.text);

  if (!newText || !newText.trim()) return;

  try {
    const res = await fetch(`/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, text: newText.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not edit item.");
      return;
    }

    await loadItems();
  } catch (error) {
    console.error("EDIT PRIVATE ITEM ERROR:", error);
    alert("Server error while editing the item.");
  }
}

async function savePrivateList() {
  const listName = listNameInput.value.trim();

  if (!listName) {
    alert("Please enter a list name.");
    return;
  }

  if (shoppingItems.length === 0) {
    alert("Please add at least one item.");
    return;
  }

  if (!currentListId) {
    const created = await createPrivateList();
    if (!created) return;
  }

  window.location.href = `privatelist.html?id=${encodeURIComponent(currentListId)}`;
}

function loadListFromURL() {
  const params = new URLSearchParams(window.location.search);
  const listId = Number(params.get("id"));

  if (listId) {
    currentListId = listId;
    loadListById(listId).then(loadItems);
  } else {
    renderList();
  }
}

addItemBtn?.addEventListener("click", addItem);

itemNameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addItem();
});

quantityInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") addItem();
});

saveListBtn?.addEventListener("click", savePrivateList);

visualItemList?.addEventListener("click", (event) => {
  const checkBtn = event.target.closest("[data-item-id]");
  const editBtn = event.target.closest("[data-edit-item-id]");
  const deleteBtn = event.target.closest("[data-delete-item-id]");

  if (checkBtn) toggleComplete(Number(checkBtn.getAttribute("data-item-id")));
  if (editBtn) editItem(Number(editBtn.getAttribute("data-edit-item-id")));
  if (deleteBtn) removeItem(Number(deleteBtn.getAttribute("data-delete-item-id")));
});

loadListFromURL();