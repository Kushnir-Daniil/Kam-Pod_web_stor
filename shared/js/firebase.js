import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqxJzt9Xi4AuyxSnDB3Qb27_RJzybIl-c",
  authDomain: "questy-ad2d5.firebaseapp.com",
  projectId: "questy-ad2d5",
  storageBucket: "questy-ad2d5.firebasestorage.app",
  messagingSenderId: "765946190218",
  appId: "1:765946190218:web:a6eaa83f9e647694ced073",
  measurementId: "G-CJ328XKCNV",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
