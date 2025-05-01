import { Creatable, Ref, Updatable } from "./entity.interface";

import { IQueryBuilder } from "./query.interface";

/**
 * Repository interface for entity operations
 * T represents the domain entity type
 */
export interface IRepository<T> {
  /**
   * Create a new entity
   * @param data - Domain entity data
   * @param id - Optional custom ID
   * @returns Reference object containing domain entity with metadata
   */
  create(data: Creatable<T>, id?: string): Promise<Ref<T>>;

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Reference object if found, null otherwise
   */
  findById(id: string): Promise<Ref<T> | null>;

  /**
   * Get an entity by ID, throwing an error if not found
   * @param id - Entity ID
   * @returns Reference object
   * @throws Error if entity not found
   */
  getById(id: string): Promise<Ref<T>>;

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Domain entity data to update
   * @returns Reference object with updated domain entity
   */
  update(id: string, data: Updatable<T>): Promise<Ref<T>>;

  /**
   * Delete an entity
   * @param id - Entity ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all entities
   * @returns Array of reference objects
   */
  findAll(): Promise<Ref<T>[]>;

  /**
   * Create a query builder for advanced queries
   * @returns Query builder
   */
  query(): IQueryBuilder<T>;
}
