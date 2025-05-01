import { IsArray, IsEmail, IsNotEmpty, IsString, Min } from "class-validator";
import "reflect-metadata";
import { Stash } from "../src";
import { InMemoryAdapter } from "../src/adapters/memory/memory.adapter";
import { Collection, Field } from "../src/decorators";

import { Creatable } from "../src/interfaces/entity.interface";
import {
  ComparisonOperator,
  SortDirection,
} from "../src/interfaces/query.interface";

// Define User Entity using flat structure
@Collection({ name: "users" })
class User {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @Field()
  @Min(0)
  loginCount!: number;
}

describe("Stash Integration Tests", () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    // Ensure we're disconnected before each test
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
    adapter = new InMemoryAdapter();
    await Stash.connect(adapter);
  });

  afterEach(async () => {
    // Ensure cleanup after each test
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
  });

  describe("Basic CRUD", () => {
    it("should create, read, update, and delete entities", async () => {
      // Get repository with only entity class
      const userRepo = Stash.getRepository(User);

      // Create a user - data matches Creatable<User>
      const createData: Creatable<User> = {
        name: "John Doe",
        email: "john@example.com",
        roles: ["user", "admin"],
        loginCount: 0,
      };
      const userRef = await userRepo.create(createData);

      // Verify user was created with correct data and metadata
      expect(userRef.id).toBeDefined();
      // Access directly
      expect(userRef.data.name).toBe("John Doe");
      expect(userRef.data.email).toBe("john@example.com");
      expect(userRef.data.roles).toEqual(["user", "admin"]);
      expect(userRef.createdAt).toBeInstanceOf(Date);
      expect(userRef.updatedAt).toBeInstanceOf(Date);

      // Read user by ID
      const foundUser = await userRepo.findById(userRef.id);
      expect(foundUser).not.toBeNull();
      expect(foundUser?.data?.name).toBe("John Doe");

      // Update user (data is Partial<User>)
      const updatedUserRef = await userRepo.update(userRef.id, {
        name: "Jane Doe",
      });
      expect(updatedUserRef.data.name).toBe("Jane Doe");
      expect(updatedUserRef.data.email).toBe("john@example.com"); // Unchanged field

      // Ensure update didn't affect other properties
      expect(updatedUserRef.data.roles).toEqual(["user", "admin"]);
      expect(updatedUserRef.updatedAt.getTime()).toBeGreaterThanOrEqual(
        userRef.updatedAt.getTime()
      );

      // Delete user
      await userRepo.delete(userRef.id);
      const deletedUser = await userRepo.findById(userRef.id);
      expect(deletedUser).toBeNull();
    });

    // Test validation (using the flat entity)
    it("should throw validation errors for invalid data", async () => {
      const userRepo = Stash.getRepository(User);

      // Attempt to create with invalid data (empty name)
      await expect(
        userRepo.create({
          name: "", // Fails @IsNotEmpty
          email: "valid@example.com",
          roles: [],
          loginCount: 0,
        })
      ).rejects.toThrow(/Validation failed/);

      // Attempt to create with invalid email
      await expect(
        userRepo.create({
          name: "John Doe",
          email: "not-an-email", // Fails @IsEmail
          roles: [],
          loginCount: 0,
        })
      ).rejects.toThrow(/Validation failed/);
    });
  });

  describe("Querying", () => {
    beforeEach(async () => {
      // Seed data before query tests
      const userRepo = Stash.getRepository(User);
      const usersToCreate: Creatable<User>[] = [
        { name: "Alice", email: "a@e.com", roles: ["user"], loginCount: 5 },
        {
          name: "Bob",
          email: "b@e.com",
          roles: ["user", "admin"],
          loginCount: 15,
        },
        { name: "Charlie", email: "c@e.com", roles: ["user"], loginCount: 10 },
        { name: "Diana", email: "d@e.com", roles: ["guest"], loginCount: 2 },
      ];
      for (const user of usersToCreate) {
        await userRepo.create(user);
      }
    });

    it("should support filtering and sorting", async () => {
      const userRepo = Stash.getRepository(User);

      // Query with filtering and sorting
      const results = await userRepo
        .query()
        .where("loginCount", ComparisonOperator.GreaterThan, 7)
        .orderBy("name", SortDirection.Ascending) // Sort by name asc
        .getResults();

      expect(results.length).toBe(2);
      expect(results[0].data.name).toBe("Bob"); // Bob (15) comes before Charlie (10)
      expect(results[1].data.name).toBe("Charlie");
      expect(results[0].data.loginCount).toBe(15);
      expect(results[1].data.loginCount).toBe(10);

      // Test ArrayContains using where
      const adminUsers = await userRepo
        .query()
        .where("roles", ComparisonOperator.ArrayContains, "admin")
        .getResults();

      expect(adminUsers.length).toBe(1);
      expect(adminUsers[0].data.name).toBe("Bob");
    });

    // Test complex query with limit/skip
    it("should execute complex queries correctly with InMemoryAdapter", async () => {
      const userRepo = Stash.getRepository(User);

      // Query: loginCount > 7, sort by loginCount ASC, skip 1, limit 1
      const results = await userRepo
        .query()
        .where("loginCount", ComparisonOperator.GreaterThan, 7)
        .orderBy("loginCount", SortDirection.Ascending)
        .skip(1)
        .limit(1)
        .getResults();

      // Expected order: Charlie (10), Bob (15)
      // Skip 1 leaves: Bob (15)
      // Limit 1 takes: Bob (15)
      expect(results).toHaveLength(1);
      expect(results[0].data.name).toBe("Bob");
      expect(results[0].data.loginCount).toBe(15);
    });
  });

  // Batch operations are out of scope for this refactoring
});
