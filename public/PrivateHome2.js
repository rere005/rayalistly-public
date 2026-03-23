const $ = (selector, root = document) => root.querySelector(selector);

function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true";
}

function clearAuth() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userId");
}

function protectPrivatePage() {
  if (!isLoggedIn()) {
    window.location.href = "PublicHome1.html";
  }
}

function handleLogout() {
  clearAuth();
  window.location.href = "PublicHome1.html";
}

async function fetchUserProfile() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const res = await fetch(`/user/${userId}`);
    if (!res.ok) return;

    const userData = await res.json();

    const nameInput = document.getElementById("acc-name");
    const usernameInput = document.getElementById("acc-username");
    const emailInput = document.getElementById("acc-email");

    if (nameInput) nameInput.value = userData.full_name || "";
    if (usernameInput) usernameInput.value = userData.username || "";
    if (emailInput) emailInput.value = userData.email || "";
  } catch (err) {
    console.error("Could not load user profile:", err);
  }
}

async function handleChangePassword() {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    alert("Du måste vara inloggad.");
    return;
  }

  const currentPassword = prompt("Skriv ditt nuvarande lösenord:");
  if (!currentPassword) return;

  const newPassword = prompt("Skriv ditt nya lösenord:");
  if (!newPassword) return;

  const confirmPassword = prompt("Bekräfta ditt nya lösenord:");
  if (!confirmPassword) return;

  if (newPassword !== confirmPassword) {
    alert("Det nya lösenordet matchar inte.");
    return;
  }

  if (newPassword.length < 6) {
    alert("Nya lösenordet måste vara minst 6 tecken.");
    return;
  }

  try {
    const res = await fetch("/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        currentPassword,
        newPassword
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Kunde inte ändra lösenord.");
      return;
    }

    alert(data.message || "Lösenordet har ändrats.");
  } catch (err) {
    alert("Serverfel vid lösenordsbyte.");
  }
}

async function loadTargetInvitations() {
  const userId = localStorage.getItem("userId");
  const listEl = document.getElementById("targetInvitationsList");

  if (!userId || !listEl) return;

  try {
    const res = await fetch(`/target-list-invitations?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      listEl.innerHTML = `<li class="request-empty">Could not load invitations.</li>`;
      return;
    }

    const invitations = data.invitations || [];

    if (invitations.length === 0) {
      listEl.innerHTML = `<li class="request-empty">📨 No invitations.</li>`;
      return;
    }

    listEl.innerHTML = "";

    invitations.forEach((invitation) => {
      const li = document.createElement("li");
      li.className = "request-item";

      li.innerHTML = `
        <div class="request-text">
          <strong>${invitation.owner_username}</strong> invited you to join
          <strong>${invitation.list_title}</strong>
        </div>
        <div class="request-actions">
          <button class="accept-invitation-btn" data-invitation-id="${invitation.id}" type="button">
            Join
          </button>
          <button class="decline-invitation-btn" data-invitation-id="${invitation.id}" type="button">
            Decline
          </button>
        </div>
      `;

      listEl.appendChild(li);
    });
  } catch (error) {
    listEl.innerHTML = `<li class="request-empty">Server error while loading invitations.</li>`;
  }
}

async function acceptTargetInvitation(invitationId) {
  const userId = localStorage.getItem("userId");
  if (!userId || !invitationId) return;

  try {
    const res = await fetch(`/target-list-invitations/${invitationId}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not accept invitation.");
      return;
    }

    alert(data.message || "Invitation accepted.");
    await loadTargetInvitations();
  } catch (error) {
    alert("Server error while accepting invitation.");
  }
}

async function declineTargetInvitation(invitationId) {
  const userId = localStorage.getItem("userId");
  if (!userId || !invitationId) return;

  try {
    const res = await fetch(`/target-list-invitations/${invitationId}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ userId })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Could not decline invitation.");
      return;
    }

    alert(data.message || "Invitation declined.");
    await loadTargetInvitations();
  } catch (error) {
    alert("Server error while declining invitation.");
  }
}

async function loadListShareRequests() {
  const userId = localStorage.getItem("userId");
  const listEl = document.getElementById("listShareRequestsList");

  if (!userId || !listEl) return;

  try {
    const res = await fetch(`/list-share-requests?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if (!res.ok) {
      listEl.innerHTML = `<li class="request-empty">Could not load requests.</li>`;
      return;
    }

    const requests = data.requests || [];

    if (requests.length === 0) {
      listEl.innerHTML = `<li class="request-empty"> 📭 No requests.</li>`;
      return;
    }

    listEl.innerHTML = "";

    requests.forEach((request) => {
      const li = document.createElement("li");
      li.className = "request-item";

      li.innerHTML = `
        <div class="request-text">
          <strong>${request.requester_username}</strong> wants to add
          <strong>${request.target_username}</strong> to
          <strong>${request.list_title}</strong>
        </div>
        <div class="request-actions">
          <button class="accept-request-btn" data-request-id="${request.id}" type="button">
            Accept
          </button>
          <button class="decline-request-btn" data-request-id="${request.id}" type="button">
            Decline
          </button>
        </div>
      `;

      listEl.appendChild(li);
    });
  } catch (error) {
    listEl.innerHTML = `<li class="request-empty">Server error while loading requests.</li>`;
  }
}

async function acceptListShareRequest(requestId) {
  const userId = localStorage.getItem("userId");

  if (!userId || !requestId) return;

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

    alert(data.message || "Request accepted.");
    await loadListShareRequests();
    await loadTargetInvitations();
  } catch (error) {
    alert("Server error while accepting request.");
  }
}

async function declineListShareRequest(requestId) {
  const userId = localStorage.getItem("userId");

  if (!userId || !requestId) return;

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

    alert(data.message || "Request declined.");
    await loadListShareRequests();
  } catch (error) {
    alert("Server error while declining request.");
  }
}

window.addEventListener("load", () => {
  protectPrivatePage();

  $("#logout-btn")?.addEventListener("click", handleLogout);

  const changePasswordBtn = document.getElementById("change-password-btn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", handleChangePassword);
  }

  const accountBtn = document.getElementById("account-link");
  const accountSection = document.getElementById("account-section");

  if (accountBtn && accountSection) {
    accountBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      accountSection.classList.toggle("hidden");

      if (!accountSection.classList.contains("hidden")) {
        await fetchUserProfile();
      }
    });

    accountSection.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", (event) => {
      const clickedButton = event.target.closest("#account-link");

      if (!clickedButton && !accountSection.contains(event.target)) {
        accountSection.classList.add("hidden");
      }
    });
  }

  const logoLink = document.getElementById("logo-link");

  if (logoLink) {
    logoLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "PrivateHome2.html";
    });
  }

  loadTargetInvitations();
  loadListShareRequests();

  const invitationsList = document.getElementById("targetInvitationsList");
  if (invitationsList) {
    invitationsList.addEventListener("click", (event) => {
      const acceptBtn = event.target.closest(".accept-invitation-btn");
      const declineBtn = event.target.closest(".decline-invitation-btn");

      if (acceptBtn) {
        const invitationId = Number(acceptBtn.getAttribute("data-invitation-id"));
        acceptTargetInvitation(invitationId);
      }

      if (declineBtn) {
        const invitationId = Number(declineBtn.getAttribute("data-invitation-id"));
        declineTargetInvitation(invitationId);
      }
    });
  }

  const requestsList = document.getElementById("listShareRequestsList");
  if (requestsList) {
    requestsList.addEventListener("click", (event) => {
      const acceptBtn = event.target.closest(".accept-request-btn");
      const declineBtn = event.target.closest(".decline-request-btn");

      if (acceptBtn) {
        const requestId = Number(acceptBtn.getAttribute("data-request-id"));
        acceptListShareRequest(requestId);
      }

      if (declineBtn) {
        const requestId = Number(declineBtn.getAttribute("data-request-id"));
        declineListShareRequest(requestId);
      }
    });
  }
});