const admin = require("firebase-admin");
const serviceAccount = require("../../config/serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${serviceAccount.project_id}`);

// Try to access Firestore
const db = admin.firestore();
console.log("Firestore instance created");

// Print Firestore settings
console.log("Firestore settings:", db._settings);

console.log("Test completed successfully");
