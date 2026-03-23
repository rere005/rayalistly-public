const resetButton = document.getElementById("resetBtn");
const usernameInput = document.getElementById("reset-username");
const emailInput = document.getElementById("reset-email");
const messageBox = document.getElementById("messageBox");

function showMessage(text, type) {
  if (!messageBox) return;

  messageBox.textContent = text;
  messageBox.classList.remove("hidden-message", "message-success", "message-error");

  if (type === "success") {
    messageBox.classList.add("message-success");
  } else {
    messageBox.classList.add("message-error");
  }
}

async function handleResetPassword() {
  const username = usernameInput?.value.trim();
  const email = emailInput?.value.trim();

  if (!username || !email) {
    showMessage("Enter your username and email first.", "error");
    return;
  }

  try {
    resetButton.disabled = true;
    resetButton.textContent = "Sending...";

    const res = await fetch("/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, email })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Something went wrong.", "error");
      return;
    }

    showMessage(data.message || "Check your email.", "success");
  } catch (err) {
    showMessage("Server error.", "error");
  } finally {
    resetButton.disabled = false;
    resetButton.textContent = "Send reset link";
  }
}

resetButton?.addEventListener("click", handleResetPassword);

usernameInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleResetPassword();
  }
});

emailInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleResetPassword();
  }
});