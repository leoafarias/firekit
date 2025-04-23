import { Get } from "type-fest";

/**
 * Helper type to get the type of a value at a specific path
 */
export type PathForGet<T, P> = P extends string ? Get<T, P> : unknown;

/**
 * Helper type for matching value types to operators
 */
export type TypeForOperator<T, O> = O extends
  | ComparisonOperator.In
  | ComparisonOperator.NotIn
  ? T[]
  : O extends ComparisonOperator.ArrayContainsAny
  ? unknown[]
  : O extends ComparisonOperator.ArrayContains
  ? unknown
  : T;

/**
 * Available comparison operators natively supported by Firestore
 */
export enum ComparisonOperator {
  /** Checks if field value equals the specified value */
  Equals = "==",
  /** Checks if field value does not equal the specified value */
  NotEquals = "!=",
  /** Checks if field value is greater than the specified value */
  GreaterThan = ">",
  /** Checks if field value is greater than or equal to the specified value */
  GreaterThanOrEqual = ">=",
  /** Checks if field value is less than the specified value */
  LessThan = "<",
  /** Checks if field value is less than or equal to the specified value */
  LessThanOrEqual = "<=",
  /** Checks if field value is in the specified array of values */
  In = "in",
  /** Checks if field value is not in the specified array of values */
  NotIn = "not-in",
  /** Checks if array field contains the specified value */
  ArrayContains = "array-contains",
  /** Checks if array field contains any of the specified values */
  ArrayContainsAny = "array-contains-any",
}

/**
 * Sort direction options
 */
export enum SortDirection {
  Ascending = "asc",
  Descending = "desc",
}

/**
 * Simple query condition with generic value type
 */
export interface QueryCondition<V = unknown> {
  field: string;
  operator: ComparisonOperator;
  value: V;
}

/**
 * Sort specification
 */
export interface SortSpec {
  field: string;
  direction: SortDirection;
}

/**
 * Query options for pagination, sorting, and filters
 */
export interface QueryOptions {
  conditions: QueryCondition[];
  skip?: number;
  limit?: number;
  sort?: SortSpec[];
}

/**
 * Type-safe query builder interface
 */
export interface IQueryBuilder<T> {
  /**
   * Add a where condition on a direct field or nested path with type safety
   * @param fieldOrPath - Field name or path with dot notation (e.g., 'profile.address.city')
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Query builder for chaining
   */
  where<K extends keyof T & string>(
    fieldOrPath: K,
    operator: ComparisonOperator,
    value: T[K]
  ): IQueryBuilder<T>;

  where<P extends string>(
    fieldOrPath: P,
    operator: ComparisonOperator.In | ComparisonOperator.NotIn,
    value: unknown[]
  ): IQueryBuilder<T>;

  where<P extends string>(
    fieldOrPath: P,
    operator: ComparisonOperator.ArrayContains,
    value: unknown
  ): IQueryBuilder<T>;

  where<P extends string>(
    fieldOrPath: P,
    operator: ComparisonOperator.ArrayContainsAny,
    value: unknown[]
  ): IQueryBuilder<T>;

  where<P extends string>(
    fieldOrPath: P,
    operator: ComparisonOperator,
    value: unknown
  ): IQueryBuilder<T>;

  /**
   * Limit the number of results returned
   * @param limit - Maximum number of results
   * @returns Query builder for chaining
   */
  limit(limit: number): IQueryBuilder<T>;

  /**
   * Skip a number of results (for pagination)
   * @param skip - Number of results to skip
   * @returns Query builder for chaining
   */
  skip(skip: number): IQueryBuilder<T>;

  /**
   * Add a sort specification for a field or path
   * @param fieldOrPath - Field name or path with dot notation to sort by
   * @param direction - Sort direction
   * @returns Query builder for chaining
   */
  orderBy<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    direction?: SortDirection
  ): IQueryBuilder<T>;

  /**
   * Execute the query and return the count of matching entities
   * @returns Promise resolving to the count
   */
  count(): Promise<number>;

  /**
   * Get the query options for this query
   * @returns The query options object
   */
  getQueryOptions(): QueryOptions;

  /**
   * Create a new query builder with the same configuration
   * @returns A new query builder instance
   */
  clone(): IQueryBuilder<T>;

  /**
   * Execute the query and return all matching entities.
   * @returns Promise resolving to an array of entities.
   */
  getResults(): Promise<T[]>;
}
