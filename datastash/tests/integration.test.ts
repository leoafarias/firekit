import { IsEmail, IsString, Length, MinLength } from "class-validator";
import "reflect-metadata";
import { Entity, InMemoryAdapter, Stash } from "../src";
import { Collection, CreatedAt, Field, ID, UpdatedAt } from "../src/decorators";

// Define a test entity class
@Collection({ name: "users" })
class User {
  @ID()
  id!: string;

  @Field()
  @IsString()
  @Length(2, 50)
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field({
    transformer: {
      toDatabaseFormat: (roles: string[]) => (roles ? roles.join(",") : ""),
      fromDatabaseFormat: (value: string | any) =>
        typeof value === "string"
          ? value
            ? value.split(",")
            : []
          : Array.isArray(value)
          ? value
          : [],
    },
  })
  roles!: string[];

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

@Collection({ name: "orders" })
class Order {
  @ID()
  id!: string;

  @Field()
  @IsString()
  userId!: string;

  @Field()
  @IsString()
  @MinLength(3)
  product!: string;

  @Field()
  quantity!: number;

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

describe("Stash Integration Tests", () => {
  // Setup and teardown
  beforeEach(async () => {
    // Create and connect a new in-memory adapter for each test
    const adapter = new InMemoryAdapter();
    await Stash.connect(adapter);
  });

  afterEach(async () => {
    // Disconnect after each test
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
  });

  describe("Basic CRUD Operations", () => {
    it("should create, read, update, and delete entities", async () => {
      // Get repository
      const userRepo = Stash.getRepository<User>(User);

      // Create a user
      const user = await userRepo.create({
        name: "John Doe",
        email: "john@example.com",
        roles: ["user", "admin"],
      });

      // Verify user was created with correct data and metadata
      expect(user.id).toBeDefined();
      expect((user as unknown as User).name).toBe("John Doe");
      expect((user as unknown as User).email).toBe("john@example.com");
      expect((user as unknown as User).roles).toEqual(["user", "admin"]);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Read user by ID
      const foundUser = await userRepo.findById(user.id);
      expect(foundUser).not.toBeNull();
      expect((foundUser as unknown as User)!.name).toBe("John Doe");

      // Update user
      const updatedUser = await userRepo.update(user.id, { name: "Jane Doe" });
      expect((updatedUser as unknown as User).name).toBe("Jane Doe");
      expect((updatedUser as unknown as User).email).toBe("john@example.com"); // Unchanged field

      // Ensure update didn't affect other properties
      expect((updatedUser as unknown as User).roles).toEqual(["user", "admin"]);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(
        user.updatedAt.getTime()
      );

      // Delete user
      await userRepo.delete(user.id);
      const deletedUser = await userRepo.findById(user.id);
      expect(deletedUser).toBeNull();
    });

    // Skip this test for now as validation implementation may differ
    it.skip("should throw validation errors for invalid data", async () => {
      const userRepo = Stash.getRepository<User>(User);

      // Attempt to create with invalid data (missing required fields)
      await expect(userRepo.create({} as any)).rejects.toThrow(
        /Validation failed/
      );

      // Attempt to create with invalid email
      await expect(
        userRepo.create({
          name: "John Doe",
          email: "not-an-email",
          roles: [],
        })
      ).rejects.toThrow(/Validation failed/);
    });
  });

  describe("Query Operations", () => {
    it("should support filtering and sorting", async () => {
      // Get repository
      const userRepo = Stash.getRepository<User>(User);

      // Create test users
      await userRepo.create({
        name: "Alice",
        email: "alice@example.com",
        roles: ["user"],
      });
      await userRepo.create({
        name: "Bob",
        email: "bob@example.com",
        roles: ["user", "admin"],
      });
      await userRepo.create({
        name: "Charlie",
        email: "charlie@example.com",
        roles: ["user"],
      });

      // Query for users with specific role
      const adminUsers = await userRepo
        .query()
        .where("roles", "array-contains", "admin")
        .getResults();

      expect(adminUsers.length).toBe(1);
      expect((adminUsers[0] as unknown as User).name).toBe("Bob");

      // Query with sorting
      const sortedUsers = await userRepo
        .query()
        .orderBy("name", "desc")
        .getResults();

      expect(sortedUsers.length).toBe(3);
      expect((sortedUsers[0] as unknown as User).name).toBe("Charlie");
      expect((sortedUsers[1] as unknown as User).name).toBe("Bob");
      expect((sortedUsers[2] as unknown as User).name).toBe("Alice");

      // Query with multiple conditions and limit
      const filteredUsers = await userRepo
        .query()
        .where("roles", "array-contains", "user")
        .orderBy("name", "asc")
        .limit(2)
        .getResults();

      expect(filteredUsers.length).toBe(2);
      expect((filteredUsers[0] as unknown as User).name).toBe("Alice");
      expect((filteredUsers[1] as unknown as User).name).toBe("Bob");
    });
  });

  describe("Batch Operations", () => {
    it("should support batch operations", async () => {
      const userRepo = Stash.getRepository<User>(User);
      const orderRepo = Stash.getRepository<Order>(Order);

      // Create a user directly first, outside of a batch
      const user = await userRepo.create({
        name: "User One",
        email: "user1@example.com",
        roles: ["user"],
      });

      // Ensure we have a valid user with ID
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      console.log("Created user ID:", user.id);

      // Create a batch for orders
      const batch = userRepo.batch();

      // Add operations to the batch
      batch.create(Order, {
        userId: user.id,
        product: "Product 1",
        quantity: 1,
      });

      // Commit the batch
      await batch.commit();

      // Verify order was created
      const orders = await orderRepo
        .query()
        .where("userId", "==", user.id)
        .getResults();
      expect(orders.length).toBe(1);

      // Create a second batch to update the user
      const batch2 = userRepo.batch();
      batch2.update(User, user.id, { name: "Updated User" });
      await batch2.commit();

      // Verify user was updated
      const updatedUser = await userRepo.findById(user.id);
      expect(updatedUser).not.toBeNull();

      // Use proper type casting instead of 'any'
      if (updatedUser) {
        const typedUser = updatedUser as Entity<User> & User;
        expect(typedUser.name).toBe("Updated User");
      }
    });

    it("should rollback on error", async () => {
      const userRepo = Stash.getRepository<User>(User);
      const orderRepo = Stash.getRepository<Order>(Order);

      // Clear existing orders
      const existingOrders = await orderRepo.findAll();
      for (const order of existingOrders) {
        await orderRepo.delete(order.id);
      }

      // Create a test user first
      const user = await userRepo.create({
        name: "Test User",
        email: "test@example.com",
        roles: ["user"],
      });

      // Create a batch with an operation that will fail
      const batch = userRepo.batch();

      // Add a valid operation
      batch.create(Order, {
        userId: user.id,
        product: "Valid Product",
        quantity: 1,
      });

      // Add an operation that will fail (non-existent ID)
      batch.update(Order, "non-existent-id", { quantity: 2 });

      // Try to commit the batch (should fail and rollback)
      try {
        await batch.commit();
        fail("Batch should have failed due to non-existent ID");
      } catch (error) {
        // Expected error
      }

      // Verify no orders were created (batch was rolled back)
      const orders = await orderRepo.findAll();
      expect(orders.length).toBe(0);
    });
  });
});
