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

// ===== Обробка сабміту форми реєстрації =====
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;

    if (password !== passwordConfirm) {
      alert("Паролі не співпадають");
      return;
    }

    // TODO: тут пізніше буде fetch на бекенд для реєстрації
    console.log("Форма валідна, готова до відправки на бекенд");
  });
}

// ===== Обробка сабміту форми логіну (якщо на цій же сторінці) =====
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    // TODO: fetch на бекенд для логіну
    console.log("Форма логіну валідна, готова до відправки на бекенд");
  });
}