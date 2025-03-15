import "reflect-metadata";
import { Collection, CreatedAt, Field, Firekit, ID, UpdatedAt } from "../src";
import { initializeFirebase } from "../src/firebase-init";

// Initialize Firebase Admin SDK
initializeFirebase();

// Define a main entity
@Collection("users")
class User {
  @ID()
  id!: string;

  @Field()
  displayName!: string;

  @Field({ index: true })
  email!: string;

  @Field()
  age!: number;

  @Field({
    transformer: {
      toFirestore: (roles: string[]) => roles.join(","),
      fromFirestore: (value: string) => (value ? value.split(",") : []),
    },
  })
  roles!: string[];

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;

  // Non-persisted computed property
  get isAdmin(): boolean {
    return this.roles.includes("admin");
  }
}

// Example usage
async function runExample() {
  try {
    // Get user repository
    const userRepo = Firekit.getRepository(User);

    // Create users
    console.log("Creating users...");

    const user1 = await userRepo.create({
      displayName: "John Doe",
      email: "john@example.com",
      age: 30,
      roles: ["user"],
    });
    console.log(`User 1 created with ID: ${user1.id}`);

    const user2 = await userRepo.create({
      displayName: "Jane Smith",
      email: "jane@example.com",
      age: 28,
      roles: ["user", "admin"],
    });
    console.log(`User 2 created with ID: ${user2.id}`);

    const user3 = await userRepo.create(
      {
        displayName: "Bob Johnson",
        email: "bob@example.com",
        age: 35,
        roles: ["user", "editor"],
      },
      "custom-user-id"
    ); // Using custom ID
    console.log(`User 3 created with ID: ${user3.id}`);

    // Find a user by ID
    console.log("\nFinding user by ID...");
    const foundUser = await userRepo.findById(user2.id);
    if (foundUser) {
      console.log(`Found user: ${foundUser.displayName}`);
      console.log(`Is admin: ${foundUser.isAdmin}`);
    }

    // Query users over 25 years old
    console.log("\nSkipping complex query that requires an index...");
    console.log(
      "Please create the index using the URL from the error message and try again later."
    );

    /*
    console.log("\nQuerying users over 25 years old...");
    const olderUsers = await userRepo
      .query()
      .where("age", ">", 25)
      .orderBy("age")
      .orderBy("displayName")
      .get();
    
    console.log(`Found ${olderUsers.length} users over 25 years old:`);
    olderUsers.forEach(user => {
      console.log(`- ${user.displayName} (${user.age})`);
    });
    */

    // Update a user
    console.log("\nUpdating a user...");
    const updatedUser = await userRepo.update(user1.id, {
      displayName: "John Smith",
      age: 31,
      roles: ["user", "moderator"],
    });

    // Verify update
    console.log(
      `Updated user: ${
        updatedUser.displayName
      }, Roles: ${updatedUser.roles.join(", ")}`
    );

    // Batch operations
    console.log("\nPerforming batch operations...");
    await userRepo.batch((batch) => {
      // Update one user
      batch.update(user2.id, {
        age: 29,
        roles: ["user", "admin", "super-admin"],
      });

      // Create a new user
      batch.create({
        displayName: "Alice Williams",
        email: "alice@example.com",
        age: 32,
        roles: ["user"],
      });

      // Delete the user with custom ID
      batch.delete(user3.id);
    });
    console.log("Batch operations completed");

    // Get all users
    console.log("\nGetting all users after batch operations...");
    const allUsers = await userRepo.findAll();

    console.log(`Found ${allUsers.length} users in total:`);
    allUsers.forEach((user) => {
      console.log(
        `- ${user.displayName}, ${user.email}, ${user.age} years old, Roles: ${
          user.roles ? user.roles.join(", ") : "none"
        }`
      );
    });

    // Clean up (optional - for demonstration purposes)
    console.log("\nCleaning up...");
    for (const user of allUsers) {
      await userRepo.delete(user.id);
    }
    console.log("All users deleted");

    console.log("\nExample completed successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
runExample();
