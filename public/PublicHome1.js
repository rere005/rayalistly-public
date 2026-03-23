const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => root.querySelectorAll(selector);

function hide(el) {
  if (el) {
    el.classList.add("hidden-modal");
  }
}

function show(el) {
  if (el) {
    el.classList.remove("hidden-modal");
  }
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  return { res, data };
}

function showLogin() {
  hide($("#signup-box"));
  show($("#login-box"));
}

function showSignup() {
  hide($("#login-box"));
  show($("#signup-box"));
}

function closeAuth() {
  hide($("#login-box"));
  hide($("#signup-box"));
}

function setLoggedIn(flag) {
  if (flag) {
    localStorage.setItem("isLoggedIn", "true");
  } else {
    localStorage.removeItem("isLoggedIn");
  }
}

function setUserId(id) {
  if (id) {
    localStorage.setItem("userId", String(id));
  }
}

async function handleLogin() {
  const username = $("#login-username")?.value.trim();
  const password = $("#login-password")?.value;

  if (!username || !password) {
    alert("Please enter username and password.");
    return;
  }

  try {
    const { res, data } = await postJSON("/login", { username, password });

    if (!res.ok) {
      alert(data.message || "Login failed.");
      return;
    }

    setLoggedIn(true);
    setUserId(data.userId);
    window.location.href = "PrivateHome2.html";
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

async function handleSignup() {
  const email = $("#signup-email")?.value.trim() || "";
  const fullName = $("#signup-fullname")?.value.trim() || "";
  const username = $("#signup-username")?.value.trim() || "";
  const password = $("#signup-password")?.value || "";
  const termsOk = $("#terms-checkbox")?.checked ?? false;

  if (!email || !fullName || !username || !password) {
    alert("Fill all fields");
    return;
  }

  if (!termsOk) {
    alert("You must agree to the terms.");
    return;
  }

  try {
    const { res, data } = await postJSON("/register", {
      username,
      email,
      password,
      fullName,
    });

    if (!res.ok) {
      alert(data.message || "Registration failed.");
      return;
    }

    alert("Account created! Now log in.");
    showLogin();
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

window.addEventListener("load", () => {
  $("#open-login")?.addEventListener("click", showLogin);
  $("#open-signup")?.addEventListener("click", showSignup);
  $("#cta-get-started")?.addEventListener("click", showSignup);
  $("#go-signup")?.addEventListener("click", showSignup);
  $("#go-login")?.addEventListener("click", showLogin);

  $("#loginSubmitBtn")?.addEventListener("click", handleLogin);
  $("#signupSubmitBtn")?.addEventListener("click", handleSignup);

  const terms = $("#terms-checkbox");
  const signupBtn = $("#signupSubmitBtn");

  if (terms && signupBtn) {
    const syncSignupButton = () => {
      signupBtn.disabled = !terms.checked;
    };

    syncSignupButton();
    terms.addEventListener("change", syncSignupButton);
  }

  $$(".auth-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeAuth();
      }
    });
  });

  const logoLink = document.getElementById("logo-link");

  if (logoLink) {
    logoLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "PublicHome1.html";
    });
  }
});