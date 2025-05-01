import { instanceToPlain, plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { v4 as uuidv4 } from "uuid";
import { getCollectionName } from "../decorators";
import { getSubcollectionMetadata } from "../decorators/subcollection.decorator";
import { Creatable, Ref, Updatable } from "../interfaces/entity.interface";
import { IQueryBuilder } from "../interfaces/query.interface";
import { IRepository } from "../interfaces/repository.interface";
import { Stash } from "../stash";
import { ClassType } from "../utils/class.type";

/**
 * Abstract repository base class implementing the IRepository interface.
 * Works with domain entity types and returns Ref<T> objects.
 */
export abstract class AbstractRepository<T> implements IRepository<T> {
  protected readonly entityClass: ClassType<T>;
  protected readonly collectionName: string;

  /**
   * Creates a new repository instance
   * @param entityClass - The domain entity class constructor
   * @throws Error if the entity class is not properly decorated
   */
  constructor(entityClass: ClassType<T>) {
    this.entityClass = entityClass;

    // Get collection metadata
    const collectionName = getCollectionName(entityClass);
    const subcollectionMeta = getSubcollectionMetadata(entityClass);

    if (collectionName) {
      this.collectionName = collectionName;
    } else if (subcollectionMeta) {
      this.collectionName = subcollectionMeta.name;
    } else {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection or @Subcollection`
      );
    }
  }

  /**
   * Create a new entity from plain data object
   * @param data - Domain entity data
   * @param id - Optional custom ID
   * @returns Promise resolving to a reference object containing the domain entity and metadata
   * @throws Error if validation fails
   */
  async create(data: Creatable<T>, id?: string): Promise<Ref<T>> {
    // 1. Transform input data to Entity instance
    // Use entityClass directly, no separate DTO class needed
    const entityInstance = plainToInstance(this.entityClass, data);

    // 2. Validate Entity instance
    // Validation now happens on the whole entity object
    const errors = await validate(entityInstance as object);
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    // 3. Convert validated Entity to database format
    // _toDatabaseFormat now expects the entity instance
    const dbData = this._toDatabaseFormat(entityInstance);

    // 4. Generate ID (logic remains the same)
    let entityId = id;
    if (!entityId) {
      const adapter = Stash.getAdapter();
      if (adapter && "getIdGenerator" in adapter) {
        const generator = adapter.getIdGenerator?.();
        if (generator) {
          entityId = await Promise.resolve(generator.generateId());
        }
      }
      entityId ??= uuidv4();
    }

    // 5. Call adapter-specific save
    // _save now handles the full entity data (Record<string, unknown>)
    const {
      id: resultId,
      createTime,
      updateTime,
    } = await this._save(entityId, dbData);

    // 6. Fetch the created data to ensure consistency
    const savedDbData = await this._findById(resultId);
    if (!savedDbData) {
      throw new Error(
        `Failed to fetch entity with ID ${resultId} after creation.`
      );
    }

    // 7. Convert database data to domain entity
    const domainEntity = this._fromDatabaseFormat(savedDbData);

    // 8. Return as Ref<T>
    return {
      id: resultId,
      createdAt: createTime ?? new Date(),
      updatedAt: updateTime ?? new Date(),
      deletedAt: null,
      data: domainEntity,
    };
  }

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Promise resolving to a reference object or null if not found
   */
  async findById(id: string): Promise<Ref<T> | null> {
    if (!id) {
      throw new Error("ID must be provided");
    }

    // _findById returns the raw data for the full entity
    const dbData = await this._findById(id);
    if (!dbData) {
      return null;
    }

    // Fetch metadata
    const metadata = await this._getMetadata(id);

    // Convert to domain entity
    const domainEntity = this._fromDatabaseFormat(dbData);

    // Return as Ref<T>
    return {
      id,
      createdAt: metadata?.createTime ?? new Date(),
      updatedAt: metadata?.updateTime ?? new Date(),
      deletedAt: null,
      data: domainEntity,
    };
  }

  /**
   * Get an entity by ID, throwing an error if not found
   * @param id - Entity ID
   * @returns Promise resolving to a reference object
   * @throws Error if entity not found
   */
  async getById(id: string): Promise<Ref<T>> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(
        `Entity with ID ${id} not found in collection ${this.collectionName}`
      );
    }
    return entity;
  }

  /**
   * Update an existing entity from a data object
   * @param id - Entity ID
   * @param data - Partial domain entity data to update
   * @returns Promise resolving to a reference object with the updated domain entity
   * @throws Error if entity not found or validation fails
   */
  async update(id: string, data: Updatable<T>): Promise<Ref<T>> {
    if (!id) {
      throw new Error("ID must be provided");
    }
    if (!data || Object.keys(data).length === 0) {
      throw new Error("Update data cannot be empty");
    }

    // 1. Check if entity exists (logic remains)
    const exists = await this._exists(id);
    if (!exists) {
      throw new Error(
        `Entity with ID ${id} not found in collection ${this.collectionName}`
      );
    }

    // 2. Transform input data to Entity instance (Partial)
    // Use entityClass directly
    const partialEntityInstance = plainToInstance(this.entityClass, data);

    // 3. Validate Partial Entity instance
    const errors = await validate(partialEntityInstance as object, {
      skipMissingProperties: true, // Important for partial updates
      whitelist: true,
      // forbidNonWhitelisted: true, // Consider if needed
    });
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    // 4. Convert validated partial entity to database format
    // _toDatabaseFormat now expects Partial<E>
    const dbData = this._toDatabaseFormat(partialEntityInstance);

    // 5. Call adapter-specific update
    const { updateTime } = await this._update(id, dbData);

    // 6. Fetch the updated entity data
    const updatedDbData = await this._findById(id);
    if (!updatedDbData) {
      throw new Error(`Entity with ID ${id} not found after update.`);
    }

    // 7. Convert database data to domain entity
    const metadata = await this._getMetadata(id);
    const domainEntity = this._fromDatabaseFormat(updatedDbData);

    // 8. Return as Ref<T>
    return {
      id,
      createdAt: metadata?.createTime ?? new Date(),
      updatedAt: updateTime ?? new Date(),
      deletedAt: null,
      data: domainEntity,
    };
  }

  /**
   * Delete an entity
   * @param id - Entity ID
   * @returns Promise resolving when the entity is deleted
   * @throws Error if entity not found
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new Error("ID must be provided");
    }
    // _delete assumes the full entity is targeted
    await this._delete(id);
  }

  /**
   * Find all entities in the collection
   * @returns Promise resolving to array of reference objects
   */
  async findAll(): Promise<Ref<T>[]> {
    // _findAll returns raw data for all entities
    const results = await this._findAll();

    // Map results to Ref<T> objects
    return Promise.all(
      results.map(async (result) => {
        const metadata = await this._getMetadata(result.id);
        const domainEntity = this._fromDatabaseFormat(result.data);

        // Return as Ref<T>
        return {
          id: result.id,
          createdAt: metadata?.createTime ?? new Date(),
          updatedAt: metadata?.updateTime ?? new Date(),
          deletedAt: null,
          data: domainEntity,
        };
      })
    );
  }

  /**
   * Create a query builder for advanced queries
   * @returns Query builder instance
   */
  abstract query(): IQueryBuilder<T>;

  /**
   * Convert domain entity instance (or partial) to database format (plain object).
   * Adapters can override this for specific database needs (e.g., Date -> Timestamp).
   * @param entityInstance - The validated domain entity instance (T or Partial<T>)
   * @returns Database format data (plain object)
   */
  protected _toDatabaseFormat(
    entityInstance: T | Partial<T>
  ): Record<string, unknown> {
    // Convert Entity instance to a plain object using class-transformer rules
    const plain = instanceToPlain(entityInstance);
    // Adapters might add further transformations (e.g., Date -> Timestamp)
    return plain;
  }

  /**
   * Convert database data (plain object) to a domain entity instance (T).
   * @param dbData - Database data (plain object representing the entity)
   * @returns Domain entity instance (T)
   */
  protected _fromDatabaseFormat(dbData: Record<string, unknown>): T {
    // Adapters might perform initial transformations here (e.g., Timestamp -> Date)

    // Transform plain data to the domain entity instance
    // We don't include metadata fields (id, createdAt, etc.) in the domain entity
    const entityInstance = plainToInstance(this.entityClass, dbData, {
      // excludeExtraneousValues: true, // Enable if using @Expose exclusively
    });

    return entityInstance;
  }

  /**
   * Check if an entity exists
   * @param id - Entity ID
   * @returns Promise resolving to true if entity exists, false otherwise
   */
  protected async _exists(id: string): Promise<boolean> {
    // _findById returns the raw data for the full entity
    const data = await this._findById(id);
    return !!data;
  }

  /**
   * Get entity metadata (timestamps)
   * Adapters MUST implement this if they don't store metadata alongside main data.
   * @param id - Entity ID
   * @returns Promise resolving to entity metadata or undefined if not found
   */
  protected abstract _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined>;

  // --- Abstract methods for adapter implementation ---
  // These methods now deal with Record<string, unknown> representing the *entire* entity data

  /**
   * Find all entities in the collection (adapter implementation).
   * Should return raw data for each entity.
   * @returns Promise resolving to array of raw entity data with IDs
   */
  protected abstract _findAll(): Promise<
    { id: string; data: Record<string, unknown> }[]
  >;

  /**
   * Save an entity to the database (adapter implementation).
   * Should handle storing the full entity data.
   * @param id - Entity ID to use
   * @param data - Raw entity data (Record<string, unknown>)
   * @returns Promise resolving to the saved entity ID and timestamps
   */
  protected abstract _save(
    id: string,
    data: Record<string, unknown>
  ): Promise<{ id: string; createTime?: Date; updateTime?: Date }>;

  /**
   * Find an entity by ID (adapter implementation).
   * Should return the raw data for the entity.
   * @param id - Entity ID
   * @returns Promise resolving to raw entity data or null if not found
   */
  protected abstract _findById(
    id: string
  ): Promise<Record<string, unknown> | null>;

  /**
   * Update an entity (adapter implementation).
   * Should handle updating parts of the raw entity data.
   * @param id - Entity ID
   * @param data - Raw partial entity data to update (Record<string, unknown>)
   * @returns Promise resolving to the effective update timestamp
   */
  protected abstract _update(
    id: string,
    data: Record<string, unknown>
  ): Promise<{ updateTime?: Date }>;

  /**
   * Delete an entity (adapter implementation).
   * @param id - Entity ID
   * @returns Promise resolving when entity is deleted
   */
  protected abstract _delete(id: string): Promise<void>;
}
