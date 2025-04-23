import { Creatable, Entity, Updatable } from "./entity.interface";

import { IQueryBuilder } from "./query.interface";

/**
 * Repository interface for entity operations
 */
export interface IRepository<E extends Entity> {
  /**
   * Create a new entity
   * @param data - Entity data
   * @param id - Optional custom ID
   * @returns Created entity with metadata
   */
  create(data: Creatable<E>, id?: string): Promise<E>;

  /**
   * Find an entity by ID
   * @param id - Entity ID
   * @returns Entity if found, null otherwise
   */
  findById(id: string): Promise<E | null>;

  /**
   * Get an entity by ID, throwing an error if not found
   * @param id - Entity ID
   * @returns Entity
   * @throws Error if entity not found
   */
  getById(id: string): Promise<E>;

  /**
   * Update an existing entity
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Updated entity
   */
  update(id: string, data: Updatable<E>): Promise<E>;

  /**
   * Delete an entity
   * @param id - Entity ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find all entities
   * @returns Array of entities
   */
  findAll(): Promise<E[]>;

  /**
   * Create a query builder for advanced queries
   * @returns Query builder
   */
  query(): IQueryBuilder<E>;
}
