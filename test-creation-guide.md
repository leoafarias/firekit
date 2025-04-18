# Test Creation Guide for Repokit

This guide outlines the approach for creating effective tests for the Repokit project, based on existing patterns in Firekit and extending them for the new adapter-based architecture.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Structure](#test-structure)
3. [Test Types](#test-types)
4. [Mocking Approach](#mocking-approach)
5. [Testing Adapters](#testing-adapters)
6. [Testing Repositories](#testing-repositories)
7. [Testing Decorators](#testing-decorators)
8. [Testing Utilities](#testing-utilities)
9. [Integration Tests](#integration-tests)
10. [Test Environment Setup](#test-environment-setup)

## Testing Strategy

Repokit's testing strategy follows these principles:

1. **Unit Testing**: Test individual components in isolation
2. **Integration Testing**: Test components working together
3. **Adapter Coverage**: Each adapter must have its own test suite
4. **Behavior Verification**: Verify the same behavior works across different adapters
5. **Test Isolation**: Tests should not depend on each other's state
6. **Mocking External Dependencies**: Use mocks for external systems like Firestore

## Test Structure

### Directory Structure

```
repokit/
  ├── tests/
  │   ├── unit/
  │   │   ├── decorators/
  │   │   ├── repository/
  │   │   ├── models/
  │   │   └── utils/
  │   ├── integration/
  │   │   ├── inmemory/
  │   │   ├── repokit-core/
  │   │   └── compatibility/
  │   └── helpers/
  └── ...
```

### File Naming

- Name test files after the component being tested with `.test.ts` suffix
- Examples: `collection.decorator.test.ts`, `in-memory.repository.test.ts`

## Test Types

### Unit Tests

Unit tests focus on testing individual components in isolation:

- **Repository Base Class**: Test abstract behavior with mock implementations
- **Decorators**: Test metadata storage and retrieval
- **Adapters**: Test adapter-specific implementations in isolation
- **Utilities**: Test helper functions and utilities

### Integration Tests

Integration tests verify components working together:

- **Adapter Integration**: Test repository operations through specific adapters
- **Repokit Core**: Test the core functionality of Repokit, adapters, and repositories together
- **Compatibility**: Test that the same operations produce equivalent results across adapters

## Mocking Approach

### Mocking Dependencies

- Use Jest's mocking capabilities for external dependencies
- Create reusable mock factories in the `tests/helpers` directory
- Prefer dependency injection for easier testing

### Mock Implementations

Example of creating a mock adapter for testing:

```typescript
// In tests/helpers/mock-adapter.ts
import { IDatabaseAdapter, IRepository } from "../../src/interfaces";

export class MockAdapter implements IDatabaseAdapter {
  private mockStore: Record<string, Record<string, any>> = {};

  async connect(): Promise<void> {
    // No-op for mock
  }

  async disconnect(): Promise<void> {
    // No-op for mock
  }

  getRepository<T extends object>(entityClass: any): IRepository<T> {
    // Return a mock repository implementation
    return new MockRepository<T>(entityClass, this.mockStore);
  }

  // Helper method for tests to access the underlying store
  getMockStore(): Record<string, Record<string, any>> {
    return this.mockStore;
  }
}
```

## Testing Adapters

### In-Memory Adapter

The in-memory adapter should be thoroughly tested since it will be used for testing other components:

```typescript
describe("InMemoryAdapter", () => {
  let adapter: InMemoryAdapter;

  beforeEach(() => {
    adapter = new InMemoryAdapter();
    await adapter.connect();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  describe("basic operations", () => {
    it("should initialize with empty store", () => {
      // Test initialization
    });

    it("should connect with initial data when provided", async () => {
      // Test connection with data
    });

    it("should create a repository for an entity class", () => {
      // Test repository creation
    });
  });
});
```

### Query Operations

Each adapter should implement and test all supported query operations:

```typescript
describe("InMemoryQueryBuilder", () => {
  // Setup code...

  describe("where", () => {
    it("should filter by equality", async () => {
      // Test equality filter
    });

    it("should filter by greater than", async () => {
      // Test > operator
    });

    // Tests for other operators...
  });

  describe("orderBy", () => {
    it("should sort results ascending", async () => {
      // Test ascending sort
    });

    it("should sort results descending", async () => {
      // Test descending sort
    });
  });

  // More query tests...
});
```

### Batch Operations

Test batch operations including rollback functionality:

```typescript
describe("InMemoryBatchProcessor", () => {
  // Setup code...

  it("should execute all operations on commit", async () => {
    // Test successful batch commit
  });

  it("should rollback all changes if an operation fails", async () => {
    // Test rollback on failure
  });
});
```

## Testing Repositories

The abstract repository should be tested with a concrete implementation:

```typescript
describe("AbstractRepository", () => {
  // Create a concrete implementation for testing
  class TestRepository<T extends object> extends AbstractRepository<T> {
    // Implement abstract methods with test doubles
    protected async _save() {
      /* test implementation */
    }
    protected async _findById() {
      /* test implementation */
    }
    protected async _update() {
      /* test implementation */
    }
    protected async _delete() {
      /* test implementation */
    }
  }

  // Test setup...

  describe("create", () => {
    it("should validate data before saving", async () => {
      // Test validation in create method
    });

    it("should transform data before saving", async () => {
      // Test transformation in create method
    });

    it("should call _save with transformed data", async () => {
      // Test that _save is called with expected data
    });
  });

  // More tests for other methods...
});
```

## Testing Decorators

Test each decorator thoroughly:

```typescript
describe("Collection Decorator", () => {
  @Collection("users")
  class User {
    id!: string;
    name!: string;
  }

  it("should store collection name metadata", () => {
    const collectionName = Reflect.getMetadata("collectionName", User);
    expect(collectionName).toBe("users");
  });

  it("should retrieve collection name using helper function", () => {
    const collectionName = getCollectionName(User);
    expect(collectionName).toBe("users");
  });

  it("should throw error when collection name is empty", () => {
    expect(() => {
      @Collection("")
      class EmptyCollection {}
    }).toThrow("Collection name cannot be empty");
  });
});
```

## Testing Utilities

Test utility functions thoroughly:

```typescript
describe("Metadata Utils", () => {
  it("should add field metadata to class", () => {
    // Test field metadata storage
  });

  it("should retrieve field metadata from class", () => {
    // Test field metadata retrieval
  });
});
```

## Integration Tests

Integration tests should verify components working together:

```typescript
describe("Repokit Integration", () => {
  // Test entity
  @Collection("test-users")
  class TestUser {
    @Field()
    name!: string;

    @Field()
    email!: string;
  }

  let repokit: Repokit;
  let adapter: InMemoryAdapter;
  let repository: IRepository<TestUser>;

  beforeEach(async () => {
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
    repository = Repokit.getRepository(TestUser);
  });

  afterEach(async () => {
    await Repokit.disconnect();
  });

  it("should create, retrieve, update and delete entities", async () => {
    // Test CRUD operations through Repokit
    const user = await repository.create({
      name: "Test User",
      email: "test@example.com",
    });

    expect(user.id).toBeDefined();

    const retrieved = await repository.findById(user.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.name).toBe("Test User");

    // Test update and delete
  });
});
```

## Test Environment Setup

### Jest Configuration

Create a Jest configuration that supports TypeScript:

```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
```

### Setup Files

Create setup files for common test initialization:

```typescript
// tests/setup.ts
import "reflect-metadata"; // Required for decorators

// Global test setup
beforeAll(() => {
  // Common setup for all tests
});

afterAll(() => {
  // Common teardown for all tests
});
```

### Testing Commands

Add these scripts to package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Best Practices

1. **Independent Tests**: Each test should be independent and not rely on state from other tests
2. **Clear Assertions**: Use descriptive assertions that explain what is being tested
3. **Test Fixtures**: Use test fixtures for common test data setup
4. **Complete Coverage**: Aim for complete test coverage of all code paths
5. **Edge Cases**: Test edge cases and error handling paths
6. **Clean Test Data**: Clean up test data after tests to prevent test pollution
7. **Fast Tests**: Keep tests fast by minimizing external dependencies
8. **Documentation**: Document test helpers and test patterns for team reference
