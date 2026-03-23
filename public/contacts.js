const $ = (selector, root = document) => root.querySelector(selector);

function getUserId() {
  const id = localStorage.getItem("userId");
  return id ? Number(id) : 0;
}

function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

function clearAuthAndGoHome() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userId");
  window.location.href = "PublicHome1.html";
}

function toast(message, type = "info") {
  const el = $("#toast");

  if (!el) {
    alert(message);
    return;
  }

  el.textContent = message;
  el.className = `toast toast--show toast--${type}`;

  setTimeout(() => {
    el.classList.remove("toast--show");
  }, 2200);
}

let lastFoundUser = null;

async function searchUserInDB(query) {
  const res = await fetch(`/users/search?q=${encodeURIComponent(query)}`);

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  return { res, data };
}

async function loadContactsFromDB() {
  const userId = getUserId();
  if (!userId) return;

  const res = await fetch(`/contacts?userId=${encodeURIComponent(userId)}`);

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    toast(data.message || "Could not load contacts.", "danger");
    return;
  }

  renderContactsList(data.contacts || []);
}

function renderContactsList(contacts) {
  const list = $("#my-contacts-list");
  const empty = $("#contacts-empty");

  if (!list) return;

  list.innerHTML = "";

  if (contacts.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  contacts.forEach((contact) => {
    const li = document.createElement("li");
    li.className = "contact-item";

    li.innerHTML = `
      <div class="contact-left">
        <div class="contact-avatar">
          <i class="fa-solid fa-user"></i>
        </div>
        <span class="contact-name">${contact.username}</span>
      </div>

      <div class="contact-actions">
        <button class="remove-btn" data-contact-id="${contact.contactId}" type="button">
          Remove
        </button>
      </div>
    `;

    list.appendChild(li);
  });
}

async function removeContactFromDB(contactId) {
  const userId = getUserId();
  if (!userId) return false;

  const res = await fetch(
    `/contacts/${encodeURIComponent(contactId)}?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    toast(data.message || "Could not remove the contact.", "danger");
    return false;
  }

  return true;
}

async function onContactsListClick(event) {
  const btn = event.target.closest("button[data-contact-id]");
  if (!btn) return;

  const contactId = btn.getAttribute("data-contact-id");
  if (!contactId) return;

  const ok = await removeContactFromDB(contactId);
  if (!ok) return;

  toast("Contact removed.", "info");
  await loadContactsFromDB();
}

async function performSearch() {
  const input = $("#search-input");
  const resultBox = $("#result-box");
  const usernameDisplay = $("#username-display");

  if (!input || !resultBox || !usernameDisplay) return;

  const query = input.value.trim();

  if (!query) {
    toast("Enter a username or email first.", "warning");
    return;
  }

  try {
    const { res, data } = await searchUserInDB(query);

    if (!res.ok) {
      lastFoundUser = null;
      resultBox.classList.add("hidden-result");
      toast(data.message || "No user found.", "warning");
      return;
    }

    lastFoundUser = data.user;
    usernameDisplay.textContent = lastFoundUser.username;
    resultBox.classList.remove("hidden-result");
  } catch (err) {
    console.error(err);
    toast("Server error while searching.", "danger");
  }
}

async function sendFriendRequest() {
  const userId = getUserId();
  const input = $("#search-input");
  const resultBox = $("#result-box");

  if (!userId) {
    toast("You are not logged in.", "danger");
    return;
  }

  if (!lastFoundUser) {
    toast("Search first and make sure the user exists.", "warning");
    return;
  }

  try {
    const res = await fetch("/friend-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromUserId: userId,
        q: lastFoundUser.username,
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (!res.ok) {
      toast(data.message || "Could not send request.", "danger");
      return;
    }

    toast("Friend request sent!", "success");

    if (resultBox) resultBox.classList.add("hidden-result");
    if (input) input.value = "";

    lastFoundUser = null;
  } catch (err) {
    console.error(err);
    toast("Server error while sending request.", "danger");
  }
}

async function loadFriendRequests() {
  const userId = getUserId();
  if (!userId) return;

  const res = await fetch(`/friend-requests?userId=${encodeURIComponent(userId)}`);

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok) {
    console.log(data.message || "Could not load friend requests.");
    return;
  }

  renderFriendRequests(data.requests || []);
}

function renderFriendRequests(requests) {
  const box = $("#requests-list");
  if (!box) return;

  box.innerHTML = "";

  if (requests.length === 0) {
    box.innerHTML = `<div class="empty-text">No friend requests right now.</div>`;
    return;
  }

  requests.forEach((request) => {
    const card = document.createElement("div");
    card.className = "mini-card";
    card.dataset.requestId = request.id;

    card.innerHTML = `
      <span class="user-name">${request.username}</span>
      <div class="card-btns">
        <button class="accept-btn" type="button" data-action="accept">Accept</button>
        <button class="decline-btn" type="button" data-action="decline">Decline</button>
      </div>
    `;

    box.appendChild(card);
  });
}

async function onRequestsClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;

  const card = btn.closest(".mini-card");
  if (!card) return;

  const action = btn.dataset.action;
  const requestId = card.dataset.requestId;
  const userId = getUserId();

  if (!requestId || !userId) return;

  if (action === "accept") {
    const res = await fetch(`/friend-requests/${encodeURIComponent(requestId)}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (!res.ok) {
      toast(data.message || "Could not accept request.", "danger");
      return;
    }

    toast("Accepted and added to contacts.", "success");
    await loadContactsFromDB();
    await loadFriendRequests();
    return;
  }

  if (action === "decline") {
    const res = await fetch(`/friend-requests/${encodeURIComponent(requestId)}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }

    if (!res.ok) {
      toast(data.message || "Could not decline request.", "danger");
      return;
    }

    toast("Request declined.", "info");
    await loadFriendRequests();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!isLoggedIn()) {
    window.location.href = "PublicHome1.html";
    return;
  }

  $("#logout-btn")?.addEventListener("click", clearAuthAndGoHome);
  $("#search-btn")?.addEventListener("click", performSearch);

  $("#search-input")?.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      performSearch();
    }
  });

  $("#send-request-btn")?.addEventListener("click", sendFriendRequest);
  $("#my-contacts-list")?.addEventListener("click", onContactsListClick);
  $("#requests-list")?.addEventListener("click", onRequestsClick);

  const logoLink = document.getElementById("logo-link");
  if (logoLink) {
    logoLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "PrivateHome2.html";
    });
  }
  await loadContactsFromDB();
  await loadFriendRequests();
});