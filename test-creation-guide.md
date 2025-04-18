# Test Creation Guide for Repokit

This guide outlines the approach for testing the Repokit project, particularly focusing on the in-memory adapter components, which form the foundation of the adapter pattern implementation.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Structure](#testing-structure)
3. [Test Types](#test-types)
4. [Testing In-Memory Adapter Components](#testing-in-memory-adapter-components)
5. [Testing Core Repokit Functionality](#testing-core-repokit-functionality)
6. [Testing Decorators](#testing-decorators)
7. [Testing ID Generator](#testing-id-generator)
8. [Performance Testing](#performance-testing)
9. [Integration Testing](#integration-testing)
10. [Test Environment Setup](#test-environment-setup)

## Testing Philosophy

Repokit follows these testing principles:

1. **Component Isolation**: Test individual components in isolation where possible
2. **Functional Verification**: Verify that components fulfill their contract
3. **Edge Case Coverage**: Test boundary conditions and error handling
4. **Performance Benchmarking**: Measure and verify performance characteristics
5. **Integration Testing**: Verify components work together as expected

## Testing Structure

### Directory Layout

```
repokit/
  ├── tests/
  │   ├── integration.test.ts      # Tests full component integration
  │   ├── id-generator.test.ts     # Tests ID generation functionality
  │   ├── performance.test.ts      # Tests performance characteristics
  │   └── unit/                    # Unit tests for individual components
  │       ├── adapters/            # Tests for adapter implementations
  │       ├── decorators/          # Tests for decorators
  │       ├── repository/          # Tests for repository classes
  │       └── utils/               # Tests for utility functions
  └── src/
      └── ...
```

### File Naming Conventions

- Test files should be named after the component being tested with `.test.ts` suffix
- Integration tests should have descriptive names reflecting the functionality being tested
- When testing multiple components together, name files based on the feature or scenario

## Test Types

### Unit Tests

Test individual components in isolation:

```typescript
// Example: Testing the Collection decorator
describe("Collection Decorator", () => {
  @Collection({ name: "test-collection" })
  class TestEntity {}

  it("should store collection name metadata", () => {
    const collectionName = getCollectionName(TestEntity);
    expect(collectionName).toBe("test-collection");
  });
});
```

### Integration Tests

Test components working together:

```typescript
// Example: Testing repository CRUD operations with in-memory adapter
describe("Repository CRUD with InMemoryAdapter", () => {
  let adapter: InMemoryAdapter;
  let repository: IRepository<TestEntity>;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
    repository = Repokit.getRepository<TestEntity>(TestEntity);
  });

  it("should create and retrieve an entity", async () => {
    const entity = await repository.create({ name: "Test Entity" });
    const retrieved = await repository.getById(entity.id);
    expect(retrieved.name).toBe("Test Entity");
  });
});
```

### Performance Tests

Test performance characteristics:

```typescript
describe("Performance Tests", () => {
  it("should handle large datasets efficiently", async () => {
    const startTime = performance.now();

    // Perform operations with large datasets

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(acceptableTimeThreshold);
  });
});
```

## Testing In-Memory Adapter Components

### InMemoryAdapter

Test the main adapter functionality:

```typescript
describe("InMemoryAdapter", () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  it("should connect with empty store", async () => {
    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);

    const store = adapter.getStore();
    expect(Object.keys(store).length).toBe(0);
  });

  it("should connect with initial data", async () => {
    const initialData = {
      "test-collection": {
        "test-id": { name: "Test" },
      },
    };

    await adapter.connect({ initialData });
    const store = adapter.getStore();

    expect(store["test-collection"]).toBeDefined();
    expect(store["test-collection"].get("test-id")).toEqual({ name: "Test" });
  });

  it("should throw error when connecting twice", async () => {
    await adapter.connect();
    await expect(adapter.connect()).rejects.toThrow();
  });

  // More tests...
});
```

### InMemoryRepository

Test repository operations:

```typescript
describe("InMemoryRepository", () => {
  let adapter: InMemoryAdapter;
  let repository: InMemoryRepository<TestEntity>;
  let collection: Map<string, any>;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await adapter.connect();
    collection = new Map();
    repository = new InMemoryRepository<TestEntity>(
      TestEntity,
      adapter,
      collection
    );
  });

  it("should save an entity with metadata", async () => {
    const result = await (repository as any)._save("test-id", { name: "Test" });

    expect(result.id).toBe("test-id");
    expect(result.createTime).toBeInstanceOf(Date);
    expect(result.updateTime).toBeInstanceOf(Date);

    expect(collection.has("test-id")).toBe(true);
    const saved = collection.get("test-id");
    expect(saved.name).toBe("Test");
    expect(saved._metadata).toBeDefined();
  });

  // More tests...
});
```

### InMemoryQueryBuilder

Test query functionality:

```typescript
describe("InMemoryQueryBuilder", () => {
  let getAllEntities: () => any[];
  let queryBuilder: InMemoryQueryBuilder<any>;

  beforeEach(() => {
    const entities = [
      { id: "1", name: "Alice", age: 30, tags: ["admin", "user"] },
      { id: "2", name: "Bob", age: 25, tags: ["user"] },
      { id: "3", name: "Charlie", age: 35, tags: ["moderator", "user"] },
    ];

    getAllEntities = () => entities;
    queryBuilder = new InMemoryQueryBuilder(getAllEntities);
  });

  it("should filter by equality", async () => {
    const results = await queryBuilder.where("name", "==", "Bob").getResults();
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("2");
  });

  it("should filter by range operators", async () => {
    const results = await queryBuilder
      .where("age", ">", 25)
      .where("age", "<", 35)
      .getResults();

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("1");
  });

  it("should filter by array-contains", async () => {
    const results = await queryBuilder
      .where("tags", "array-contains", "moderator")
      .getResults();

    expect(results.length).toBe(1);
    expect(results[0].id).toBe("3");
  });

  it("should order results", async () => {
    const results = await queryBuilder.orderBy("age", "desc").getResults();

    expect(results.length).toBe(3);
    expect(results[0].id).toBe("3");
    expect(results[1].id).toBe("1");
    expect(results[2].id).toBe("2");
  });

  // More tests...
});
```

### InMemoryBatchProcessor

Test batch operations:

```typescript
describe("InMemoryBatchProcessor", () => {
  let adapter: InMemoryAdapter;
  let store: { [collectionName: string]: Map<string, any> };
  let batchProcessor: InMemoryBatchProcessor;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await adapter.connect();
    store = adapter.getStore();
    store["users"] = new Map();
    batchProcessor = new InMemoryBatchProcessor(store);
  });

  it("should execute all operations on commit", async () => {
    batchProcessor.create(UserEntity, { name: "Alice" }, "user1");
    batchProcessor.create(UserEntity, { name: "Bob" }, "user2");

    await batchProcessor.commit();

    expect(store["users"].get("user1")).toBeDefined();
    expect(store["users"].get("user2")).toBeDefined();
  });

  it("should rollback on failure", async () => {
    batchProcessor.create(UserEntity, { name: "Alice" }, "user1");

    // Add invalid operation that will fail
    batchProcessor.update(UserEntity, "non-existent", { name: "Invalid" });

    await expect(batchProcessor.commit()).rejects.toThrow();

    // Verify no changes were made
    expect(store["users"].size).toBe(0);
  });

  // More tests...
});
```

## Testing Core Repokit Functionality

Test the central Repokit static class:

```typescript
describe("Repokit", () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
  });

  afterEach(async () => {
    if (Repokit.isConnected()) {
      await Repokit.disconnect();
    }
  });

  it("should connect to adapter", async () => {
    await Repokit.connect(adapter);
    expect(Repokit.isConnected()).toBe(true);
  });

  it("should disconnect from adapter", async () => {
    await Repokit.connect(adapter);
    await Repokit.disconnect();
    expect(Repokit.isConnected()).toBe(false);
  });

  it("should get repository", async () => {
    await Repokit.connect(adapter);
    const repository = Repokit.getRepository(TestEntity);
    expect(repository).toBeInstanceOf(InMemoryRepository);
  });

  it("should throw when getting repository without connection", async () => {
    expect(() => Repokit.getRepository(TestEntity)).toThrow();
  });

  // More tests...
});
```

## Testing Decorators

### Collection Decorator

```typescript
describe("Collection Decorator", () => {
  it("should store collection name", () => {
    @Collection({ name: "users" })
    class User {}

    expect(getCollectionName(User)).toBe("users");
  });

  it("should throw for empty collection name", () => {
    expect(() => {
      @Collection({ name: "" })
      class InvalidEntity {}
    }).toThrow();
  });
});
```

### Field Decorator

```typescript
describe("Field Decorator", () => {
  it("should store field metadata", () => {
    class TestClass {
      @Field()
      name!: string;
    }

    const fields = getFieldsMetadata(TestClass);
    expect(fields.length).toBe(1);
    expect(fields[0].propertyKey).toBe("name");
  });

  it("should store transformer options", () => {
    const transformer = {
      toDatabaseFormat: (value: any) => JSON.stringify(value),
      fromDatabaseFormat: (value: any) => JSON.parse(value),
    };

    class TestClass {
      @Field({ transformer })
      data!: any;
    }

    const fields = getFieldsMetadata(TestClass);
    expect(fields[0].options.transformer).toBe(transformer);
  });
});
```

### ID Decorator

```typescript
describe("ID Decorator", () => {
  it("should mark a field as ID", () => {
    class TestClass {
      @ID()
      id!: string;
    }

    const idField = getIdField(TestClass);
    expect(idField).toBe("id");
  });

  it("should throw if multiple ID fields are defined", () => {
    expect(() => {
      class InvalidClass {
        @ID()
        id1!: string;

        @ID()
        id2!: string;
      }
    }).toThrow();
  });
});
```

## Testing ID Generator

Test custom ID generation functionality:

```typescript
describe("ID Generator", () => {
  // Custom ID generator implementation for testing
  class TestIdGenerator implements IIdGenerator {
    private counter = 100;

    generateId(): string {
      return `test-${++this.counter}`;
    }
  }

  it("should use default UUID generator", async () => {
    const adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);

    const repository = Repokit.getRepository<TestEntity>(TestEntity);
    const entity = await repository.create({ name: "Test" });

    // UUID format: 8-4-4-4-12 characters
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("should use custom ID generator", async () => {
    const adapter = new InMemoryAdapter();
    adapter.setIdGenerator(new TestIdGenerator());
    await Repokit.connect(adapter);

    const repository = Repokit.getRepository<TestEntity>(TestEntity);
    const entity = await repository.create({ name: "Test" });

    expect(entity.id).toBe("test-101");
  });

  it("should respect provided IDs", async () => {
    const adapter = new InMemoryAdapter();
    adapter.setIdGenerator(new TestIdGenerator());
    await Repokit.connect(adapter);

    const repository = Repokit.getRepository<TestEntity>(TestEntity);
    const entity = await repository.create({ name: "Test" }, "custom-id");

    expect(entity.id).toBe("custom-id");
  });
});
```

## Performance Testing

Test performance characteristics:

```typescript
describe("Performance Tests", () => {
  let adapter: InMemoryAdapter;
  let repository: IRepository<TestEntity>;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
    repository = Repokit.getRepository<TestEntity>(TestEntity);
  });

  it("should efficiently handle large datasets", async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    // Create many entities
    const entities = [];
    for (let i = 0; i < 1000; i++) {
      entities.push(
        await repository.create({
          name: `Entity ${i}`,
          value: i,
          tags: [`tag${i % 10}`],
        })
      );
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;

    console.log(`Created 1000 entities in ${endTime - startTime}ms`);
    console.log(
      `Memory used: ${(finalMemory - initialMemory) / 1024 / 1024}MB`
    );

    // Soft performance assertions
    expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
    expect((finalMemory - initialMemory) / 1024 / 1024).toBeLessThan(50); // Less than 50MB
  });

  it("should efficiently execute queries", async () => {
    // Setup test data
    for (let i = 0; i < 1000; i++) {
      await repository.create({
        name: `Entity ${i}`,
        value: i,
        tags: [`tag${i % 10}`],
      });
    }

    const startTime = performance.now();

    // Execute complex query
    const results = await repository
      .query()
      .where("value", ">", 500)
      .where("value", "<", 600)
      .where("tags", "array-contains", "tag5")
      .orderBy("value", "desc")
      .getResults();

    const endTime = performance.now();

    console.log(`Query executed in ${endTime - startTime}ms`);

    // Verify results
    expect(results.length).toBe(10); // Should match 10 entities

    // Soft performance assertion
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
  });
});
```

## Integration Testing

Test full system integration:

```typescript
describe("Integration Tests", () => {
  // Define test entities
  @Collection({ name: "users" })
  class User {
    @ID()
    id!: string;

    @Field()
    name!: string;

    @Field()
    email!: string;

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
    userId!: string;

    @Field()
    amount!: number;

    @CreatedAt()
    createdAt!: Date;
  }

  let adapter: InMemoryAdapter;
  let userRepository: IRepository<User>;
  let orderRepository: IRepository<Order>;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
    userRepository = Repokit.getRepository<User>(User);
    orderRepository = Repokit.getRepository<Order>(Order);
  });

  afterEach(async () => {
    await Repokit.disconnect();
  });

  it("should perform end-to-end CRUD operations", async () => {
    // Create a user
    const user = await userRepository.create({
      name: "John Doe",
      email: "john@example.com",
    });

    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);

    // Create related orders
    const order1 = await orderRepository.create({
      userId: user.id,
      amount: 100,
    });

    const order2 = await orderRepository.create({
      userId: user.id,
      amount: 200,
    });

    // Query related orders
    const userOrders = await orderRepository
      .query()
      .where("userId", "==", user.id)
      .orderBy("amount", "asc")
      .getResults();

    expect(userOrders.length).toBe(2);
    expect(userOrders[0].amount).toBe(100);
    expect(userOrders[1].amount).toBe(200);

    // Update user
    const updatedUser = await userRepository.update(user.id, {
      name: "John Smith",
    });

    expect(updatedUser.name).toBe("John Smith");
    expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(
      user.updatedAt.getTime()
    );

    // Delete order
    await orderRepository.delete(order1.id);

    // Verify deletion
    const remainingOrders = await orderRepository
      .query()
      .where("userId", "==", user.id)
      .getResults();

    expect(remainingOrders.length).toBe(1);
    expect(remainingOrders[0].id).toBe(order2.id);
  });

  it("should perform batch operations", async () => {
    // Create batch
    const batch = adapter.getRepository<User>(User).batch();

    // Add operations
    batch.create(User, { name: "User 1", email: "user1@example.com" }, "user1");
    batch.create(User, { name: "User 2", email: "user2@example.com" }, "user2");
    batch.create(Order, { userId: "user1", amount: 100 }, "order1");

    // Commit batch
    await batch.commit();

    // Verify all operations were performed
    const user1 = await userRepository.findById("user1");
    const user2 = await userRepository.findById("user2");
    const order = await orderRepository.findById("order1");

    expect(user1).not.toBeNull();
    expect(user2).not.toBeNull();
    expect(order).not.toBeNull();
    expect(order?.userId).toBe("user1");
  });

  it("should rollback batch on failure", async () => {
    // Create batch
    const batch = adapter.getRepository<User>(User).batch();

    // Add operations with one that will fail
    batch.create(User, { name: "User 1", email: "user1@example.com" }, "user1");
    batch.update(User, "non-existent", { name: "Updated" }); // This will fail

    // Commit batch should fail
    await expect(batch.commit()).rejects.toThrow();

    // Verify no operations were performed
    const user1 = await userRepository.findById("user1");
    expect(user1).toBeNull();
  });
});
```

## Test Environment Setup

### Jest Configuration

Example `jest.config.js` for Repokit:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts", "!src/**/*.d.ts"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Setup File Example

Example `tests/jest.setup.ts`:

```typescript
import "reflect-metadata";

// Global test timeout
jest.setTimeout(10000);

// Console log interceptor for cleaner test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.VERBOSE_TESTS === "true") {
    originalConsoleLog(...args);
  }
};

// Global cleanup
afterAll(() => {
  // Any global cleanup needed
});
```

### Test Utilities Example

Create helper utilities for testing:

```typescript
// tests/test-utils.ts
import { ClassType } from "class-transformer-validator";
import { InMemoryAdapter, Repokit } from "../src";

export async function setupTestEnvironment() {
  const adapter = new InMemoryAdapter();
  await Repokit.connect(adapter);
  return adapter;
}

export async function teardownTestEnvironment() {
  await Repokit.disconnect();
}

export function createTestRepository<T extends object>(
  entityClass: ClassType<T>
) {
  return Repokit.getRepository<T>(entityClass);
}
```
