import { registerUser, loginUser, setCurrentUser } from "../../shared/js/data/usersData.js";

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

// ===== Обробка сабміту форми реєстрації =====
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.querySelector("#registerForm input[type='text']").value;
    const email = document.querySelector("#registerForm input[type='email']").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const birthDate = document.querySelector("#registerForm input[type='date']").value;

    if (password !== passwordConfirm) {
      alert("Паролі не співпадають");
      return;
    }

    setSubmitting(registerForm, true);
    const result = await registerUser({ name, email, password, birthDate });
    setSubmitting(registerForm, false);

    if (!result.success) {
      alert(result.error);
      return;
    }

    setCurrentUser(result.user);
    window.location.href = "../user/home.html";
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
    window.location.href = "../user/home.html";
  });
}
