import { Entity } from "../models/entity.model";
import { IBatchProcessor, IQueryBuilder } from "./query.interface";

/**
 * Database adapter interface for connecting to different database backends
 */
export interface IDatabaseAdapter {
  /**
   * Connect to the database
   * @param options - Connection options (adapter-specific)
   */
  connect(options?: any): Promise<void>;

  /**
   * Disconnect from the database
   */
  disconnect(): Promise<void>;

  /**
   * Get a repository for the specified entity class
   * @param entityClass - Entity class
   * @returns Repository for the entity
   */
  getRepository<T extends object>(entityClass: any): IRepository<T>;

  /**
   * Check if the adapter is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean;
}

/**
 * Repository interface for entity operations
 */
export interface IRepository<T extends object> {
  /**
   * Create a new entity
   * @param data - Entity data
   * @param id - Optional custom ID
   * @returns Created entity with metadata
   */
  create(data: any, id?: string): Promise<Entity<T> & T>;

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Entity if found, null otherwise
   */
  findById(id: string): Promise<(Entity<T> & T) | null>;

  /**
   * Get an entity by ID, throwing an error if not found
   * @param id - Entity ID
   * @returns Entity
   * @throws Error if entity not found
   */
  getById(id: string): Promise<Entity<T> & T>;

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Updated entity
   */
  update(id: string, data: Partial<T>): Promise<Entity<T> & T>;

  /**
   * Delete an entity
   * @param id - Entity ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all entities
   * @returns Array of entities
   */
  findAll(): Promise<Array<Entity<T> & T>>;

  /**
   * Create a query builder for advanced queries
   * @returns Query builder
   */
  query(): IQueryBuilder<Entity<T> & T>;

  /**
   * Create a batch processor for batch operations
   * @returns Batch processor
   */
  batch(): IBatchProcessor;
}
