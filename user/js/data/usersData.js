import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { auth, db } from "../firebase.js";

const ADMIN_EMAILS = [
  "kn1b24.kushnir@kpnu.edu.ua",
];

function mapAuthError(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "Користувач з таким email вже існує";
    case "auth/invalid-email":
      return "Невірний формат email";
    case "auth/weak-password":
      return "Пароль має містити щонайменше 6 символів";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Невірний email або пароль";
    case "auth/too-many-requests":
      return "Забагато спроб. Спробуйте пізніше";
    case "permission-denied":
      return "Немає доступу до бази даних. Перевірте Firestore Rules";
    default:
      return error?.message || "Сталася помилка. Спробуйте ще раз";
  }
}

function buildUser(uid, data) {
  return {
    id: uid,
    name: data.name || "",
    email: data.email || "",
    birthDate: data.birthDate || "",
    isAdmin: Boolean(data.isAdmin),
    coins: data.coins ?? 0,
    xp: data.xp ?? 0,
    createdAt: data.createdAt || null,
  };
}

async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return buildUser(uid, snap.data());
}

// ===== Реєстрація =====
export async function registerUser({ name, email, password, birthDate }) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    const { user } = credential;

    await updateProfile(user, { displayName: trimmedName });

    const profile = {
      name: trimmedName,
      email: normalizedEmail,
      birthDate,
      isAdmin: ADMIN_EMAILS.includes(normalizedEmail),
      coins: 0,
      xp: 0,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", user.uid), profile);

    return {
      success: true,
      user: buildUser(user.uid, {
        ...profile,
        createdAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    return { success: false, error: mapAuthError(error) };
  }
}

// ===== Логін =====
export async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password,
    );
    const profile = await fetchUserProfile(credential.user.uid);

    if (!profile) {
      return {
        success: false,
        error: "Профіль користувача не знайдено в базі даних",
      };
    }

    return { success: true, user: profile };
  } catch (error) {
    return { success: false, error: mapAuthError(error) };
  }
}

export async function logoutUser() {
  await signOut(auth);
  localStorage.removeItem("currentUser");
  localStorage.removeItem("isAdmin");
}

// ===== Кеш сесії (для навігації / isAdmin) =====
export function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  localStorage.setItem("isAdmin", user.isAdmin ? "true" : "false");
}

export function getCurrentUser() {
  const stored = localStorage.getItem("currentUser");
  return stored ? JSON.parse(stored) : null;
}
