const admin = require("firebase-admin");
const serviceAccount = require("../../config/serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${serviceAccount.project_id}`);

// Get Firestore instance
const db = admin.firestore();
console.log("Firestore instance created");

// Test CRUD operations
async function testCrud() {
  try {
    // Create a test collection
    const testCollection = db.collection("test");

    // Create a document
    console.log("Creating a test document...");
    const docRef = await testCollection.add({
      message: "Hello from Firekit!",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Document created with ID: ${docRef.id}`);

    // Read the document
    console.log("Reading the document...");
    const docSnapshot = await docRef.get();
    console.log("Document data:", docSnapshot.data());

    // Update the document
    console.log("Updating the document...");
    await docRef.update({
      message: "Updated message from Firekit!",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Read the updated document
    console.log("Reading the updated document...");
    const updatedDocSnapshot = await docRef.get();
    console.log("Updated document data:", updatedDocSnapshot.data());

    // Delete the document
    console.log("Deleting the document...");
    await docRef.delete();

    console.log("Document deleted");
    console.log("CRUD test completed successfully!");
  } catch (error) {
    console.error("Error during CRUD test:", error);
  }
}

// Run the test
testCrud();
