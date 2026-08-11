import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { db } from "../firebase.js";

const newsCol = collection(db, "news");

/** Останні N новин, найновіші перші. Колекцію поки наповнювати нема звідки — адмінка для новин не зроблена. */
export async function getRecentNews(limitCount = 5) {
  const q = query(newsCol, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}