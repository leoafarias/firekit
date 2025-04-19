import { IQueryBuilder, QueryOperator, SortDirection } from "../../interfaces";

/**
 * File system query builder implementation.
 * Provides filtering, sorting, and limiting capabilities for file-based data.
 * Since data is loaded from files into memory for querying, the implementation
 * is very similar to InMemoryQueryBuilder.
 */
export class FileSystemQueryBuilder<T> implements IQueryBuilder<T> {
  /**
   * Array of filter functions to apply to query results.
   */
  private filters: ((entity: T) => boolean)[] = [];

  /**
   * Array of sorter functions to apply to query results.
   */
  private sorters: ((a: T, b: T) => number)[] = [];

  /**
   * Maximum number of results to return or null for no limit.
   */
  private limitCount: number | null = null;

  /**
   * Creates a file system query builder instance.
   * @param dataSource - Async function that returns the current data source array
   */
  constructor(private readonly dataSource: () => Promise<T[]>) {}

  /**
   * Add a filter condition to the query.
   * @param field - The field to filter on
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns The query builder instance for chaining
   */
  where(field: string, operator: QueryOperator, value: any): this {
    // Create a filter function based on the operator
    const filterFn = (entity: T): boolean => {
      const fieldPath = field.split(".");
      let fieldValue = entity as any;

      // Support nested paths like "user.address.city"
      for (const key of fieldPath) {
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        fieldValue = fieldValue[key];
      }

      return this._compareValues(fieldValue, operator, value);
    };

    // Add the filter to the chain
    this.filters.push(filterFn);

    return this;
  }

  /**
   * Add an ordering clause to the query.
   * @param field - The field to order by
   * @param direction - Sort direction, defaults to "asc"
   * @returns The query builder instance for chaining
   */
  orderBy(field: string, direction: SortDirection = "asc"): this {
    // Create a sorter function
    const sorter = (a: T, b: T): number => {
      const fieldPath = field.split(".");
      let valueA: any = a;
      let valueB: any = b;

      // Support nested paths like "user.address.city"
      for (const key of fieldPath) {
        if (valueA === null || valueA === undefined) {
          return direction === "asc" ? -1 : 1;
        }
        if (valueB === null || valueB === undefined) {
          return direction === "asc" ? 1 : -1;
        }
        valueA = valueA[key];
        valueB = valueB[key];
      }

      // Handle nulls and undefined
      if (valueA === null || valueA === undefined) {
        return direction === "asc" ? -1 : 1;
      }
      if (valueB === null || valueB === undefined) {
        return direction === "asc" ? 1 : -1;
      }

      // Compare the values
      if (valueA < valueB) {
        return direction === "asc" ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    };

    // Add the sorter to the chain
    this.sorters.push(sorter);

    return this;
  }

  /**
   * Limit the number of results returned.
   * @param count - Maximum number of results
   * @returns The query builder instance for chaining
   */
  limit(count: number): this {
    if (count < 0) {
      throw new Error("Limit count must be a positive number");
    }

    this.limitCount = count;

    return this;
  }

  /**
   * Execute the query and get results.
   * @returns Promise resolving to query results
   */
  async getResults(): Promise<T[]> {
    // Get the current data from the source
    let results = await this.dataSource();

    // Apply all filters
    for (const filter of this.filters) {
      results = results.filter(filter);
    }

    // Apply all sorters
    for (const sorter of this.sorters) {
      results = [...results].sort(sorter);
    }

    // Apply limit if specified
    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    return results;
  }

  /**
   * Compare values using the specified operator.
   * @private
   * @param fieldValue - Field value from the entity
   * @param operator - Comparison operator
   * @param queryValue - Value to compare against
   * @returns True if the comparison is satisfied, false otherwise
   */
  private _compareValues(
    fieldValue: any,
    operator: QueryOperator,
    queryValue: any
  ): boolean {
    switch (operator) {
      case "==":
        return fieldValue === queryValue;
      case "!=":
        return fieldValue !== queryValue;
      case "<":
        return fieldValue < queryValue;
      case "<=":
        return fieldValue <= queryValue;
      case ">":
        return fieldValue > queryValue;
      case ">=":
        return fieldValue >= queryValue;
      case "array-contains":
        return Array.isArray(fieldValue) && fieldValue.includes(queryValue);
      case "in":
        return Array.isArray(queryValue) && queryValue.includes(fieldValue);
      case "not-in":
        return Array.isArray(queryValue) && !queryValue.includes(fieldValue);
      case "array-contains-any":
        return (
          Array.isArray(fieldValue) &&
          Array.isArray(queryValue) &&
          fieldValue.some((v) => queryValue.includes(v))
        );
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
}
