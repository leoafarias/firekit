/**
 * Query operator type for database queries
 */
export type QueryOperator =
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

/**
 * Sort direction for query results
 */
export type SortDirection = "asc" | "desc";

/**
 * Query builder interface for constructing database queries
 */
export interface IQueryBuilder<T> {
  /**
   * Add a filter condition to the query
   * @param field - The field to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns The query builder instance for chaining
   */
  where(field: string, operator: QueryOperator, value: any): this;

  /**
   * Add an ordering clause to the query
   * @param field - The field to order by
   * @param direction - Sort direction, defaults to "asc"
   * @returns The query builder instance for chaining
   */
  orderBy(field: string, direction?: SortDirection): this;

  /**
   * Limit the number of results returned
   * @param count - Maximum number of results
   * @returns The query builder instance for chaining
   */
  limit(count: number): this;

  /**
   * Execute the query and get results
   * @returns Promise resolving to query results
   */
  getResults(): Promise<T[]>;
}

/**
 * Batch processor interface for batch operations
 */
export interface IBatchProcessor {
  /**
   * Add a create operation to the batch
   * @param entityClass - Entity class
   * @param data - Entity data
   * @param id - Optional custom ID
   */
  create<T extends object>(entityClass: any, data: any, id?: string): void;

  /**
   * Add an update operation to the batch
   * @param entityClass - Entity class
   * @param id - Entity ID
   * @param data - Entity data to update
   */
  update<T extends object>(
    entityClass: any,
    id: string,
    data: Partial<T>
  ): void;

  /**
   * Add a delete operation to the batch
   * @param entityClass - Entity class
   * @param id - Entity ID
   */
  delete(entityClass: any, id: string): void;

  /**
   * Commit the batch operations
   * @returns Promise resolving when the batch is committed
   */
  commit(): Promise<void>;
}
