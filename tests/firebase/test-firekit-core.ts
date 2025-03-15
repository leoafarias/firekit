import "reflect-metadata";
import * as serviceAccount from "../../config/serviceAccountKey.json";
import {
  Collection,
  CreatedAt,
  Field,
  Firekit,
  ID,
  UpdatedAt,
} from "../../src";
import { initializeFirebase } from "../../src/firebase-init";

// Initialize Firebase Admin SDK
initializeFirebase();

console.log("Firebase Admin SDK initialized successfully");
console.log(`Project ID: ${(serviceAccount as any).project_id}`);

// Define a test entity with decorators
@Collection("test-users")
class TestUser {
  @ID()
  id!: string;

  @Field()
  name!: string;

  @Field({ index: true })
  email!: string;

  @Field()
  age!: number;

  @Field({ index: true })
  roles?: string[];

  @Field()
  isActive?: boolean;

  @Field()
  counter?: number;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

// Get the repository
const userRepo = Firekit.getRepository(TestUser);

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

// Run all tests
async function runAllTests() {
  try {
    await testFirekitCrud();

    console.log("\n🎉 All Firekit tests completed successfully!");
  } catch (error) {
    console.error("\n❌ Some tests failed:", error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();
