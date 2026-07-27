import {
  registerUser,
  loginUser,
  setCurrentUser,
  ROLES,
} from "../../shared/js/data/usersData.js";

// ===== Показати/приховати пароль =====
function setupPasswordToggle(toggleBtnId, inputId) {
  const toggleBtn = document.getElementById(toggleBtnId);
  const input = document.getElementById(inputId);

  if (!toggleBtn || !input) return;

  toggleBtn.addEventListener("click", () => {
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    toggleBtn.style.opacity = isPassword ? "0.5" : "1";
  });
}

setupPasswordToggle("togglePassword", "password");
setupPasswordToggle("togglePasswordConfirm", "passwordConfirm");
setupPasswordToggle("toggleLoginPassword", "loginPassword");

function setSubmitting(form, isSubmitting) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isSubmitting;
  button.dataset.originalText ??= button.textContent;
  button.textContent = isSubmitting ? "Зачекайте…" : button.dataset.originalText;
}

function redirectAfterAuth(user) {
  if (user.role === ROLES.ADMIN) {
    window.location.href = "../admin/dashboard.html";
    return;
  }
  if (user.role === ROLES.KAZKAR) {
    window.location.href = "../admin/quests.html";
    return;
  }
  window.location.href = "../user/home.html";
}

// ===== Перемикач «Гравець / Казкар» =====
const inviteCodeGroup = document.getElementById("inviteCodeGroup");
const inviteCodeInput = document.getElementById("inviteCode");
const accountTypeInputs = document.querySelectorAll('input[name="accountType"]');

function syncInviteCodeVisibility() {
  if (!inviteCodeGroup || !inviteCodeInput) return;
  const selected = document.querySelector('input[name="accountType"]:checked');
  const isKazkar = selected?.value === ROLES.KAZKAR;
  inviteCodeGroup.hidden = !isKazkar;
  inviteCodeInput.required = isKazkar;
  if (!isKazkar) inviteCodeInput.value = "";
}

accountTypeInputs.forEach((input) => {
  input.addEventListener("change", syncInviteCodeVisibility);
});
syncInviteCodeVisibility();

// ===== Обробка сабміту форми реєстрації =====
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.querySelector("#registerForm input[type='email']").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const birthDate = document.querySelector("#registerForm input[type='date']").value;
    const accountType =
      document.querySelector('input[name="accountType"]:checked')?.value || ROLES.USER;
    const inviteCode = inviteCodeInput?.value || "";

    if (password !== passwordConfirm) {
      alert("Паролі не співпадають");
      return;
    }

    if (accountType === ROLES.KAZKAR && !inviteCode.trim()) {
      alert("Для ролі казкаря потрібен код запрошення");
      return;
    }

    setSubmitting(registerForm, true);
    const result = await registerUser({
      name,
      email,
      password,
      birthDate,
      accountType,
      inviteCode,
    });
    setSubmitting(registerForm, false);

    if (!result.success) {
      alert(result.error);
      return;
    }

    setCurrentUser(result.user);
    redirectAfterAuth(result.user);
  });
}

// ===== Обробка сабміту форми логіну =====
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#loginForm input[type='email']").value;
    const password = document.getElementById("loginPassword").value;

    setSubmitting(loginForm, true);
    const result = await loginUser(email, password);
    setSubmitting(loginForm, false);

    if (!result.success) {
      alert(result.error);
      return;
    }

    setCurrentUser(result.user);
    redirectAfterAuth(result.user);
  });
}
