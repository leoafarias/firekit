const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    require("../../config/serviceAccountKey.json")
  ),
});

// Get Firestore instance
const db = admin.firestore();

// Test connection by adding a document
async function testConnection() {
  try {
    // Add a test document
    const result = await db.collection("test").add({
      message: "Hello from Firekit!",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Test document added with ID: ${result.id}`);

    // Read the document back
    const doc = await db.collection("test").doc(result.id).get();
    console.log("Document data:", doc.data());

    // Delete the test document
    await db.collection("test").doc(result.id).delete();
    console.log("Test document deleted");

    console.log("Firebase connection test successful!");
  } catch (error) {
    console.error("Error testing Firebase connection:", error);
  }
}

// Run the test
testConnection();
