/**
 * Generic entity interface representing a database entity with basic metadata
 * @template T The entity type
 */
export interface Entity<T> {
  /**
   * Unique identifier for the entity
   */
  id: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * Entity with data type combined
 */
export type EntityWithData<T> = Entity<any> & T;

/**
 * Utility type that extracts only the data fields from an entity type,
 * excluding methods, functions, and Entity metadata fields
 */
export type FieldsOnly<T extends object> = {
  [K in keyof T as T[K] extends (...args: any[]) => any
    ? never
    : K extends keyof Entity<any>
    ? never
    : K]: T[K];
};

/**
 * Utility type for partial updates that only includes data fields
 */
export type PartialFields<T extends object> = Partial<FieldsOnly<T>>;
