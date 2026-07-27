import {
  canAccessAdminPanel,
  canAccessKazkarPanel,
  getCurrentUser,
  ROLES,
} from "../../shared/js/data/usersData.js";

const user = getCurrentUser();
const path = window.location.pathname;
const isDashboard = path.endsWith("/dashboard.html");

if (!user) {
  window.location.href = "../register/";
} else if (isDashboard && !canAccessAdminPanel()) {
  // Дашборд модерації — лише адмін
  if (canAccessKazkarPanel()) {
    window.location.href = "quests.html";
  } else {
    window.location.href = "../user/home.html";
  }
} else if (!canAccessKazkarPanel() && !canAccessAdminPanel()) {
  window.location.href = "../user/home.html";
} else {
  const roleLabel =
    user.role === ROLES.ADMIN ? "Адмін" : "Казкар";
  console.log(`${roleLabel}-панель завантажено`, { role: user.role, id: user.id });

  const placeholder = document.querySelector(".page-placeholder");
  if (placeholder && user.role === ROLES.KAZKAR) {
    placeholder.textContent = "Панель казкаря: ваші квести та конструктор";
  }
}
