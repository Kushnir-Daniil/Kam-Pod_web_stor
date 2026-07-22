const ADMIN_EMAILS = [
  "kn1b24.kushnir@kpnu.edu.ua",
];

// ===== Отримати всіх користувачів =====
function getUsers() {
  const stored = localStorage.getItem("users");
  return stored ? JSON.parse(stored) : [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// ===== Реєстрація нового користувача =====
export function registerUser({ name, email, password, birthDate }) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some(u => u.email === normalizedEmail)) {
    return { success: false, error: "Користувач з таким email вже існує" };
  }

  const newUser = {
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    name,
    email: normalizedEmail,
    password, // тимчасово у відкритому вигляді, поки нема реального бекенду з хешуванням
    birthDate,
    isAdmin: ADMIN_EMAILS.includes(normalizedEmail),
    coins: 0,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, user: newUser };
}

// ===== Логін (перевірка email + пароль) =====
export function loginUser(email, password) {
  const users = getUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const user = users.find(u => u.email === normalizedEmail && u.password === password);

  if (!user) {
    return { success: false, error: "Невірний email або пароль" };
  }

  return { success: true, user };
}

// ===== Поточна залогінена сесія =====
export function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");
}

export function getCurrentUser() {
  const stored = localStorage.getItem("currentUser");
  return stored ? JSON.parse(stored) : null;
}