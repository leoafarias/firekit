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
 * Type for creating a new entity - excludes repository-managed fields.
 * T represents the entity's data type.
 */
export type Creatable<T extends Entity> = Omit<
  T,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

/**
 * Interface for updating an entity - partial version of the data
 * T represents the entity's data type
 */
export type Updatable<T extends Entity> = Partial<T>;
