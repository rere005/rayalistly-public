const itemNameInput = document.getElementById("itemNameInput");
const quantityInput = document.getElementById("quantityInput");
const unitSelect = document.getElementById("unitSelect");
const addItemBtn = document.getElementById("addItemBtn");
const visualItemList = document.getElementById("visualItemList");
const listNameInput = document.getElementById("listNameInput");
const createListBtn = document.getElementById("createListBtn");
const saveListBtn = document.getElementById("saveListBtn");
const currentListNameEls = document.querySelectorAll(".current-list-name");

const toggleMemberPickerBtn = document.getElementById("toggleMemberPickerBtn");
const memberPickerBox = document.getElementById("memberPickerBox");
const memberSelect = document.getElementById("memberSelect");
const addMemberBtn = document.getElementById("addMemberBtn");
const memberList = document.getElementById("memberList");
const ownerText = document.getElementById("ownerText");
const memberActionInfo = document.getElementById("memberActionInfo");

const pendingRequestsSection = document.getElementById("pendingRequestsSection");
const pendingRequestsList = document.getElementById("pendingRequestsList");

let currentListId = null;
let shoppingItems = [];
let contactsCache = [];
let sharedMembers = [];
let currentUserRole = null;
let pendingShareRequests = [];

function getUserId() {
  const id = localStorage.getItem("userId");
  return id ? Number(id) : 0;
}

function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

function updateListNameDisplays(text) {
  currentListNameEls.forEach((el) => {
    el.textContent = text;
  });
}

function setControlsDisabled(disabled) {
  if (itemNameInput) itemNameInput.disabled = disabled;
  if (quantityInput) quantityInput.disabled = disabled;
  if (unitSelect) unitSelect.disabled = disabled;
  if (addItemBtn) addItemBtn.disabled = disabled;
  if (toggleMemberPickerBtn) toggleMemberPickerBtn.disabled = disabled;
  if (memberSelect) memberSelect.disabled = disabled;
  if (addMemberBtn) addMemberBtn.disabled = disabled;
  if (saveListBtn) saveListBtn.disabled = disabled;
}

function createEmptyState(text) {
  const li = document.createElement("li");
  li.className = "empty-state";
  li.textContent = text;
  return li;
}

async function loadContactsFromDB() {
  const userId = getUserId();

  if (!userId) {
    contactsCache = [];
    renderMemberOptions();
    return;
  }

  try {
    const res = await fetch(`/contacts?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      contactsCache = [];
      renderMemberOptions();
      return;
    }

    contactsCache = data.contacts || [];
    renderMemberOptions();
  } catch (error) {
    contactsCache = [];
    renderMemberOptions();
  }
}

function renderMemberOptions() {
  if (!memberSelect) return;

  memberSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a contact";
  memberSelect.appendChild(defaultOption);

  contactsCache.forEach((contact) => {
    const option = document.createElement("option");
    option.value = contact.username;
    option.textContent = contact.username;
    memberSelect.appendChild(option);
  });
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
  if (!visualItemList) return;

  visualItemList.innerHTML = "";

  if (!currentListId) {
    visualItemList.appendChild(createEmptyState("Create the list first."));
    return;
  }

  if (shoppingItems.length === 0) {
    visualItemList.appendChild(createEmptyState("No items added yet."));
    return;
  }

  shoppingItems.forEach((item) => {
    visualItemList.appendChild(createItemRow(item));
  });
}

function createMemberChip(member, index) {
  const li = document.createElement("li");
  li.className = "member-chip";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-user";

  const text = document.createElement("span");
  text.textContent = member.username;

  li.appendChild(icon);
  li.appendChild(text);

  if (currentUserRole === "owner") {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "member-remove-btn";
    removeBtn.setAttribute("data-member-remove-index", index);

    const removeIcon = document.createElement("i");
    removeIcon.className = "fa-solid fa-xmark";
    removeBtn.appendChild(removeIcon);

    li.appendChild(removeBtn);
  }

  return li;
}

function renderMembers() {
  if (!memberList) return;

  memberList.innerHTML = "";

  if (!currentListId) {
    memberList.appendChild(createEmptyState("Create the list first."));
    return;
  }

  if (sharedMembers.length === 0) {
    memberList.appendChild(createEmptyState("No members added yet."));
    return;
  }

  sharedMembers.forEach((member, index) => {
    memberList.appendChild(createMemberChip(member, index));
  });
}

function createPendingRequestRow(request) {
  const li = document.createElement("li");
  li.className = "member-chip";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-user-clock";

  const text = document.createElement("span");
  text.textContent = `${request.requester_username} wants to add ${request.target_username}`;

  const actions = document.createElement("div");
  actions.style.display = "inline-flex";
  actions.style.alignItems = "center";
  actions.style.gap = "8px";

  const acceptBtn = document.createElement("button");
  acceptBtn.type = "button";
  acceptBtn.className = "member-add-btn";
  acceptBtn.setAttribute("data-accept-request-id", request.id);
  acceptBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Accept</span>`;

  const declineBtn = document.createElement("button");
  declineBtn.type = "button";
  declineBtn.className = "member-remove-btn";
  declineBtn.setAttribute("data-decline-request-id", request.id);
  declineBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;

  actions.appendChild(acceptBtn);
  actions.appendChild(declineBtn);

  li.appendChild(icon);
  li.appendChild(text);
  li.appendChild(actions);

  return li;
}

function renderPendingRequests() {
  if (!pendingRequestsSection || !pendingRequestsList) return;

  if (currentUserRole !== "owner") {
    pendingRequestsSection.classList.add("hidden-box");
    pendingRequestsList.innerHTML = "";
    return;
  }

  pendingRequestsSection.classList.remove("hidden-box");
  pendingRequestsList.innerHTML = "";

  if (!currentListId) {
    pendingRequestsList.appendChild(createEmptyState("Create the list first."));
    return;
  }

  if (pendingShareRequests.length === 0) {
    pendingRequestsList.appendChild(createEmptyState("No pending requests."));
    return;
  }

  pendingShareRequests.forEach((request) => {
    pendingRequestsList.appendChild(createPendingRequestRow(request));
  });
}

async function loadOwnerName(ownerId) {
  if (!ownerText) return;

  if (!ownerId) {
    ownerText.textContent = "";
    return;
  }

  const currentUserId = getUserId();

  if (Number(ownerId) === Number(currentUserId)) {
    ownerText.innerHTML = `Owned by <strong>you</strong>`;
    return;
  }

  try {
    const res = await fetch(`/user/${ownerId}`);
    const data = await res.json();

    if (!res.ok) {
      ownerText.textContent = "";
      return;
    }

    ownerText.innerHTML = `Owned by <strong>${data.username}</strong>`;
  } catch (error) {
    ownerText.textContent = "";
  }
}

async function loadUserRole() {
  const userId = getUserId();

  if (!userId || !currentListId) {
    currentUserRole = null;
    return;
  }

  try {
    const res = await fetch(`/lists/${currentListId}/role?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      currentUserRole = null;
      return;
    }

    currentUserRole = data.role;

    if (currentUserRole === "owner") {
      toggleMemberPickerBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i><span>Add member</span>`;
      memberActionInfo.textContent = "You can add members directly to this list.";
    } else {
      toggleMemberPickerBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i><span>Request member</span>`;
      memberActionInfo.textContent = "You can request new members from the owner.";
    }
  } catch (error) {
    currentUserRole = null;
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
    alert("Server error while loading items.");
  }
}

async function loadMembers() {
  const userId = getUserId();

  if (!userId || !currentListId) {
    sharedMembers = [];
    renderMembers();
    return;
  }

  try {
    const res = await fetch(`/lists/${currentListId}/members?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      sharedMembers = [];
      renderMembers();
      return;
    }

    sharedMembers = data.members || [];
    renderMembers();
  } catch (error) {
    sharedMembers = [];
    renderMembers();
  }
}

async function loadPendingShareRequests() {
  const userId = getUserId();

  if (!userId || !currentListId || currentUserRole !== "owner") {
    pendingShareRequests = [];
    renderPendingRequests();
    return;
  }

  try {
    const res = await fetch(`/list-share-requests?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      pendingShareRequests = [];
      renderPendingRequests();
      return;
    }

    pendingShareRequests = (data.requests || []).filter(
      (request) => Number(request.list_id) === Number(currentListId)
    );

    renderPendingRequests();
  } catch (error) {
    pendingShareRequests = [];
    renderPendingRequests();
  }
}

async function createFamilyList() {
  const userId = getUserId();
  const listName = listNameInput.value.trim();

  if (!userId) {
    alert("You must be logged in.");
    return;
  }

  if (!listName) {
    alert("Please enter a list name.");
    return;
  }

  try {
    const res = await fetch("/lists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        title: listName,
        listType: "family"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not create family list.");
      return;
    }

    window.location.href = `familylist.html?id=${encodeURIComponent(data.listId)}`;
  } catch (error) {
    alert("Server error while creating the family list.");
  }
}

async function loadListById(listId) {
  const userId = getUserId();

  if (!userId || !listId) return;

  try {
    const res = await fetch(`/lists/${listId}?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not load the family list.");
      return;
    }

    currentListId = data.list.id;

    updateListNameDisplays(data.list.title);
    listNameInput.value = data.list.title;
    listNameInput.disabled = true;
    createListBtn.disabled = true;
    createListBtn.textContent = "Created";

    setControlsDisabled(false);

    await loadUserRole();
    await loadOwnerName(data.list.owner_id);
    await loadItems();
    await loadMembers();
    await loadPendingShareRequests();
  } catch (error) {
    alert("Server error while loading the family list.");
  }
}

async function addItem() {
  const userId = getUserId();

  if (!currentListId) {
    alert("Create the list first.");
    return;
  }

  const itemName = itemNameInput.value.trim();
  const quantity = quantityInput.value.trim() || "1";
  const unit = unitSelect.value || "pcs";

  if (!itemName) {
    alert("Please write an item first.");
    return;
  }

  try {
    const res = await fetch(`/lists/${currentListId}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        text: itemName,
        quantity,
        unit
      })
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
    alert("Server error while adding item.");
  }
}

async function toggleComplete(itemId) {
  const userId = getUserId();
  const item = shoppingItems.find((x) => x.id === itemId);

  if (!item) return;

  try {
    const res = await fetch(`/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        is_completed: !item.is_completed
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not update item.");
      return;
    }

    await loadItems();
  } catch (error) {
    alert("Server error while updating item.");
  }
}

async function removeItem(itemId) {
  const userId = getUserId();

  try {
    const res = await fetch(`/items/${itemId}?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not delete item.");
      return;
    }

    await loadItems();
  } catch (error) {
    alert("Server error while deleting item.");
  }
}

async function editItem(itemId) {
  const userId = getUserId();
  const item = shoppingItems.find((x) => x.id === itemId);

  if (!item) return;

  const newName = prompt("Edit item name:", item.text);

  if (!newName || !newName.trim()) return;

  try {
    const res = await fetch(`/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        text: newName.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not edit item.");
      return;
    }

    await loadItems();
  } catch (error) {
    alert("Server error while editing item.");
  }
}

async function addMemberToFamilyList() {
  const userId = getUserId();

  if (!currentListId) {
    alert("Create the list first.");
    return;
  }

  const selectedName = memberSelect.value.trim();

  if (!selectedName) {
    alert("Select a contact first.");
    return;
  }

  const endpoint = currentUserRole === "owner"
    ? `/lists/${currentListId}/share`
    : `/lists/${currentListId}/share-request`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        q: selectedName,
        permission: "edit"
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not process request.");
      return;
    }

    memberSelect.value = "";

    if (currentUserRole === "owner") {
      await loadMembers();
    } else {
      alert(data.message || "Request sent to owner.");
    }
  } catch (error) {
    alert("Server error.");
  }
}

async function removeMember(index) {
  const userId = getUserId();
  const member = sharedMembers[index];

  if (!member || !member.user_id || !currentListId) return;

  const confirmed = confirm(`Remove ${member.username} from this list?`);
  if (!confirmed) return;

  try {
    const res = await fetch(
      `/lists/${currentListId}/share/${member.user_id}?userId=${encodeURIComponent(userId)}`,
      {
        method: "DELETE"
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not remove member.");
      return;
    }

    await loadMembers();
  } catch (error) {
    alert("Server error while removing member.");
  }
}

async function acceptShareRequest(requestId) {
  const userId = getUserId();

  try {
    const res = await fetch(`/list-share-requests/${requestId}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not accept request.");
      return;
    }

    await loadPendingShareRequests();
  } catch (error) {
    alert("Server error while accepting request.");
  }
}

async function declineShareRequest(requestId) {
  const userId = getUserId();

  try {
    const res = await fetch(`/list-share-requests/${requestId}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not decline request.");
      return;
    }

    await loadPendingShareRequests();
  } catch (error) {
    alert("Server error while declining request.");
  }
}

function saveFamilyList() {
  if (!currentListId) {
    alert("Create the list first.");
    return;
  }

  window.location.href = `familylist.html?id=${encodeURIComponent(currentListId)}`;
}

function loadListFromURL() {
  const params = new URLSearchParams(window.location.search);
  const listId = Number(params.get("id"));

  if (listId) {
    loadListById(listId);
  } else {
    updateListNameDisplays("New Family List");
    if (ownerText) ownerText.innerHTML = `Owned by <strong>you</strong>`;
    if (memberActionInfo) memberActionInfo.textContent = "";
    setControlsDisabled(true);
    renderList();
    renderMembers();
    renderPendingRequests();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!isLoggedIn()) {
    window.location.href = "PublicHome1.html";
    return;
  }

  await loadContactsFromDB();
  loadListFromURL();

  createListBtn?.addEventListener("click", createFamilyList);

  listNameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      createFamilyList();
    }
  });

  addItemBtn?.addEventListener("click", addItem);

  itemNameInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addItem();
    }
  });

  quantityInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addItem();
    }
  });

  saveListBtn?.addEventListener("click", saveFamilyList);

  toggleMemberPickerBtn?.addEventListener("click", () => {
    if (!currentListId) {
      alert("Create the list first.");
      return;
    }

    memberPickerBox?.classList.toggle("hidden-box");
  });

  addMemberBtn?.addEventListener("click", addMemberToFamilyList);

  memberList?.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-member-remove-index]");
    if (!removeBtn) return;

    removeMember(Number(removeBtn.getAttribute("data-member-remove-index")));
  });

  pendingRequestsList?.addEventListener("click", (event) => {
    const acceptBtn = event.target.closest("[data-accept-request-id]");
    const declineBtn = event.target.closest("[data-decline-request-id]");

    if (acceptBtn) {
      acceptShareRequest(Number(acceptBtn.getAttribute("data-accept-request-id")));
    }

    if (declineBtn) {
      declineShareRequest(Number(declineBtn.getAttribute("data-decline-request-id")));
    }
  });

  visualItemList?.addEventListener("click", (event) => {
    const checkBtn = event.target.closest("[data-item-id]");
    const editBtn = event.target.closest("[data-edit-item-id]");
    const deleteBtn = event.target.closest("[data-delete-item-id]");

    if (checkBtn) {
      toggleComplete(Number(checkBtn.getAttribute("data-item-id")));
    }

    if (editBtn) {
      editItem(Number(editBtn.getAttribute("data-edit-item-id")));
    }

    if (deleteBtn) {
      removeItem(Number(deleteBtn.getAttribute("data-delete-item-id")));
    }
  });
});