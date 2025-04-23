import {
  ComparisonOperator,
  IQueryBuilder,
  PathForGet,
  QueryOptions,
  SortDirection,
} from "../interfaces/query.interface";

/**
 * Base implementation of the query builder
 */
export abstract class BaseQueryBuilder<T extends object>
  implements IQueryBuilder<T>
{
  protected options: QueryOptions = {
    conditions: [],
    skip: 0,
    limit: 10,
    sort: [],
  };

  constructor(protected collection: string, options?: Partial<QueryOptions>) {
    this.options = { ...this.options, ...options };
  }

  where<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    operator: ComparisonOperator,
    value: unknown
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const fieldStr = String(fieldOrPath);
    (clone as BaseQueryBuilder<T>).options.conditions.push({
      field: fieldStr,
      operator,
      value,
    });
    return clone;
  }

  limit(limit: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as BaseQueryBuilder<T>).options.limit = limit;
    return clone;
  }

  skip(skip: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as BaseQueryBuilder<T>).options.skip = skip;
    return clone;
  }

  orderBy<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    direction: SortDirection = SortDirection.Ascending
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const baseClone = clone as BaseQueryBuilder<T>;
    const fieldStr = String(fieldOrPath);
    baseClone.options.sort = baseClone.options.sort ?? [];
    baseClone.options.sort.push({
      field: fieldStr,
      direction: direction,
    });
    return clone;
  }

  /**
   * Execute the query and return the count of matching entities
   * @returns Promise resolving to the count
   */
  abstract count(): Promise<number>;

  /**
   * Execute the query and return the results
   * @returns Promise resolving to the entities
   */
  abstract execute(): Promise<T[]>;

  getQueryOptions(): QueryOptions {
    return { ...this.options };
  }

  /**
   * Create a new query builder with the same configuration
   * @returns A new query builder instance
   */
  abstract clone(): IQueryBuilder<T>;

  /**
   * Helper method to resolve field paths to their values
   * Use for internal implementations
   */
  protected getValueFromPath<P extends string>(
    entity: T,
    path: P
  ): PathForGet<T, P> | undefined {
    const parts = String(path).split(".");

    // Start with the entity
    let current: unknown = entity;

    // Traverse the path
    for (const part of parts) {
      // Check if current is an object or array that can be indexed
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== "object") {
        return undefined;
      }

      // Use type assertion with a more specific type
      // This is still needed but much safer than 'any'
      const indexableObject = current as Record<string, unknown>;
      current = indexableObject[part];
    }

    // Use type assertion only at the end when returning
    return current as PathForGet<T, P> | undefined;
  }

  /**
   * Execute the query and return all matching entities.
   * Must be implemented by concrete query builder classes.
   */
  abstract getResults(): Promise<T[]>;
}
