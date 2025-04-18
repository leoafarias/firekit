import { ClassType } from "class-transformer-validator";
import { validate, ValidatorOptions } from "class-validator";
import { v4 as uuidv4 } from "uuid";
import { getCollectionName } from "../decorators";
import { IBatchProcessor, IQueryBuilder, IRepository } from "../interfaces";
import {
  EntityWithData,
  FieldsOnly,
  PartialFields,
} from "../models/entity.model";
import { FieldMetadata, getFieldsMetadata } from "../utils/metadata.utils";

/**
 * Abstract repository base class implementing the IRepository interface
 * Provides common functionality for all adapter implementations
 */
export abstract class AbstractRepository<T extends object>
  implements IRepository<T>
{
  protected readonly entityClass: ClassType<T>;
  protected readonly collectionName: string;
  protected readonly fields: FieldMetadata[];

  /**
   * Creates a new repository instance
   * @param entityClass - The entity class constructor
   * @param dbContext - Database context (adapter-specific)
   * @throws Error if the entity class is not properly decorated
   */
  constructor(entityClass: ClassType<T>, protected readonly dbContext: any) {
    this.entityClass = entityClass;

    // Get collection metadata
    this.collectionName = getCollectionName(entityClass) || "";
    if (!this.collectionName) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection`
      );
    }

    // Get field metadata
    this.fields = getFieldsMetadata(entityClass) || [];
  }

  /**
   * Create a new entity
   * @param data - Entity data
   * @param id - Optional custom ID (auto-generated if not provided)
   * @returns Promise that resolves to the created entity
   * @throws Error if validation fails
   */
  async create(data: FieldsOnly<T>, id?: string): Promise<EntityWithData<T>> {
    // Validate data
    const validatedData = await this.validateData(data);

    // Convert entity to database format
    const dbData = this._toDatabaseFormat(validatedData);

    // Generate ID if not provided
    let entityId: string;
    if (id) {
      entityId = id;
    } else {
      // Use adapter's ID generator if available, otherwise fallback to UUID
      if (
        this.dbContext.getIdGenerator &&
        typeof this.dbContext.getIdGenerator === "function"
      ) {
        entityId = await this.dbContext.getIdGenerator().generateId();
      } else {
        entityId = uuidv4();
      }
    }

    // Call adapter-specific implementation
    const {
      id: resultId,
      createTime,
      updateTime,
    } = await this._save(entityId, dbData);

    // Convert database data to entity format
    return this._fromDatabaseFormat(
      dbData,
      resultId,
      createTime || new Date(),
      updateTime || new Date()
    );
  }

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Promise resolving to entity or null if not found
   */
  async findById(id: string): Promise<EntityWithData<T> | null> {
    if (!id) {
      throw new Error("ID must be provided");
    }

    // Call adapter-specific implementation
    const dbData = await this._findById(id);

    // Return null if not found
    if (!dbData) {
      return null;
    }

    // Convert database data to entity format
    const metadata = await this._getMetadata(id);
    return this._fromDatabaseFormat(
      dbData,
      id,
      metadata?.createTime,
      metadata?.updateTime
    );
  }

  /**
   * Get an entity by ID, throwing an error if not found
   * @param id - Entity ID
   * @returns Promise resolving to the entity
   * @throws Error if entity not found
   */
  async getById(id: string): Promise<EntityWithData<T>> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(
        `Entity with ID ${id} not found in collection ${this.collectionName}`
      );
    }
    return entity;
  }

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Promise resolving to the updated entity
   * @throws Error if entity not found or validation fails
   */
  async update(id: string, data: PartialFields<T>): Promise<EntityWithData<T>> {
    if (!id) {
      throw new Error("ID must be provided");
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error("Update data cannot be empty");
    }

    // Check if entity exists
    const exists = await this._exists(id);
    if (!exists) {
      throw new Error(
        `Entity with ID ${id} not found in collection ${this.collectionName}`
      );
    }

    // Convert entity to database format - cast to any to avoid type issues
    const dbData = this._toDatabaseFormat(data as any);

    // Call adapter-specific implementation
    const { updateTime } = await this._update(id, dbData);

    // Get the updated entity
    const updatedData = await this._findById(id);
    if (!updatedData) {
      throw new Error(`Entity with ID ${id} not found after update`);
    }

    // Convert database data to entity format
    const metadata = await this._getMetadata(id);
    return this._fromDatabaseFormat(
      updatedData,
      id,
      metadata?.createTime,
      updateTime || new Date()
    );
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

    // Call adapter-specific implementation
    await this._delete(id);
  }

  /**
   * Find all entities in the collection
   * @returns Promise resolving to array of entities
   */
  async findAll(): Promise<Array<EntityWithData<T>>> {
    // Get all entities from the database
    const results = await this._findAll();

    // Convert database data to entity format
    return Promise.all(
      results.map(async (result) => {
        const metadata = await this._getMetadata(result.id);
        return this._fromDatabaseFormat(
          result.data,
          result.id,
          metadata?.createTime,
          metadata?.updateTime
        );
      })
    );
  }

  /**
   * Create a query builder for advanced queries
   * @returns Query builder instance
   */
  abstract query(): IQueryBuilder<EntityWithData<T>>;

  /**
   * Create a batch processor for batch operations
   * @returns Batch processor instance
   */
  abstract batch(): IBatchProcessor;

  /**
   * Convert entity data to database format
   * @param entity - Entity or partial entity data
   * @returns Database format data
   */
  protected _toDatabaseFormat(
    entity: Record<string, any>
  ): Record<string, any> {
    const data: Record<string, any> = {};

    // Add fields
    this.fields.forEach((field) => {
      const propKey = field.propertyKey.toString();
      if (propKey in entity) {
        let value = entity[propKey];

        // Apply custom transformers
        if (
          field.options.transformer &&
          field.options.transformer.toDatabaseFormat
        ) {
          value = field.options.transformer.toDatabaseFormat(value);
        }

        // Set field value in data
        data[propKey] = value;
      }
    });

    return data;
  }

  /**
   * Convert database data to entity format
   * @param dbData - Database data
   * @param id - Entity ID
   * @param createTime - Creation timestamp
   * @param updateTime - Update timestamp
   * @returns Entity instance
   */
  protected _fromDatabaseFormat(
    dbData: Record<string, any>,
    id: string,
    createTime?: Date,
    updateTime?: Date
  ): EntityWithData<T> {
    // Apply transformers to database data
    const transformedData: Record<string, any> = { ...dbData };

    this.fields.forEach((field) => {
      const propKey = field.propertyKey.toString();
      if (propKey in dbData) {
        let value = dbData[propKey];

        // Apply custom transformers
        if (
          field.options.transformer &&
          field.options.transformer.fromDatabaseFormat
        ) {
          value = field.options.transformer.fromDatabaseFormat(value);
        }

        transformedData[propKey] = value;
      }
    });

    // Create entity instance
    const entity = Object.assign({}, transformedData) as unknown as T;

    // Add entity metadata
    return {
      ...entity,
      id,
      createdAt: createTime || new Date(),
      updatedAt: updateTime || new Date(),
    };
  }

  /**
   * Validate entity data
   * @param data - Entity data to validate
   * @param options - Validation options
   * @returns Validated data
   * @throws Error if validation fails
   */
  protected async validateData(
    data: any,
    options: ValidatorOptions = {
      skipMissingProperties: true,
      forbidUnknownValues: false,
    }
  ): Promise<any> {
    // Create instance of entity class with the data
    const entityInstance = Object.assign(new this.entityClass(), data);

    // Validate the instance
    const errors = await validate(entityInstance, options);

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
    }

    return entityInstance;
  }

  /**
   * Check if an entity exists
   * @param id - Entity ID
   * @returns Promise resolving to true if entity exists, false otherwise
   */
  protected async _exists(id: string): Promise<boolean> {
    const data = await this._findById(id);
    return !!data;
  }

  /**
   * Get entity metadata
   * @param id - Entity ID
   * @returns Promise resolving to entity metadata or undefined if not found
   */
  protected async _getMetadata(
    id: string
  ): Promise<{ createTime?: Date; updateTime?: Date } | undefined> {
    // By default, return undefined - adapters can override to provide actual metadata
    return undefined;
  }

  /**
   * Find all entities in the collection
   * @returns Promise resolving to array of entities with their IDs
   */
  protected abstract _findAll(): Promise<
    Array<{ id: string; data: Record<string, any> }>
  >;

  /**
   * Save an entity to the database
   * @param id - Entity ID
   * @param data - Entity data
   * @returns Promise resolving to the saved entity ID and timestamps
   */
  protected abstract _save(
    id: string | null,
    data: Record<string, any>
  ): Promise<{ id: string; createTime?: Date; updateTime?: Date }>;

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Promise resolving to entity data or null if not found
   */
  protected abstract _findById(id: string): Promise<Record<string, any> | null>;

  /**
   * Update an entity
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Promise resolving to update timestamp
   */
  protected abstract _update(
    id: string,
    data: Record<string, any>
  ): Promise<{ updateTime?: Date }>;

  /**
   * Delete an entity
   * @param id - Entity ID
   * @returns Promise resolving when entity is deleted
   */
  protected abstract _delete(id: string): Promise<void>;
}
