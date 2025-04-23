import { IsArray, IsEmail, IsNotEmpty, IsString, Min } from "class-validator";
import "reflect-metadata";
import { Stash } from "../src";
import { InMemoryAdapter } from "../src/adapters/memory/memory.adapter";
import { Collection, Field } from "../src/decorators";
import { BaseEntity } from "../src/entities/base.entity";
import { Creatable } from "../src/interfaces/entity.interface";
import {
  ComparisonOperator,
  SortDirection,
} from "../src/interfaces/query.interface";

// Define User Entity using flat structure
@Collection({ name: "users" })
class User extends BaseEntity {
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
      const user = await userRepo.create(createData);

      // Verify user was created with correct data and metadata
      expect(user.id).toBeDefined();
      // Access directly
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john@example.com");
      expect(user.roles).toEqual(["user", "admin"]);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Read user by ID
      const foundUser = await userRepo.findById(user.id);
      expect(foundUser).not.toBeNull();
      expect(foundUser?.name).toBe("John Doe");

      // Update user (data is Partial<User>)
      const updatedUser = await userRepo.update(user.id, { name: "Jane Doe" });
      expect(updatedUser.name).toBe("Jane Doe");
      expect(updatedUser.email).toBe("john@example.com"); // Unchanged field

      // Ensure update didn't affect other properties
      expect(updatedUser.roles).toEqual(["user", "admin"]);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(
        user.updatedAt.getTime()
      );

      // Delete user
      await userRepo.delete(user.id);
      const deletedUser = await userRepo.findById(user.id);
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
      expect(results[0].name).toBe("Bob"); // Bob (15) comes before Charlie (10)
      expect(results[1].name).toBe("Charlie");
      expect(results[0].loginCount).toBe(15);
      expect(results[1].loginCount).toBe(10);

      // Test ArrayContains using where
      const adminUsers = await userRepo
        .query()
        .where("roles", ComparisonOperator.ArrayContains, "admin")
        .getResults();

      expect(adminUsers.length).toBe(1);
      expect(adminUsers[0].name).toBe("Bob");
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
      expect(results[0].name).toBe("Bob");
      expect(results[0].loginCount).toBe(15);
    });
  });

  // Batch operations are out of scope for this refactoring
});
