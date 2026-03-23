const saveBtn = document.getElementById("saveBtn");
const passwordInput = document.getElementById("new-password");
const messageBox = document.getElementById("messageBox");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.classList.remove("hidden-message","message-success","message-error");

  if (type === "success") {
    messageBox.classList.add("message-success");
  } else {
    messageBox.classList.add("message-error");
  }
}

saveBtn.onclick = async function () {

  const password = passwordInput.value.trim();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    showMessage("Invalid reset link.", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.", "error");
    return;
  }

  try {

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const res = await fetch("/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Something went wrong.", "error");
      return;
    }

    showMessage("Password updated successfully!", "success");

    setTimeout(()=>{
      window.location.href="PublicHome1.html";
    },2000);

  } catch (err) {
    showMessage("Server error.", "error");
  }

  finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save new password";
  }

};