import { initDashboard } from "./modules/dashboard.js";
import { initStoriesManage } from "./modules/storiesManage.js";
import { initChaptersManage } from "./modules/chaptersManage.js";

// Викликаєш потрібну функцію залежно від того, який "екран" адмінки зараз активний
initDashboard();