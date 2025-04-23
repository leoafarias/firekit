# Datastash

[![npm version](https://img.shields.io/npm/v/datastash.svg)](https://www.npmjs.com/package/datastash)
[![Build Status](https://github.com/firekit/datastash/workflows/Test/badge.svg)](https://github.com/firekit/datastash/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, efficient repository pattern implementation for TypeScript with pluggable adapters.

## Features

- Clean repository pattern implementation
- Pluggable database adapters (in-memory, Firestore, file system)
- Support for CRUD operations and advanced queries
- Decorator-based entity definitions (using DTOs)
- Validation support via class-validator on DTOs
- Hierarchical data modeling with collections and subcollections

## Installation

```bash
npm install datastash reflect-metadata class-transformer class-validator
```
*(Note: `reflect-metadata`, `class-transformer`, and `class-validator` are peer dependencies)*

## Quick Start

```typescript
import { Collection, Field, Stash, InMemoryAdapter, Entity, ID, CreatedAt, UpdatedAt, ComparisonOperator, SortDirection } from "datastash";
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import "reflect-metadata"; // Ensure this is imported once at application entry point

// 1. Define your Data Transfer Object (DTO) with validation
class UserDataDto {
  @Field()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;
}

// 2. Define your Entity, implementing Entity<YourDto>
@Collection({ name: "users" })
class User implements Entity<UserDataDto> {
  @ID() // Automatic ID
  id!: string;

  @CreatedAt() // Automatic timestamp
  createdAt!: Date;

  @UpdatedAt() // Automatic timestamp
  updatedAt!: Date;

  deletedAt: Date | null = null; // Standard field for soft deletes

  @Type(() => UserDataDto) // Important for class-transformer
  @Field() // Mark the data field itself
  data!: UserDataDto; // Holds the actual data fields
}

// 3. Connect to a database
const adapter = new InMemoryAdapter({
  persistTo: './data.json',  // Save data to file
  loadFrom: './data.json'    // Load initial data from file
});
await Stash.connect(adapter);

// 4. Get a repository (pass both Entity and DTO classes)
const userRepo = Stash.getRepository(User, UserDataDto);

// 5. CRUD operations
// Create (pass data matching the DTO)
const user = await userRepo.create({
  name: "John Doe",
  email: "john@example.com",
});

// Read
const foundUser = await userRepo.findById(user.id);
// Access data via the .data property
console.log(foundUser?.data.name); // Output: John Doe

// Update (pass partial data matching the DTO)
await userRepo.update(user.id, { name: "Jane Doe" });
const updatedUser = await userRepo.findById(user.id);
console.log(updatedUser?.data.name); // Output: Jane Doe

// Delete
await userRepo.delete(user.id);

// 6. Query operations (use paths for data fields, use Enums)
const users = await userRepo
  .query()
  .where("data.name", ComparisonOperator.Equals, "Jane Doe") // Use where with path and Enum
  .orderBy("data.email", SortDirection.Ascending) // Use orderBy with path and Enum
  .limit(10)
  .getResults(); // Use getResults()

// Batch operations removed from Quick Start (API under review)

```

## Detailed Usage Guide

### Database Adapters

Datastash uses a pluggable adapter system to support different databases. Adapters implement the `IDatabaseAdapter` interface.

#### Available Adapters

1. **InMemoryAdapter** - For testing and development
   ```typescript
   import { Stash, InMemoryAdapter } from "datastash";

   // Simple initialization
   const adapter = new InMemoryAdapter();
   await Stash.connect(adapter);

   // With ID generator options
   const adapterWithSequentialIds = new InMemoryAdapter({
     idGenerator: 'sequential',
     sequentialIdPrefix: 'user-' // Optional prefix (default: 'id-')
   });
   await Stash.connect(adapterWithSequentialIds);
   ```

2. **FileSystemAdapter** - For local JSON storage
   ```typescript
   import { Stash, FileSystemAdapter } from "datastash";

   const adapter = new FileSystemAdapter({
     baseDir: './data',  // Directory to store collection files (default: './data')
     idGenerator: 'uuid', // 'uuid' (default), 'sequential', or custom IIdGenerator
     // sequentialIdPrefix: 'doc-', // Optional prefix if using 'sequential' ID generator
     prettyPrint: true    // Format JSON files with indentation (default: false)
   });
   await Stash.connect(adapter);
   ```

3. **Switching Adapters** - Changing databases at runtime
   ```typescript
   // Disconnect from current adapter
   await Stash.disconnect();

   // Connect to a new adapter
   const newAdapter = new FileSystemAdapter({ basePath: './prod-data' });
   await Stash.connect(newAdapter);
   ```

#### Creating Custom Adapters

You can create custom adapters by implementing the `IDatabaseAdapter` interface:

```typescript
import { IDatabaseAdapter, IRepository, Entity, ClassType } from "datastash";

class MyCustomAdapter implements IDatabaseAdapter {
  // Implement required methods
  connect(options?: any): Promise<void> {
    // Setup connection to your database
    // ...
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    // Close connection
    // ...
    return Promise.resolve();
  }

  isConnected(): boolean {
    // Check connection status
    // ...
    return false;
  }

  // getRepository requires Entity and DTO classes
  getRepository<T extends Entity<Data>, Data extends object>(
    entityClass: ClassType<T>,
    dataDtoClass: ClassType<Data>
  ): IRepository<T, Data> {
    // Return a repository implementation for this database
    // You'll likely need specific repository logic here
    // Example: return new MyCustomRepository(entityClass, dataDtoClass);
    throw new Error("Method not implemented.");
  }
}

// Usage
const adapter = new MyCustomAdapter();
await Stash.connect(adapter, { /* adapter-specific options */ });
```

### Entity Definition and Validation

Datastash uses DTOs (Data Transfer Objects) to define the structure and validation rules for the main data payload of your entities.

#### Defining DTOs and Entities

```typescript
import { IsEmail, IsNotEmpty, Length, Min } from "class-validator";
import { Collection, Field, Entity, ID, CreatedAt, UpdatedAt } from "datastash";
import { Type } from 'class-transformer';

// 1. Define the DTO with validation rules
class UserDataDto {
  @Field()
  @IsNotEmpty()
  @Length(2, 50)
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @Min(0)
  loginCount!: number;
}

// 2. Define the Entity implementing Entity<YourDto>
@Collection({ name: "users" })
class User implements Entity<UserDataDto> {
  @ID()
  id!: string;
  @CreatedAt()
  createdAt!: Date;
  @UpdatedAt()
  updatedAt!: Date;
  deletedAt: Date | null = null;

  @Type(() => UserDataDto) // Link to DTO
  @Field()
  data!: UserDataDto;
}
```

#### Validation in Action

Validation happens automatically when creating or updating entities using the rules defined in the DTO:

```typescript
const userRepo = Stash.getRepository(User, UserDataDto);

// This will throw a validation error
try {
  await userRepo.create({
    name: "",  // Fails IsNotEmpty & Length
    email: "not-an-email",  // Fails IsEmail
    loginCount: -1 // Fails Min(0)
  });
} catch (error) {
  // error likely contains details about validation failures
  console.error("Validation failed:", error);
}

// This will succeed
const user = await userRepo.create({
  name: "John Doe",
  email: "john@example.com",
  loginCount: 10
});
```

### Advanced Querying

Datastash provides a powerful query interface using a fluent API.

```typescript
import { ComparisonOperator, SortDirection } from "datastash";

const userRepo = Stash.getRepository(User, UserDataDto);

// Querying nested fields using where and orderBy with paths
const activeUsers = await userRepo
  .query()
  .where("data.loginCount", ComparisonOperator.GreaterThan, 5) // Use where with path
  .orderBy("data.name", SortDirection.Ascending) // Use orderBy with path
  .getResults();

// Compound queries
const recentHighLoginUsers = await userRepo
  .query()
  .where("data.loginCount", ComparisonOperator.GreaterThanOrEqual, 100) // Use Enum
  .orderBy("createdAt", SortDirection.Descending) // Use Enum for metadata field
  .limit(50)
  .getResults();

// Querying array fields
// Assuming UserDataDto has `tags: string[]`
const taggedUsers = await userRepo
  .query()
  .where("data.tags", ComparisonOperator.ArrayContains, "admin")
  .getResults();
```

## Entity Decorators

Datastash provides a set of decorators to define entity structure and persistence behavior:

### Entity Definition

```typescript
// Using Collection decorator (automatically adds standard entity fields)
@Collection({ name: "users" })
class User {
  id!: string; // Automatically configured with @ID()
  createdAt!: Date; // Automatically configured with @CreatedAt()
  updatedAt!: Date; // Automatically configured with @UpdatedAt()

  @Field()
  name!: string;
}

// You can also use individual decorators if needed
@Collection({ name: "products" })
class Product {
  // These decorators are applied automatically by @Collection
  // but you can explicitly apply them if needed for custom field names
  @ID()
  productId!: string;

  @CreatedAt()
  created!: Date;

  @UpdatedAt()
  modified!: Date;

  @Field()
  title!: string;
}
```

### Hierarchical Data Modeling

```typescript
// Parent entity
@Collection({ name: "users" })
class User {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  name!: string;
}

// Child entity (subcollection)
@Subcollection({
  name: "posts",
  parent: User,
  parentField: "userId"
})
class Post {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  title!: string;

  @Field()
  content!: string;

  @Field()
  userId!: string; // Reference to parent
}
```

### Field Customization

```typescript
@Collection({ name: "products" })
class Product {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field({
    transformer: {
      toDatabaseFormat: (price: number) => price.toString(),
      fromDatabaseFormat: (value: string | any) =>
        typeof value === "string" ? parseFloat(value) : value,
    }
  })
  price!: number;

  @Field({
    transformer: {
      toDatabaseFormat: (tags: string[]) => tags.join(","),
      fromDatabaseFormat: (value: string | any) =>
        typeof value === "string" ? value.split(",") : value,
    }
  })
  tags!: string[];
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
