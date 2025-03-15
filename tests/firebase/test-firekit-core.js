const admin = require("firebase-admin");
const serviceAccount = require("../../config/serviceAccountKey.json");
const { Firekit } = require("../../dist");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${serviceAccount.project_id}`);

// Define a test entity
class TestUser {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.age = data.age;
    this.roles = data.roles || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

// Get the repository for TestUser
// Note: In JavaScript, we need to manually register the collection name
const collectionName = "test-users";
const userRepo = Firekit.getRepository(TestUser, collectionName);

// Test Firekit CRUD operations
async function testFirekitCrud() {
  try {
    console.log("\n=== Testing Firekit CRUD Operations ===\n");

    // Create a user
    console.log("Creating a test user...");
    const user = await userRepo.create({
      name: "Test User",
      email: "test@example.com",
      age: 30,
      roles: ["user", "tester"],
    });

    console.log(`User created with ID: ${user.id}`);
    console.log("User data:", user);

    // Find by ID
    console.log("\nFinding user by ID...");
    const foundUser = await userRepo.findById(user.id);
    console.log("Found user:", foundUser);

    if (!foundUser) {
      throw new Error("Failed to find user by ID");
    }

    if (foundUser.name !== "Test User") {
      throw new Error(
        `Expected name to be "Test User", got "${foundUser.name}"`
      );
    }

    // Update the user
    console.log("\nUpdating the user...");
    const updatedUser = await userRepo.update(user.id, {
      name: "Updated Test User",
      age: 31,
    });

    console.log("Updated user:", updatedUser);

    if (updatedUser.name !== "Updated Test User") {
      throw new Error(
        `Expected name to be "Updated Test User", got "${updatedUser.name}"`
      );
    }

    if (updatedUser.age !== 31) {
      throw new Error(`Expected age to be 31, got ${updatedUser.age}`);
    }

    // Test query builder
    console.log("\nTesting query builder...");

    // Simple query
    const simpleQueryResults = await userRepo
      .query()
      .where("email", "==", "test@example.com")
      .get();

    console.log(`Simple query found ${simpleQueryResults.length} users`);

    if (simpleQueryResults.length !== 1) {
      throw new Error(
        `Expected to find 1 user, found ${simpleQueryResults.length}`
      );
    }

    // Delete the user
    console.log("\nDeleting the user...");
    await userRepo.delete(user.id);

    // Verify deletion
    const deletedUser = await userRepo.findById(user.id);
    console.log("After deletion, user exists:", !!deletedUser);

    if (deletedUser) {
      throw new Error("User was not deleted successfully");
    }

    console.log("\n✅ Firekit CRUD test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during Firekit CRUD test:", error);
    throw error;
  }
}

// Test batch operations
async function testBatchOperations() {
  try {
    console.log("\n=== Testing Firekit Batch Operations ===\n");

    // Create multiple users in a batch
    console.log("Creating multiple users in a batch...");

    const batch = userRepo.batch();

    const user1Data = {
      name: "Batch User 1",
      email: "batch1@example.com",
      age: 25,
      roles: ["user"],
    };

    const user2Data = {
      name: "Batch User 2",
      email: "batch2@example.com",
      age: 35,
      roles: ["admin"],
    };

    const user3Data = {
      name: "Batch User 3",
      email: "batch3@example.com",
      age: 45,
      roles: ["user", "moderator"],
    };

    batch.create(user1Data);
    batch.create(user2Data);
    batch.create(user3Data, "custom-batch-id");

    const results = await batch.commit();

    console.log(`Created ${results.length} users in batch`);
    console.log("Batch results:", results);

    if (results.length !== 3) {
      throw new Error(`Expected 3 results, got ${results.length}`);
    }

    // Find all users
    console.log("\nFinding all users...");
    const allUsers = await userRepo.findAll();
    console.log(`Found ${allUsers.length} users`);

    if (allUsers.length !== 3) {
      throw new Error(`Expected to find 3 users, found ${allUsers.length}`);
    }

    // Update in batch
    console.log("\nUpdating users in batch...");
    const updateBatch = userRepo.batch();

    updateBatch.update(results[0], { age: 26 });
    updateBatch.update(results[1], { age: 36 });
    updateBatch.update("custom-batch-id", { age: 46 });

    await updateBatch.commit();

    // Verify updates
    const updatedUsers = await userRepo.findAll();
    console.log("Updated users:", updatedUsers);

    // Clean up
    console.log("\nCleaning up batch users...");
    const deleteBatch = userRepo.batch();

    for (const user of updatedUsers) {
      deleteBatch.delete(user.id);
    }

    await deleteBatch.commit();

    // Verify deletion
    const remainingUsers = await userRepo.findAll();
    console.log(`Remaining users after cleanup: ${remainingUsers.length}`);

    if (remainingUsers.length !== 0) {
      throw new Error(
        `Expected 0 remaining users, found ${remainingUsers.length}`
      );
    }

    console.log("\n✅ Firekit batch operations test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during batch operations test:", error);
    throw error;
  }
}

// Test transaction operations
async function testTransactions() {
  try {
    console.log("\n=== Testing Firekit Transactions ===\n");

    // Create a user for transaction testing
    console.log("Creating a user for transaction testing...");
    const user = await userRepo.create({
      name: "Transaction User",
      email: "transaction@example.com",
      age: 30,
      counter: 0,
    });

    console.log(`Transaction user created with ID: ${user.id}`);

    // Perform a transaction
    console.log("\nPerforming a transaction...");

    const updatedUser = await userRepo.runTransaction(async (transaction) => {
      // Get the current user data
      const userData = await transaction.get(user.id);

      if (!userData) {
        throw new Error("User not found in transaction");
      }

      // Update the counter
      const newCounter = (userData.counter || 0) + 1;

      // Update the user in the transaction
      transaction.update(user.id, {
        counter: newCounter,
        lastUpdated: new Date(),
      });

      // Return the updated data
      return {
        ...userData,
        counter: newCounter,
      };
    });

    console.log("Transaction result:", updatedUser);

    if (updatedUser.counter !== 1) {
      throw new Error(`Expected counter to be 1, got ${updatedUser.counter}`);
    }

    // Clean up
    console.log("\nCleaning up transaction user...");
    await userRepo.delete(user.id);

    console.log("\n✅ Firekit transaction test completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during transaction test:", error);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testFirekitCrud();
    await testBatchOperations();
    await testTransactions();

    console.log("\n🎉 All Firekit tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Some tests failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
