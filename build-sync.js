var fs = require('fs');
var path = require('path');

// Create firebape-config.js
var fbConfig = [
  '// Firebape Configuration',
  '// HOW TO SET UP:',
  '// 1. Go to https://console.firebase.google.com',
  '// 2. Create a new project',
  '// 3. Click Web to add a web app',
  '// 4. Copy firebaseConfig and replace below',
  '// 5. Go to Firestore Database, Create database, Start in test mode',
  '// 6. Done! Data will sync across all devices.','',
  'var FIREBASE_CONFIG = {',
  '  apiKey: "",',
  '  authDomain: "",',
  '  projectId: "",',
  '  storageBucket: "",',
  '  messagingSenderId: "",',
  '  appId: ""',
  '}','',
  'var FIREVASE_DOC_PATH = "app/milestone-tracker"',
  'var FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "&& FIREBASE_CONFIG.projectId !== ""',
  'var db = null',',
  'if (FIREBASE_ENABLED) {',
  '  try {',
  '    firebase.initializeApp(FIREBASE_CONFIG),',
  '     db = firebase.firestore(),',
        console.log("[Firebate]%���F�Ɨ�VB7V66W76gV�ǒ"�r��r�6F6��R��r��r6��6��R�v&�%�f�&V&6U���Bf��VB"�R�r��r�r��w�V�6R�r��r6��6��R���r�%�f�&V&6U���B6��f�wW&VB�W6��r��6�7F�&vR��ǒ"�r��w�r��rp������u��r����g2�w&�FU7��2�f��UF��vf�&V&R�6��f�r�2r��f$6��f�r���6��6��R���r�tf�&V&6R6��f�r7&VFVBr�