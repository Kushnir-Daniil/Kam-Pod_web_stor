import {
  canAccessAdminPanel,
  canAccessKazkarPanel,
  getCurrentUser,
  ROLES,
} from "../../shared/js/data/usersData.js";

const user = getCurrentUser();
const path = window.location.pathname;
const isDashboard = path.endsWith("/dashboard.html");
const isReview = path.endsWith("/quest-review.html");
const isQuestsList = path.endsWith("/quests.html");
const isEditor = path.endsWith("/quest-editor.html");

if (!user) {
  window.location.href = "../register/";
} else if ((isDashboard || isReview) && !canAccessAdminPanel()) {
  if (canAccessKazkarPanel()) {
    window.location.href = "quests.html";
  } else {
    window.location.href = "../user/home.html";
  }
} else if ((isQuestsList || isEditor) && canAccessAdminPanel() && user.role === ROLES.ADMIN) {
  // Адмін не користується конструктором — лише модерація
  if (isQuestsList) {
    window.location.href = "dashboard.html";
  }
} else if (!canAccessKazkarPanel() && !canAccessAdminPanel()) {
  window.location.href = "../user/home.html";
} else {
  console.log("Панель завантажено", { role: user.role, id: user.id });
}
