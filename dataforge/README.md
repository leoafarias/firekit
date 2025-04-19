# Datastash

[![npm version](https://img.shields.io/npm/v/datastash.svg)](https://www.npmjs.com/package/datastash)
[![Build Status](https://github.com/firekit/datastash/workflows/Test/badge.svg)](https://github.com/firekit/datastash/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, efficient repository pattern implementation for TypeScript with pluggable adapters.

## Features

- Clean repository pattern implementation
- Pluggable database adapters (in-memory, Firestore, file system)
- Support for CRUD operations and advanced queries
- Batch operations for atomic updates
- Decorator-based entity definitions
- Comprehensive validation support
- Hierarchical data modeling with collections and subcollections

## Installation

```bash
npm install datastash
```

## Quick Start

```typescript
import { Collection, Field, Stash, InMemoryAdapter } from "datastash";

// Define your entity
@Collection({ name: "users" })
class User {
  // Standard entity fields are automatically added
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;

  @Field()
  name!: string;

  @Field()
  email!: string;
}

// Connect to a database
const adapter = new InMemoryAdapter();
await Stash.connect(adapter);

// Get a repository
const userRepo = Stash.getRepository<User>(User);

// CRUD operations
// Create
const user = await userRepo.create({
  name: "John Doe",
  email: "john@example.com",
});

// Read
const foundUser = await userRepo.findById(user.id);

// Update
await userRepo.update(user.id, { name: "Jane Doe" });

// Delete
await userRepo.delete(user.id);

// Query operations
const users = await userRepo
  .query()
  .where("name", "==", "Jane Doe")
  .orderBy("email", "asc")
  .limit(10)
  .getResults();

// Batch operations
const batch = userRepo.batch();
batch.create(User, { name: "User 1", email: "user1@example.com" });
batch.create(User, { name: "User 2", email: "user2@example.com" });
await batch.commit();
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
   
   // With persistence options
   const adapter = new InMemoryAdapter({
     persistTo: './data.json',  // Save data to file
     loadFrom: './data.json'    // Load initial data from file
   });
   await Stash.connect(adapter);
   ```

2. **FileSystemAdapter** - For local JSON storage
   ```typescript
   import { Stash, FileSystemAdapter } from "datastash";
   
   const adapter = new FileSystemAdapter({
     basePath: './data',  // Directory to store collection files
     prettyPrint: true    // Format JSON files with indentation
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
import { IDatabaseAdapter, IRepository } from "datastash";

class MyCustomAdapter implements IDatabaseAdapter {
  // Implement required methods
  connect(options?: any): Promise<void> {
    // Setup connection to your database
  }
  
  disconnect(): Promise<void> {
    // Close connection
  }
  
  isConnected(): boolean {
    // Check connection status
  }
  
  getRepository<T extends object>(entityClass: any): IRepository<T> {
    // Return a repository implementation for this database
  }
}

// Usage
const adapter = new MyCustomAdapter();
await Stash.connect(adapter, { /* adapter-specific options */ });
```

### Entity Definition and Validation

Datastash fully integrates with class-validator for entity validation.

#### Basic Validation

```typescript
import { IsEmail, IsNotEmpty, Length } from "class-validator";
import { Collection, Field } from "datastash";

@Collection({ name: "users" })
class User {
  id!: string;
  createdAt!: Date;
  updatedAt!: Date;
  
  @Field()
  @IsNotEmpty()
  @Length(2, 50)
  name!: string;
  
  @Field()
  @IsEmail()
  email!: string;
}
```

#### Validation in Action

Validation happens automatically when creating or updating entities:

```typescript
// This will throw a validation error
try {
  await userRepo.create({
    name: "",  // Fails IsNotEmpty
    email: "not-an-email",  // Fails IsEmail
  });
} catch (error) {
  console.error("Validation failed:", error);
}

// This will succeed
const user = await userRepo.create({
  name: "John Doe",
  email: "john@example.com",
});
```

#### Custom Validation Options

You can configure validation behavior by extending the repository:

```typescript
import { AbstractRepository, Stash } from "datastash";

class CustomUserRepository extends AbstractRepository<User> {
  async createWithCustomValidation(data: any) {
    // Override validation options
    const validatedData = await this.validateData(data, {
      skipMissingProperties: true,
      forbidUnknownValues: true,
      validationError: { target: false }
    });
    
    // Use validated data
    return super.create(validatedData);
  }
}

// Usage
const customRepo = new CustomUserRepository(User, Stash.getAdapter());
const user = await customRepo.createWithCustomValidation({ 
  name: "John" 
  // email can be skipped with skipMissingProperties: true
});
```

### Advanced Querying

Datastash provides a powerful query interface:

```typescript
// Basic queries
const activeUsers = await userRepo
  .query()
  .where("status", "==", "active")
  .getResults();

// Compound queries
const recentActiveUsers = await userRepo
  .query()
  .where("status", "==", "active")
  .where("lastLogin", ">", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  .orderBy("lastLogin", "desc")
  .limit(10)
  .getResults();

// Pagination
const page1 = await userRepo
  .query()
  .orderBy("name", "asc")
  .limit(20)
  .getResults();

// Get the next page
const lastUser = page1[page1.length - 1];
const page2 = await userRepo
  .query()
  .orderBy("name", "asc")
  .startAfter(lastUser.name)
  .limit(20)
  .getResults();
```

### Batch Operations

For performing multiple operations atomically:

```typescript
// Create a batch
const batch = userRepo.batch();

// Queue operations
batch.create(User, { name: "User 1", email: "user1@example.com" });
batch.create(User, { name: "User 2", email: "user2@example.com" });

// Update existing entities
batch.update(User, existingUserId, { status: "inactive" });

// Delete entities
batch.delete(User, userToDeleteId);

// Execute all operations
await batch.commit();
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
