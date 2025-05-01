import { Ref } from "../../interfaces/entity.interface";
import {
  ComparisonOperator,
  IQueryBuilder,
  QueryOptions,
  SortDirection,
} from "../../interfaces/query.interface";
import { deepClone } from "../../utils/helpers";

// Update internal storage entry definition to match InMemoryRepository
interface InMemoryStorageEntry {
  entityData: Record<string, unknown>;
  createTime: Date;
  updateTime: Date;
  id: string;
}

/**
 * In-memory query builder implementation.
 * Allows querying and filtering in-memory data stored in a Map.
 */
export class InMemoryQueryBuilder<T> implements IQueryBuilder<T> {
  // Keep QueryOptions internal
  protected options: QueryOptions = {
    conditions: [],
    skip: 0,
    limit: 10,
    sort: [],
  };

  /**
   * Creates an in-memory query builder.
   * @param collection - Collection name.
   * @param storage - The Map containing the full entity data and metadata.
   * @param transformer - Function to convert raw DB data to the final entity T.
   * @param options - Initial query options.
   */
  constructor(
    protected collection: string,
    private storage: ReadonlyMap<string, InMemoryStorageEntry>,
    private transformer: (dbData: Record<string, unknown>) => T,
    options?: Partial<QueryOptions>
  ) {
    // Initialize options directly
    this.options = { ...this.options, ...options };
  }

  // --- Public IQueryBuilder Methods ---

  where<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    operator: ComparisonOperator,
    value: unknown
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const fieldStr = String(fieldOrPath);
    (clone as InMemoryQueryBuilder<T>).options.conditions.push({
      field: fieldStr,
      operator,
      value,
    });
    return clone;
  }

  // wherePath method removed (deprecated)

  limit(limit: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as InMemoryQueryBuilder<T>).options.limit = limit;
    return clone;
  }

  skip(skip: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as InMemoryQueryBuilder<T>).options.skip = skip;
    return clone;
  }

  orderBy<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    direction: SortDirection = SortDirection.Ascending
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const baseClone = clone as InMemoryQueryBuilder<T>;
    const fieldStr = String(fieldOrPath);
    baseClone.options.sort = baseClone.options.sort ?? [];
    baseClone.options.sort.push({
      field: fieldStr,
      direction,
    });
    return clone;
  }

  async count(): Promise<number> {
    let count = 0;
    for (const entry of this.storage.values()) {
      // Evaluate conditions against entityData
      if (this.evaluateConditions(entry.entityData)) {
        count++;
      }
    }
    const skipCount = this.options.skip ?? 0;
    const limitCount = this.options.limit ?? Infinity;
    const finalCount = Math.max(0, count - skipCount);
    return Promise.resolve(Math.min(finalCount, limitCount));
  }

  getQueryOptions(): QueryOptions {
    return { ...this.options };
  }

  clone(): IQueryBuilder<T> {
    const clonedOptions = deepClone(this.options);
    return new InMemoryQueryBuilder<T>(
      this.collection,
      this.storage,
      this.transformer,
      clonedOptions
    );
  }

  async getResults(): Promise<Ref<T>[]> {
    const results = this.executeQuery();
    // Transform final results using the stored transformer
    const transformedResults = results.map((entry) => {
      // Transform the entity data to domain entity
      const domainEntity = this.transformer(entry.entityData);

      // Return as Ref<T>
      return {
        id: entry.id,
        createdAt: entry.createTime,
        updatedAt: entry.updateTime,
        deletedAt: null,
        data: domainEntity,
      };
    });
    return Promise.resolve(transformedResults);
  }

  // --- Internal Query Execution Logic ---

  /**
   * Execute the query with all filters, sorting, and pagination.
   * Returns the filtered/sorted entries *before* transformation.
   */
  private executeQuery(): InMemoryStorageEntry[] {
    const filteredEntries: InMemoryStorageEntry[] = [];

    // Filter data based on conditions
    this.storage.forEach((entry) => {
      // Evaluate against entityData
      if (this.evaluateConditions(entry.entityData)) {
        filteredEntries.push(entry);
      }
    });

    let result = filteredEntries;

    // Apply sorting
    if (this.options.sort && this.options.sort.length > 0) {
      result = this.applySorting(result);
    }

    // Apply pagination
    const skipCount = this.options.skip ?? 0;
    const limitCount = this.options.limit ?? Infinity; // Use Infinity for no limit

    // Ensure skip doesn't exceed array length
    const startIndex = Math.min(skipCount, result.length);
    // Calculate end index based on limit
    const endIndex = Math.min(startIndex + limitCount, result.length);

    return result.slice(startIndex, endIndex);
  }

  /**
   * Evaluate all conditions against an entity's plain data.
   * @param entityData Plain entity data object (Record<string, unknown>)
   */
  private evaluateConditions(entityData: Record<string, unknown>): boolean {
    if (!this.options.conditions || this.options.conditions.length === 0) {
      return true;
    }
    return this.options.conditions.every((condition) =>
      this.evaluateCondition(entityData, condition)
    );
  }

  /**
   * Evaluate a single condition against an entity's plain data.
   */
  private evaluateCondition(
    entityData: Record<string, unknown>,
    condition: {
      field: string;
      operator: ComparisonOperator;
      value: unknown;
    }
  ): boolean {
    const { field, operator, value } = condition;
    // Use helper to get value from entityData
    const fieldValue: unknown = this._getInMemoryValue(entityData, field);

    // Comparison logic remains the same
    switch (operator) {
      case ComparisonOperator.Equals:
        return this.compareValues(fieldValue, value) === 0;
      case ComparisonOperator.NotEquals:
        return this.compareValues(fieldValue, value) !== 0;
      case ComparisonOperator.GreaterThan:
        return this.compareValues(fieldValue, value) > 0;
      case ComparisonOperator.GreaterThanOrEqual:
        return this.compareValues(fieldValue, value) >= 0;
      case ComparisonOperator.LessThan:
        return this.compareValues(fieldValue, value) < 0;
      case ComparisonOperator.LessThanOrEqual:
        return this.compareValues(fieldValue, value) <= 0;
      case ComparisonOperator.In:
        return (
          Array.isArray(value) &&
          value.some((v) => this.compareValues(fieldValue, v) === 0)
        );
      case ComparisonOperator.NotIn:
        return (
          Array.isArray(value) &&
          !value.some((v) => this.compareValues(fieldValue, v) === 0)
        );
      case ComparisonOperator.ArrayContains:
        return (
          Array.isArray(fieldValue) &&
          fieldValue.some((item) => this.compareValues(item, value) === 0)
        );
      case ComparisonOperator.ArrayContainsAny:
        return (
          Array.isArray(fieldValue) &&
          Array.isArray(value) &&
          fieldValue.some((item) =>
            value.some((v) => this.compareValues(item, v) === 0)
          )
        );
      default:
        // Cast operator to string to satisfy linter in unreachable case
        console.warn(`Unsupported operator: ${String(operator)}`);
        return false;
    }
  }

  /**
   * Apply sorting to query results (entries before transformation).
   */
  private applySorting(data: InMemoryStorageEntry[]): InMemoryStorageEntry[] {
    if (!this.options.sort || this.options.sort.length === 0) {
      return data;
    }
    // Sort copy of the array
    return [...data].sort((a, b) => {
      for (const sort of this.options.sort!) {
        // Non-null assertion safe due to check above
        // Get value directly from entityData
        const aValue: unknown = this._getInMemoryValue(
          a.entityData,
          sort.field
        );
        const bValue: unknown = this._getInMemoryValue(
          b.entityData,
          sort.field
        );

        const result = this.compareValues(aValue, bValue);
        if (result !== 0) {
          return sort.direction === SortDirection.Ascending ? result : -result;
        }
      }
      return 0;
    });
  }

  /**
   * Safely gets a value from an object using a dot-notation path.
   * @param target The object to extract the value from (now expecting entityData).
   * @param path The dot-notation path string (e.g., "data.name", "data.address.city").
   * @returns The value found at the path, or undefined.
   */
  private _getInMemoryValue(
    target: Record<string, unknown>,
    path: string
  ): unknown {
    // Handle direct metadata fields (id, createdAt, updatedAt)
    if (
      path === "id" ||
      path === "createdAt" ||
      path === "updatedAt" ||
      path === "deletedAt"
    ) {
      return target[path];
    }

    // Handle nested paths within the entity data
    const keys = path.split(".");
    let current: unknown = target;

    // If the path starts with "data.", we need to handle it specially
    if (keys[0] === "data") {
      // Skip the "data" part and continue with the rest of the path
      keys.shift();
    }

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        return undefined;
      }
      if (!(key in current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  /**
   * Compare two values for sorting and filtering.
   * (Copied from BaseQueryBuilder or similar - ensure consistency)
   */
  private compareValues(a: unknown, b: unknown): number {
    if (a === undefined || a === null)
      return b === undefined || b === null ? 0 : -1;
    if (b === undefined || b === null) return 1;
    if (a instanceof Date && b instanceof Date)
      return a.getTime() - b.getTime();
    if (typeof a === "string" && typeof b === "string")
      return a.localeCompare(b);
    if (typeof a === "number" && typeof b === "number") return a - b;
    // Explicit boolean comparison (true > false)
    if (typeof a === "boolean" && typeof b === "boolean") {
      if (a === b) return 0;
      return a ? 1 : -1; // true is 1, false is -1
    }
    // Fallback for objects/mixed types (consider if JSON comparison is needed)
    try {
      const jsonA = JSON.stringify(a);
      const jsonB = JSON.stringify(b);
      return jsonA.localeCompare(jsonB);
    } catch {
      return String(typeof a).localeCompare(String(typeof b)); // Type comparison as last resort
    }
  }
}
