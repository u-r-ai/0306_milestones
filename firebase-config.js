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

if (FIREBASE_ENABLED) {
  if (typeof firebase === "undefined") {
    console.error("[Firebase] Firebase SDK not loaded.");
  } else {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
    } catch (e) {
      console.error("[Firebase] Init failed:", e.message);
    }
  }
}
