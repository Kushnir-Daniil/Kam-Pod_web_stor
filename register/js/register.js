import { registerUser, loginUser, setCurrentUser } from "../../user/js/data/usersData.js";

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

    const name = document.querySelector("#registerForm input[type='text']").value;
    const email = document.querySelector("#registerForm input[type='email']").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const birthDate = document.querySelector("#registerForm input[type='date']").value;

    if (password !== passwordConfirm) {
      alert("Паролі не співпадають");
      return;
    }

    const result = registerUser({ name, email, password, birthDate });

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
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.querySelector("#loginForm input[type='email']").value;
    const password = document.getElementById("loginPassword").value;

    const result = loginUser(email, password);

    if (!result.success) {
      alert(result.error);
      return;
    }

    setCurrentUser(result.user);
    window.location.href = "../user/home.html";
  });
}