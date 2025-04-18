# ID Generator Implementation Summary

## Overview

The ID generator system allows adapters to provide custom ID generation strategies for entities. This makes the system more flexible and allows for different ID formats based on the adapter's needs.

## Components Implemented

1. **IIdGenerator Interface**

   - Defined a simple interface with a `generateId()` method
   - Allows for both synchronous and asynchronous ID generation
   - Located at `repokit/src/interfaces/id-generator.interface.ts`

2. **UuidGenerator Implementation**

   - Default implementation using UUID v4
   - Provides a consistent strategy across adapters
   - Located at `repokit/src/utils/id-generators/uuid.generator.ts`

3. **DatabaseAdapter Interface Extension**

   - Added optional `getIdGenerator()` method
   - Preserves backward compatibility for existing adapters
   - Updated documentation for implementers

4. **AbstractRepository Integration**

   - Modified `create()` method to use adapter's ID generator when available
   - Maintained backward compatibility with default UUID generation
   - Added type safety and error handling

5. **InMemoryAdapter Integration**

   - Added default UuidGenerator implementation
   - Implemented `getIdGenerator()` method
   - Added `setIdGenerator()` method for runtime customization

6. **Testing**
   - Created a SequentialIdGenerator for testing
   - Added tests for default behavior, custom generators, and runtime switching
   - Verified that manually provided IDs take precedence

## Usage Examples

### Basic Usage (Default UUID)

```typescript
// Create adapter with default UUID generation
const adapter = new InMemoryAdapter();
await Repokit.connect(adapter);

// Repository will use UUID v4 for new entities
const repository = Repokit.getRepository(User);
const user = await repository.create({ name: "John" });
// user.id will be a UUID v4 string
```

### Custom Generator

```typescript
// Create custom ID generator
class SequentialIdGenerator implements IIdGenerator {
  private currentId = 0;
  generateId(): string {
    return (++this.currentId).toString();
  }
}

// Set custom generator on adapter
const adapter = new InMemoryAdapter();
adapter.setIdGenerator(new SequentialIdGenerator());
await Repokit.connect(adapter);

// Repository will use sequential IDs
const repository = Repokit.getRepository(User);
const user1 = await repository.create({ name: "Alice" });
const user2 = await repository.create({ name: "Bob" });
// user1.id will be "1"
// user2.id will be "2"
```

### Providing Custom IDs

```typescript
// Custom IDs always take precedence
const repository = Repokit.getRepository(User);

// Use a specific ID
const user = await repository.create(
  { name: "Custom ID User" },
  "custom-id-123"
);
// user.id will be "custom-id-123"
```

## Future Extensions

Potential future ID generators could include:

1. **TimestampIdGenerator** - IDs based on timestamps for chronological ordering
2. **PrefixedIdGenerator** - IDs with configurable prefixes for entity type identification
3. **FirestoreIdGenerator** - Integration with Firestore's ID generation
4. **SnowflakeIdGenerator** - Twitter's Snowflake algorithm for distributed systems

These can be implemented by creating new classes that implement the `IIdGenerator` interface.
