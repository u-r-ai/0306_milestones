// Firebase Configuration
// HOW TO SET UP:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project
// 3. Click Web to add a web app
// 4. Copy firebaseConfig and replace below
// 5. Go to Firestore Database, Create database, Start in test mode
// 6. Done! Data will sync across all devices

var FIREBASE_CONFIG = {
    apiKey: "AIzaSyCClKxaGSX3fOMmd9JgmCnvC_pmrkbl6KM",
    authDomain: "milestone-tracker-e3997.firebaseapp.com",
    projectId: "milestone-tracker-e3997",
    storageBucket: "milestone-tracker-e3997.firebasestorage.app",
    messagingSenderId: "301436603109",
    appId: "1:301436603109:web:1ebfaece34533ce720620c"
};

var FIRESTORE_DOC_PATH = "app/milestone-tracker";
var FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "" && FIREBASE_CONFIG.projectId !== "";
var db = null;

console.log("[Firebase] FIREBASE_ENABLED:", FIREBASE_ENABLED);
console.log("[Firebase] firebase object exists:", typeof firebase !== "undefined");

if (FIREBASE_ENABLED) {
  if (typeof firebase === "undefined") {
    console.error("[Firebase] Firebase SDK not loaded! Check if CDN scripts are accessible.");
  } else {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      console.log("[Firebase] Initialized successfully. db =", db);
    } catch (e) {
      console.error("[Firebase] Init failed:", e.message, e);
    }
  }
} else {
  console.log("[Firebase] Not configured - using localStorage only.");
}
