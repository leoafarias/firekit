import fs from "fs/promises";
import path from "path";
import { Ref } from "../../interfaces/entity.interface";
import {
  ComparisonOperator,
  IQueryBuilder,
  QueryOptions,
  SortDirection,
} from "../../interfaces/query.interface";
import { deepClone } from "../../utils/helpers";

/**
 * FileSystem storage entry with metadata
 */
interface FileSystemStorageEntry {
  data: Record<string, unknown>;
  createTime: Date;
  updateTime: Date;
  id: string;
}

/**
 * Raw entry as stored in JSON
 */
interface RawFileSystemStorageEntry {
  data: Record<string, unknown>;
  createTime: string;
  updateTime: string;
  id: string;
}

/**
 * File system query builder implementation.
 * Allows querying and filtering JSON files stored in a directory.
 */
export class FileSystemQueryBuilder<T> implements IQueryBuilder<T> {
  protected options: QueryOptions = {
    conditions: [],
    skip: 0,
    limit: 10,
    sort: [],
  };

  /**
   * Creates a file system query builder
   * @param collection - Collection name
   * @param collectionDir - Directory path for the collection
   * @param transformer - Function to transform database data to entity
   * @param options - Initial query options
   */
  constructor(
    protected collection: string,
    private collectionDir: string,
    private transformer: (dbData: Record<string, unknown>) => T,
    options?: Partial<QueryOptions>
  ) {
    this.options = { ...this.options, ...options };
  }

  /**
   * Add a where condition on a field or path
   */
  where<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    operator: ComparisonOperator,
    value: unknown
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const fieldStr = String(fieldOrPath);
    (clone as FileSystemQueryBuilder<T>).options.conditions.push({
      field: fieldStr,
      operator,
      value,
    });
    return clone;
  }

  /**
   * Limit the number of results
   */
  limit(limit: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as FileSystemQueryBuilder<T>).options.limit = limit;
    return clone;
  }

  /**
   * Skip a number of results
   */
  skip(skip: number): IQueryBuilder<T> {
    const clone = this.clone();
    (clone as FileSystemQueryBuilder<T>).options.skip = skip;
    return clone;
  }

  /**
   * Add a sort specification for a field or path
   */
  orderBy<K extends (keyof T & string) | string>(
    fieldOrPath: K,
    direction: SortDirection = SortDirection.Ascending
  ): IQueryBuilder<T> {
    const clone = this.clone();
    const baseClone = clone as FileSystemQueryBuilder<T>;
    const fieldStr = String(fieldOrPath);
    baseClone.options.sort = baseClone.options.sort ?? [];
    baseClone.options.sort.push({
      field: fieldStr,
      direction,
    });
    return clone;
  }

  /**
   * Execute the query and return the count of matching entities
   */
  async count(): Promise<number> {
    const results = await this.executeQuery();
    return results.length;
  }

  /**
   * Get the query options
   */
  getQueryOptions(): QueryOptions {
    return { ...this.options };
  }

  /**
   * Create a clone of this query builder
   */
  clone(): IQueryBuilder<T> {
    const clonedOptions = deepClone(this.options);
    return new FileSystemQueryBuilder<T>(
      this.collection,
      this.collectionDir,
      this.transformer,
      clonedOptions
    );
  }

  /**
   * Execute the query and return all matching entities
   */
  async getResults(): Promise<Ref<T>[]> {
    const results = await this.executeQuery();

    // Transform entries to Ref<T> objects
    return results.map((entry) => {
      // Transform the entity data to domain entity
      const domainEntity = this.transformer(entry.data);

      // Return as Ref<T>
      return {
        id: entry.id,
        createdAt: entry.createTime,
        updatedAt: entry.updateTime,
        deletedAt: null,
        data: domainEntity,
      };
    });
  }

  /**
   * Execute the query with all filters and sorting
   */
  private async executeQuery(): Promise<FileSystemStorageEntry[]> {
    try {
      // Read all files in the collection directory
      const files = await fs.readdir(this.collectionDir);

      // Filter JSON files only
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      // Read all file contents in parallel
      const entries = await Promise.all(
        jsonFiles.map(async (file) => {
          const id = file.slice(0, -5); // Remove .json extension
          try {
            const entry = await this.readEntityFile(
              path.join(this.collectionDir, file),
              id
            );
            return entry;
          } catch {
            // Skip files that can't be read or parsed
            return null;
          }
        })
      );

      // Filter out failures and apply query conditions
      const filteredEntries = entries
        .filter(
          (entry): entry is FileSystemStorageEntry =>
            entry !== null && this.evaluateConditions(entry)
        )
        .sort((a, b) => this.compareForSort(a, b));

      // Apply pagination
      const skipCount = this.options.skip ?? 0;
      const limitCount = this.options.limit ?? Number.MAX_SAFE_INTEGER;

      return filteredEntries.slice(skipCount, skipCount + limitCount);
    } catch (error: unknown) {
      // If directory doesn't exist or can't be read, return empty result
      if (this.isErrnoException(error) && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /**
   * Compare two entries for sorting
   */
  private compareForSort(
    a: FileSystemStorageEntry,
    b: FileSystemStorageEntry
  ): number {
    if (!this.options.sort || this.options.sort.length === 0) {
      return 0;
    }

    for (const sort of this.options.sort) {
      const aValue = this.getValueByPath(a, sort.field);
      const bValue = this.getValueByPath(b, sort.field);

      const result = this.compareValues(aValue, bValue);

      if (result !== 0) {
        return sort.direction === SortDirection.Ascending ? result : -result;
      }
    }

    return 0;
  }

  /**
   * Get a value from an object by dot-notation path
   */
  private getValueByPath(obj: FileSystemStorageEntry, path: string): unknown {
    // Special case for id
    if (path === "id") {
      return obj.id;
    }

    // Special case for createTime
    if (path === "createTime") {
      return obj.createTime;
    }

    // Special case for updateTime
    if (path === "updateTime") {
      return obj.updateTime;
    }

    // Handle data fields
    if (path.startsWith("data.")) {
      // Split the path and start from data
      const parts = path.split(".");
      let current: unknown = obj.data;

      // Skip the 'data' part and traverse the rest
      for (let i = 1; i < parts.length; i++) {
        if (current == null || typeof current !== "object") {
          return undefined;
        }

        current = (current as Record<string, unknown>)[parts[i]];
      }

      return current;
    }

    // Default to looking directly in data
    return obj.data[path];
  }

  /**
   * Evaluate all conditions against an entry
   */
  private evaluateConditions(entry: FileSystemStorageEntry): boolean {
    if (!this.options.conditions || this.options.conditions.length === 0) {
      return true;
    }

    return this.options.conditions.every((condition) =>
      this.evaluateCondition(entry, condition)
    );
  }

  /**
   * Evaluate a single condition against an entry
   */
  private evaluateCondition(
    entry: FileSystemStorageEntry,
    condition: {
      field: string;
      operator: ComparisonOperator;
      value: unknown;
    }
  ): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getValueByPath(entry, field);

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
        if (Array.isArray(fieldValue)) {
          return fieldValue.some(
            (item) => this.compareValues(item, value) === 0
          );
        }
        return false;

      case ComparisonOperator.ArrayContainsAny:
        if (Array.isArray(fieldValue) && Array.isArray(value)) {
          return fieldValue.some((item) =>
            value.some((v) => this.compareValues(item, v) === 0)
          );
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Compare two values for sorting and filtering
   */
  private compareValues(a: unknown, b: unknown): number {
    // Handle null/undefined
    if (a === undefined || a === null) {
      return b === undefined || b === null ? 0 : -1;
    }
    if (b === undefined || b === null) {
      return 1;
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Handle strings
    if (typeof a === "string" && typeof b === "string") {
      return a.localeCompare(b);
    }

    // Handle numbers
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }

    // Handle booleans
    if (typeof a === "boolean" && typeof b === "boolean") {
      return a === b ? 0 : a ? 1 : -1;
    }

    // If objects, try to use JSON for comparison
    if (
      typeof a === "object" &&
      a !== null &&
      typeof b === "object" &&
      b !== null
    ) {
      try {
        const jsonA = JSON.stringify(a);
        const jsonB = JSON.stringify(b);
        return jsonA.localeCompare(jsonB);
      } catch {
        // Fallback if JSON stringification fails
        return 0;
      }
    }

    // For mixed types, convert to stable representation for comparison
    return String(typeof a).localeCompare(String(typeof b));
  }

  /**
   * Read an entity file and parse it
   */
  private async readEntityFile(
    filePath: string,
    id: string
  ): Promise<FileSystemStorageEntry> {
    const content = await fs.readFile(filePath, "utf-8");
    const rawEntry = JSON.parse(content) as RawFileSystemStorageEntry;

    return {
      id: id,
      data: rawEntry.data,
      createTime: new Date(rawEntry.createTime),
      updateTime: new Date(rawEntry.updateTime),
    };
  }

  /**
   * Type guard for NodeJS.ErrnoException
   */
  private isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error && "code" in error;
  }
}
