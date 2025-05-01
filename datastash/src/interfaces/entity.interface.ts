/**
 * Generic entity interface representing a database entity with metadata
 */
export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Reference interface that extends Entity and adds a data property
 * T represents the domain entity type
 */
export interface Ref<T> extends Entity {
  data: T;
}

/**
 * Type for creating a new entity - now represents just the domain data
 * T represents the domain entity type
 */
export type Creatable<T> = T;

/**
 * Interface for updating an entity - partial version of the domain data
 * T represents the domain entity type
 */
export type Updatable<T> = Partial<T>;
