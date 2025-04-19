# TypeScript Style Guide for Repokit/Firekit

This document outlines coding conventions and style guidelines for the Repokit and Firekit projects.

## Table of Contents

1. [File and Folder Structure](#file-and-folder-structure)
2. [Naming Conventions](#naming-conventions)
3. [Code Formatting](#code-formatting)
4. [TypeScript Specifics](#typescript-specifics)
5. [Comments and Documentation](#comments-and-documentation)
6. [Imports and Exports](#imports-and-exports)
7. [Classes and Interfaces](#classes-and-interfaces)
8. [Decorators](#decorators)
9. [Error Handling](#error-handling)
10. [Type Safety](#type-safety)
11. [Testing](#testing)

## File and Folder Structure

- **File Organization**: Use clear, domain-focused file and directory names
  - Group related functionality in the same directory
  - Each module should have a clear, single responsibility
- **Directory Structure**:
  ```
  repokit/
    ├── src/
    │   ├── interfaces/
    │   ├── models/
    │   ├── decorators/
    │   ├── repository/
    │   ├── adapters/
    │   │   └── memory/
    │   └── utils/
    └── ... (other project files)
  ```
- **Index Files**: Use `index.ts` files to re-export public APIs from a directory
- **File Naming**: Use kebab-case for filenames (e.g., `entity.model.ts`, `base.repository.ts`)
- **File Suffixes**: Use descriptive suffixes to indicate file type:
  - `.model.ts` for data models
  - `.repository.ts` for repositories
  - `.decorator.ts` for decorators
  - `.interface.ts` for interfaces
  - `.utils.ts` for utility functions

## Naming Conventions

- **Classes**: Use PascalCase for class names (e.g., `EntityRepository`, `InMemoryAdapter`)
- **Interfaces**: Use PascalCase with `I` prefix (e.g., `IRepository`, `IDatabaseAdapter`)
- **Type Aliases**: Use PascalCase without prefix (e.g., `Entity`, `FieldsOnly`)
- **Variables and Parameters**: Use camelCase (e.g., `entityClass`, `collectionName`)
- **Private/Protected Properties**: Use camelCase with no prefix (e.g., `collectionRef`, `entityClass`)
- **Constants**: Use UPPER_SNAKE_CASE for symbolic constants (e.g., `FIELDS_KEY`, `COLLECTION_KEY`)
- **Enums**: Use PascalCase for enum names, and PascalCase for enum values
- **Generic Type Parameters**: Use descriptive PascalCase, typically starting with `T` for primary types (e.g., `T`, `TKey`, `TEntity`)
- **Boolean Variables**: Prefix with verbs like "is", "has", "should" (e.g., `isConnected`, `hasFields`)

## Code Formatting

- **Indentation**: Use 2 spaces for indentation
- **Line Length**: Aim for a maximum of 80 characters per line, but up to 100 is acceptable
- **Semicolons**: Use semicolons at the end of statements
- **Quotes**: Use double quotes (`"`) for strings
- **Trailing Commas**: Use trailing commas in multiline object and array literals
- **Braces**:
  - Opening braces on the same line (Kernighan & Ritchie style)
  - Always use braces for control statements, even for single-line blocks
- **Function Spacing**:

  ```typescript
  // Good
  function example(param1: string, param2: number): void {
    // code
  }

  // Bad
  function example(param1: string, param2: number): void {
    // code
  }
  ```

- **Horizontal Spacing**:
  - Space after keywords (`if`, `for`, `while`, etc.)
  - Space around operators (`+`, `-`, `=`, etc.)
  - No space between function name and opening parenthesis
  - Space after commas in lists

## TypeScript Specifics

- **Type Annotations**:
  - Include type annotations for function parameters and return types
  - Omit type annotations when they can be inferred clearly
  - Use explicit `any` only when absolutely necessary and document the reason
- **Readonly**: Use `readonly` for properties that should not be modified after initialization
- **Optional Properties**: Use the optional property syntax (`?`) for truly optional properties
- **Union Types**: Use union types instead of overloaded functions when appropriate
- **Type Guards**: Use type guards for narrowing types
- **Type vs Interface**:
  - Use `interface` for public APIs that consumers will implement
  - Use `type` for complex types, unions, and when you need exact types
- **Generics**: Use generics to create reusable, type-safe components
  ```typescript
  // Good
  export class Repository<T extends object> {
    // ...
  }
  ```
- **Mapped Types**: Use mapped types for transforming types (like `FieldsOnly<T>`, `PartialFields<T>`)

## Comments and Documentation

- **JSDoc Comments**: Use JSDoc style comments for all public API elements
  ````typescript
  /**
   * Description of what the function does
   * @param paramName - Description of parameter
   * @returns Description of the return value
   * @throws Conditions that might cause an error
   *
   * @example
   * ```typescript
   * // Example code showing how to use the function
   * ```
   */
  ````
- **TODOs**: Mark incomplete code with `TODO:` comments including ownership/ticket reference
- **Internal Comments**: Use regular `//` for implementation details
- **Comment Blocks**: Place comments on a separate line above the code they reference
- **Self-Documenting Code**: Prefer readable code over excessive comments
- **Inline Comments**: Use sparingly, only when necessary to explain complex logic

## Imports and Exports

- **Import Groups**: Organize imports in groups, separated by blank lines:
  1. External libraries
  2. Internal modules/local imports (relative paths)
  3. Types and interfaces
- **Import Style**: Use named imports whenever possible

  ```typescript
  // Good
  import { ClassType } from "class-transformer-validator";

  // Avoid except when needed
  import * as xyz from "xyz";
  ```

- **Export Style**: Use named exports rather than default exports
- **Re-exports**: Use explicit re-exports in index files

  ```typescript
  // Good
  export { Collection, getCollectionName } from "./collection.decorator";

  // Not recommended
  export * from "./collection.decorator";
  ```

## Classes and Interfaces

- **Class Structure**: Organize class members in the following order:
  1. Static properties and methods
  2. Instance properties
  3. Constructor
  4. Public methods
  5. Protected methods
  6. Private methods
- **Interface Structure**: Group related properties and methods together
- **Property Initializers**: Use property initializers or constructor for initialization
- **Method Organization**: Group methods by functionality
- **Abstract Classes**: Use abstract classes to share code between implementations

  ```typescript
  abstract class AbstractRepository<T> implements IRepository<T> {
    // Common implementation

    // Abstract methods that concrete classes must implement
    protected abstract _save(
      id: string | null,
      data: Record<string, any>
    ): Promise<any>;
  }
  ```

## Decorators

- **Decorator Functions**: Name decorator factory functions using PascalCase
  ```typescript
  export function Collection(collectionName: string): ClassDecorator {
    // ...
  }
  ```
- **Decorator Implementation**: Use clear helper functions for decorator implementation
  ```typescript
  function decorateCollection(target: any) {
    // Implementation
  }
  ```
- **Reflect Metadata**: Use `reflect-metadata` consistently for storing metadata
- **Documentation**: Document all decorators with JSDoc including examples

## Error Handling

- **Error Types**: Throw specific error types rather than generic errors
- **Error Messages**: Use clear, descriptive error messages

  ```typescript
  // Good
  throw new Error(
    `Class ${entityClass.name} is not decorated with @Collection`
  );

  // Bad
  throw new Error("Invalid class");
  ```

- **Async/Await**: Prefer async/await over direct Promise handling
- **Try/Catch**: Use try/catch blocks for error handling where appropriate
  ```typescript
  try {
    // Code that might throw
  } catch (error) {
    // Handle the error or rethrow with more context
    throw new Error(`Operation failed: ${error.message}`);
  }
  ```

## Type Safety

- **Avoid Type Assertions**: Minimize the use of type assertions (`as` keyword)
- **Null Checking**: Use null/undefined checking with optional chaining and nullish coalescing

  ```typescript
  // Good
  const value = entity?.property ?? defaultValue;

  // Instead of
  const value = entity && entity.property ? entity.property : defaultValue;
  ```

- **Type Predicates**: Use type predicates for runtime type checking
  ```typescript
  function isEntity<T>(value: any): value is Entity<T> {
    return (
      value &&
      typeof value === "object" &&
      "id" in value &&
      "createdAt" in value &&
      "updatedAt" in value
    );
  }
  ```
- **Unknown vs Any**: Prefer `unknown` over `any` when the type is not known

## Testing

- **Test Files**: Name test files with `.test.ts` or `.spec.ts` suffix
- **Test Structure**: Use describe/it pattern for organizing tests
  ```typescript
  describe("Repository", () => {
    describe("create", () => {
      it("should create an entity with the given data", async () => {
        // Test code
      });
    });
  });
  ```
- **Mocking**: Use dependency injection to make code testable
- **Test Coverage**: Aim for high test coverage, especially for core functionality
- **Edge Cases**: Test edge cases and error handling
