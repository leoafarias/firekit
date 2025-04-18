# Firekit Adapter Pattern Implementation Checklist

## Phase 0: Project Preparation

- [x] 0.1. Create a new branch for adapter implementation
- [ ] 0.2. Review existing code to identify all Firebase/Firestore dependencies:
  - [ ] 0.2.1. Scan all imports for `firebase-admin`, `firebase-admin/firestore`
  - [ ] 0.2.2. Identify all direct uses of Firestore types like `CollectionReference`, `DocumentReference`, etc.
  - [ ] 0.2.3. Note all uses of `getFirestore()` and `initializeFirebase()`
- [ ] 0.3. Run existing tests to ensure they pass before changes
- [x] 0.4. Create new `repokit` directory at the root level to contain the abstraction layer
- [ ] 0.5. Backup critical files that will be heavily modified

## Phase 1: Core Interface Definitions in Repokit

- [x] 1.1. Create core interfaces directory/file:
  - [x] 1.1.1. Create `repokit/src/interfaces/index.ts`
- [x] 1.2. Define `IDatabaseAdapter` interface:
  ```typescript
  interface IDatabaseAdapter {
    connect(options?: any): Promise<void>;
    disconnect(): Promise<void>;
    getRepository<T extends object>(entityClass: ClassType<T>): IRepository<T>;
  }
  ```
- [x] 1.3. Define `IRepository<T>` interface:
  ```typescript
  interface IRepository<T extends object> {
    create(data: FieldsOnly<T>, id?: string): Promise<Entity<T>>;
    findById(id: string): Promise<Entity<T> | null>;
    getById(id: string): Promise<Entity<T>>;
    update(id: string, data: PartialFields<T>): Promise<Entity<T>>;
    delete(id: string): Promise<void>;
    findAll(): Promise<Entity<T>[]>; // Optional - depends if currently used
    query(): IQueryBuilder<Entity<T>>;
    batch(): IBatchProcessor;
  }
  ```
- [x] 1.4. Define query-related interfaces:
  - [x] 1.4.1. Define `QueryOperator` type (compatible with Firestore)
    ```typescript
    type QueryOperator =
      | "<"
      | "<="
      | "=="
      | ">="
      | ">"
      | "!="
      | "array-contains"
      | "in"
      | "not-in"
      | "array-contains-any";
    ```
  - [x] 1.4.2. Define `IQueryBuilder<T>` interface
    ```typescript
    interface IQueryBuilder<T> {
      where(field: keyof T & string, operator: QueryOperator, value: any): this;
      orderBy(field: keyof T & string, direction?: "asc" | "desc"): this;
      limit(count: number): this;
      getResults(): Promise<T[]>;
    }
    ```
- [x] 1.5. Define `IBatchProcessor` interface:
  ```typescript
  interface IBatchProcessor {
    create<T extends object>(
      entityClass: ClassType<T>,
      data: FieldsOnly<T>,
      id?: string
    ): void;
    update<T extends object>(
      entityClass: ClassType<T>,
      id: string,
      data: PartialFields<T>
    ): void;
    delete(entityClass: ClassType<any>, id: string): void;
    commit(): Promise<void>;
  }
  ```
- [x] 1.6. Create base model and helper types in Repokit:

  - [x] 1.6.1. Create `repokit/src/models/entity.model.ts` with core Entity interface:

    ```typescript
    export interface Entity<T> {
      id: string;
      createdAt: Date;
      updatedAt: Date;
    } & T;

    export type FieldsOnly<T> = Omit<T, keyof Entity<any>>;
    export type PartialFields<T> = Partial<FieldsOnly<T>>;
    ```

  - [x] 1.6.2. Create `repokit/src/utils/metadata.utils.ts` for metadata handling:

    ```typescript
    export interface FieldMetadata {
      propertyKey: string | symbol;
      options: {
        transformer?: {
          toDatabaseFormat?: (value: any) => any;
          fromDatabaseFormat?: (value: any) => any;
        };
        // other field options
      };
    }

    export const FIELDS_KEY = Symbol("fields");
    ```

  - [x] 1.6.3. Define additional helper types and utilities required

## Phase 2: Central Repokit Class Implementation

- [x] 2.1. Create `repokit/src/repokit.ts` static class:

  ```typescript
  export class Repokit {
    private static adapter: IDatabaseAdapter | null = null;

    public static async connect(
      adapter: IDatabaseAdapter,
      options?: any
    ): Promise<void> {
      /* ... */
    }
    public static async disconnect(): Promise<void> {
      /* ... */
    }
    public static getRepository<T extends object>(
      entityClass: ClassType<T>
    ): IRepository<T> {
      /* ... */
    }
    public static isConnected(): boolean {
      /* ... */
    }
  }
  ```

- [x] 2.2. Implement connect method with validation
- [x] 2.3. Implement disconnect method with cleanup
- [x] 2.4. Implement getRepository method delegating to adapter
- [x] 2.5. Implement isConnected utility method
- [x] 2.6. Add proper error handling for common failure scenarios

## Phase 3: Abstract Repository Base Class in Repokit

- [x] 3.1. Create `repokit/src/repository/base.repository.ts`:

  ```typescript
  export abstract class AbstractRepository<T extends object>
    implements IRepository<T>
  {
    constructor(
      protected readonly entityClass: ClassType<T>,
      protected readonly dbContext: any,
      protected readonly collectionName: string,
      protected readonly fields: FieldMetadata[]
    ) {
      /* ... */
    }

    // IRepository implementation
    async create(data: FieldsOnly<T>, id?: string): Promise<Entity<T>> {
      /* ... */
    }
    async findById(id: string): Promise<Entity<T> | null> {
      /* ... */
    }
    async getById(id: string): Promise<Entity<T>> {
      /* ... */
    }
    async update(id: string, data: PartialFields<T>): Promise<Entity<T>> {
      /* ... */
    }
    async delete(id: string): Promise<void> {
      /* ... */
    }
    abstract query(): IQueryBuilder<Entity<T>>;
    abstract batch(): IBatchProcessor;

    // Helper methods
    protected _toDatabaseFormat(
      entityData: PartialFields<T>
    ): Record<string, any> {
      /* ... */
    }
    protected _fromDatabaseFormat(
      dbData: Record<string, any>,
      id: string,
      createTime?: Date,
      updateTime?: Date
    ): Entity<T> {
      /* ... */
    }

    // Abstract methods for adapter-specific implementations
    protected abstract _save(
      id: string | null,
      data: Record<string, any>
    ): Promise<{ id: string; createTime?: Date; updateTime?: Date }>;
    protected abstract _findById(
      id: string
    ): Promise<Record<string, any> | null>;
    protected abstract _update(
      id: string,
      data: Record<string, any>
    ): Promise<{ updateTime?: Date }>;
    protected abstract _delete(id: string): Promise<void>;
  }
  ```

- [x] 3.2. Implement validation and transformation logic:
  - [x] 3.2.1. Implement `create()` with validation and transformation calls
  - [x] 3.2.2. Implement `update()` with validation and transformation calls
  - [x] 3.2.3. Implement `findById()` delegating to `_findById` with transformation
  - [x] 3.2.4. Implement `getById()` with appropriate error handling
  - [x] 3.2.5. Implement `delete()` delegating to `_delete`
- [x] 3.3. Implement data transformation helper methods:
  - [x] 3.3.1. Implement `_toDatabaseFormat()` with field iteration and custom transformers
  - [x] 3.3.2. Implement `_fromDatabaseFormat()` with field iteration, custom transformers
- [x] 3.4. Add proper error handling, input validation, and logging

## Phase 4: Basic Decorator System in Repokit

- [x] 4.1. Create `repokit/src/decorators/index.ts`:

  ```typescript
  export function Collection(options: { name: string }): ClassDecorator {
    return function (target: any) {
      Reflect.defineMetadata("collectionName", options.name, target);
    };
  }

  export function Field(
    options: {
      transformer?: {
        toDatabaseFormat?: (value: any) => any;
        fromDatabaseFormat?: (value: any) => any;
      };
    } = {}
  ): PropertyDecorator {
    return function (target: any, propertyKey: string | symbol) {
      const fields: FieldMetadata[] =
        Reflect.getMetadata(FIELDS_KEY, target.constructor) || [];
      fields.push({ propertyKey, options });
      Reflect.defineMetadata(FIELDS_KEY, fields, target.constructor);
    };
  }

  export function getCollectionName(
    entityClass: ClassType<any>
  ): string | undefined {
    return Reflect.getMetadata("collectionName", entityClass);
  }
  ```

- [x] 4.2. Implement and test decorator functionality
- [x] 4.3. Create utilities for metadata retrieval and handling

## Phase 5: In-Memory Adapter Implementation in Repokit

- [x] 5.1. Create `repokit/src/adapters/memory/in-memory.adapter.ts`:

  ```typescript
  export class InMemoryAdapter implements IDatabaseAdapter {
    private dbStore: { [collectionName: string]: Map<string, any> } = {};

    async connect(options?: {
      initialData?: Record<string, Record<string, any>>;
    }): Promise<void> {
      /* ... */
    }
    async disconnect(): Promise<void> {
      /* ... */
    }
    getRepository<T extends object>(entityClass: ClassType<T>): IRepository<T> {
      /* ... */
    }
  }
  ```

- [x] 5.2. Implement simple connection with potential initial data
- [x] 5.3. Create `repokit/src/adapters/memory/in-memory.repository.ts`:

  ```typescript
  export class InMemoryRepository<
    T extends object
  > extends AbstractRepository<T> {
    private collection: Map<string, any>;

    constructor(entityClass: ClassType<T>, collection: Map<string, any>) {
      // Get metadata, call super()
      // Store collection map
    }

    // Implement abstract methods
    protected async _save(
      id: string | null,
      data: Record<string, any>
    ): Promise<{ id: string; createTime?: Date; updateTime?: Date }> {
      /* ... */
    }
    protected async _findById(id: string): Promise<Record<string, any> | null> {
      /* ... */
    }
    protected async _update(
      id: string,
      data: Record<string, any>
    ): Promise<{ updateTime?: Date }> {
      /* ... */
    }
    protected async _delete(id: string): Promise<void> {
      /* ... */
    }

    // Implement repository interface methods that need overrides
    query(): IQueryBuilder<Entity<T>> {
      /* Return InMemoryQueryBuilder */
    }
    batch(): IBatchProcessor {
      /* Return InMemoryBatchProcessor */
    }
  }
  ```

- [x] 5.4. Create `repokit/src/adapters/memory/in-memory.query-builder.ts`:

  ```typescript
  export class InMemoryQueryBuilder<T> implements IQueryBuilder<T> {
    private filters: ((entity: T) => boolean)[] = [];
    private sorters: ((a: T, b: T) => number)[] = [];
    private limitCount: number | null = null;
    private dataSource: () => T[]; // Function to get current data

    constructor(dataSource: () => T[]) {
      this.dataSource = dataSource;
    }

    where(field: keyof T & string, operator: QueryOperator, value: any): this {
      /* ... */
    }
    orderBy(field: keyof T & string, direction: "asc" | "desc" = "asc"): this {
      /* ... */
    }
    limit(count: number): this {
      /* ... */
    }
    async getResults(): Promise<T[]> {
      /* ... */
    }

    private implementOperator(
      operator: QueryOperator
    ): (fieldValue: any, queryValue: any) => boolean {
      /* ... */
    }
  }
  ```

- [x] 5.5. Create `repokit/src/adapters/memory/in-memory.batch-processor.ts`:

  ```typescript
  export interface BatchOperation {
    type: "create" | "update" | "delete";
    entityClass: ClassType<any>;
    id?: string;
    data?: any;
  }

  export class InMemoryBatchProcessor implements IBatchProcessor {
    private operations: BatchOperation[] = [];
    private dbStore: { [collectionName: string]: Map<string, any> };

    constructor(dbStore: { [collectionName: string]: Map<string, any> }) {
      this.dbStore = dbStore;
    }

    create<T extends object>(
      entityClass: ClassType<T>,
      data: FieldsOnly<T>,
      id?: string
    ): void {
      /* ... */
    }
    update<T extends object>(
      entityClass: ClassType<T>,
      id: string,
      data: PartialFields<T>
    ): void {
      /* ... */
    }
    delete(entityClass: ClassType<any>, id: string): void {
      /* ... */
    }
    async commit(): Promise<void> {
      /* ... */
    }

    private getCollectionFor(entityClass: ClassType<any>): Map<string, any> {
      /* ... */
    }
    private rollback(
      operations: BatchOperation[],
      originals: Map<string, any | null>
    ): void {
      /* ... */
    }
  }
  ```

- [x] 5.6. Implement robust rollback logic for batch operations
- [x] 5.7. Create module exports in `repokit/src/index.ts`

## Phase 6: Repokit Package Configuration

- [x] 6.1. Create `repokit/package.json`:
  ```json
  {
    "name": "repokit",
    "version": "0.1.0",
    "description": "Generic repository pattern implementation with pluggable adapters",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "test": "jest"
    },
    "dependencies": {
      "class-transformer": "^0.5.1",
      "class-transformer-validator": "^0.9.1",
      "class-validator": "^0.14.0",
      "reflect-metadata": "^0.1.13",
      "uuid": "^9.0.0"
    },
    "peerDependencies": {},
    "devDependencies": {
      "@types/jest": "^29.5.0",
      "@types/node": "^18.15.0",
      "@types/uuid": "^9.0.0",
      "jest": "^29.5.0",
      "ts-jest": "^29.1.0",
      "typescript": "^5.0.0"
    }
  }
  ```
- [x] 6.2. Create `repokit/tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "es2020",
      "module": "commonjs",
      "declaration": true,
      "outDir": "./dist",
      "strict": true,
      "esModuleInterop": true,
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "**/*.test.ts"]
  }
  ```
- [x] 6.3. Create `repokit/jest.config.js` for testing
- [x] 6.4. Add necessary `README.md` and other package files

## Phase 7: Unit Testing for Repokit

- [ ] 7.1. Create basic unit tests for core components:
  - [ ] 7.1.1. Test `Repokit` static class methods
  - [ ] 7.1.2. Test `AbstractRepository` with a mock implementation
  - [ ] 7.1.3. Test `InMemoryAdapter` and components for correct behavior
  - [ ] 7.1.4. Test decorators functionality
- [ ] 7.2. Create integration tests for the in-memory implementation:
  - [ ] 7.2.1. Test full CRUD flow with `InMemoryAdapter`
  - [ ] 7.2.2. Test querying capability
  - [ ] 7.2.3. Test batch operations including rollbacks

## Phase 8: Implementation for Firekit Integration (Future Development)

- [ ] 8.1. Create a separate adapter package for Firestore (outside the scope of initial implementation):
  - [ ] 8.1.1. Define package structure for `firekit-firestore-adapter`
  - [ ] 8.1.2. Create adapter implementation with dependencies on both `repokit` and `firebase-admin`
- [ ] 8.2. Refactor existing `EntityRepository` to use Repokit:
  - [ ] 8.2.1. Decide migration strategy (extend Repokit's classes vs. create bridge/compatibility layer)
  - [ ] 8.2.2. Create guidance for migrating existing code to the new architecture
- [ ] 8.3. Define the relationship between Firekit and Repokit going forward:
  - [ ] 8.3.1. Determine if Firekit becomes a thin wrapper around Repokit + Firestore adapter
  - [ ] 8.3.2. Consider if they remain separate packages with explicit dependencies

## Phase 9: Documentation & Examples

- [ ] 9.1. Create `repokit/README.md`:
  - [ ] 9.1.1. Explain adapter pattern and available adapters
  - [ ] 9.1.2. Document setup procedure and initialization
  - [ ] 9.1.3. Provide examples for repository usage
- [ ] 9.2. Document specific adapters:
  - [ ] 9.2.1. Document `InMemoryAdapter` features, limitations, and usage for testing
  - [ ] 9.2.2. Outline requirements for creating new adapters
- [ ] 9.3. Update JSDoc comments:
  - [ ] 9.3.1. Ensure all interfaces have proper JSDoc documentation
  - [ ] 9.3.2. Document limitations of certain operations in specific adapters
  - [ ] 9.3.3. Add `@example` sections to show usage patterns
- [ ] 9.4. Create example files in `repokit/examples`:
  - [ ] 9.4.1. Basic setup and usage example
  - [ ] 9.4.2. Query building examples
  - [ ] 9.4.3. Batch operation examples
  - [ ] 9.4.4. Testing with in-memory adapter example

## Phase 10: Final Review & Publish

- [ ] 10.1. Code review:
  - [ ] 10.1.1. Review all implemented interfaces for consistency
  - [ ] 10.1.2. Check error handling in all components
  - [ ] 10.1.3. Verify type safety across the codebase
- [ ] 10.2. Performance review:
  - [ ] 10.2.1. Identify potential memory issues in in-memory adapter
  - [ ] 10.2.2. Review performance implications of the abstraction pattern
- [ ] 10.3. Final clean-up:
  - [ ] 10.3.1. Ensure code style is consistent
  - [ ] 10.3.2. Remove any debug or temporary code
  - [ ] 10.3.3. Final check of all exported APIs
- [ ] 10.4. Version and release:
  - [ ] 10.4.1. Update version number according to semantic versioning
  - [ ] 10.4.2. Create release notes
  - [ ] 10.4.3. Publish package locally or to npm
  - [ ] 10.4.4. Add as a dependency to Firekit

## Phase 11: Future Extensions (Optional)

- [ ] 11.1. Design and implement `LocalJsonAdapter` for persistent local storage
- [ ] 11.2. Explore TypeORM adapter for SQL database support
- [ ] 11.3. Consider S3 or other cloud storage adapters
- [ ] 11.4. Design pattern for handling subcollections across different backends
- [ ] 11.5. Implement optional real-time update interface for supporting adapters

## Phase 12: Implementation Validation _(New Phase)_

- [ ] 12.1. Architecture validation:
  - [ ] 12.1.1. Verify that interfaces are properly defined with clear contracts
  - [ ] 12.1.2. Ensure proper separation of concerns between adapters and repositories
  - [ ] 12.1.3. Validate that the adapter pattern is correctly implemented
  - [ ] 12.1.4. Check for any tight coupling that should be avoided
- [ ] 12.2. Code quality validation:
  - [ ] 12.2.1. Ensure consistent error handling across all components
  - [ ] 12.2.2. Verify that all public APIs have proper JSDoc documentation
  - [ ] 12.2.3. Check that type safety is maintained throughout the codebase
  - [ ] 12.2.4. Verify that decorators work correctly with TypeScript's reflection metadata
- [ ] 12.3. Implementation completeness validation:
  - [ ] 12.3.1. Verify that all planned interfaces are implemented
  - [ ] 12.3.2. Ensure that the InMemoryAdapter fully supports all specified operations
  - [ ] 12.3.3. Validate that query operations work as expected with different operators
  - [ ] 12.3.4. Check that batch operations handle transactions and rollbacks correctly
- [ ] 12.4. Integration validation:
  - [ ] 12.4.1. Create a sample entity and test full CRUD operations through Repokit
  - [ ] 12.4.2. Test complex queries and verify correct results
  - [ ] 12.4.3. Validate batch operations across multiple collections
  - [ ] 12.4.4. Check compatibility with existing Firekit decorators
- [ ] 12.5. Performance validation:
  - [ ] 12.5.1. Check memory usage patterns in the in-memory adapter
  - [ ] 12.5.2. Ensure efficient handling of large datasets in queries
  - [ ] 12.5.3. Validate that transformations don't cause performance bottlenecks
  - [ ] 12.5.4. Benchmark basic operations to establish performance baselines
