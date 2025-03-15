import {
  Database,
  DataSnapshot,
  getDatabase,
  Query as RTDBQuery,
  Reference,
  ServerValue,
} from "firebase-admin/database";

/**
 * Repository for Firebase Realtime Database
 * Provides CRUD operations and query capabilities for RTDB
 */
export class RealtimeRepository<T> {
  private db: Database;
  private basePath: string;

  /**
   * Creates a new realtime database repository
   * @param path - Base path for this repository
   */
  constructor(path: string) {
    this.db = getDatabase();
    this.basePath = path;
  }

  /**
   * Gets the reference to the base path
   * @returns Firebase database reference
   */
  getRef(): Reference {
    return this.db.ref(this.basePath);
  }

  /**
   * Gets a reference to a specific path relative to the base path
   * @param path - Path relative to the base path
   * @returns Firebase database reference
   */
  getRefAt(path: string): Reference {
    return this.db.ref(`${this.basePath}/${path}`);
  }

  /**
   * Creates a new entity with auto-generated ID
   * @param data - Entity data
   * @returns Promise resolving to the created entity with ID
   */
  async push(data: Partial<T>): Promise<T & { id: string }> {
    // Add timestamps
    const timestampedData = {
      ...data,
      createdAt: ServerValue.TIMESTAMP,
      updatedAt: ServerValue.TIMESTAMP,
    };

    // Push data to generate a new ID
    const ref = await this.getRef().push(timestampedData);

    // Read back the created data
    const snapshot = await ref.once("value");

    return {
      id: ref.key!,
      ...snapshot.val(),
    } as T & { id: string };
  }

  /**
   * Creates or updates an entity at a specific path
   * @param id - ID for the entity
   * @param data - Entity data
   * @returns Promise resolving when complete
   */
  async set(id: string, data: Partial<T>): Promise<void> {
    // Add timestamps
    const timestampedData = {
      ...data,
      createdAt: (data as any)["createdAt"] || ServerValue.TIMESTAMP,
      updatedAt: ServerValue.TIMESTAMP,
    };

    await this.getRef().child(id).set(timestampedData);
  }

  /**
   * Updates an entity at a specific path
   * @param id - ID for the entity
   * @param data - Entity data
   * @returns Promise resolving when complete
   */
  async update(id: string, data: Partial<T>): Promise<void> {
    // Add updated timestamp
    const timestampedData = {
      ...data,
      updatedAt: ServerValue.TIMESTAMP,
    };

    await this.getRef().child(id).update(timestampedData);
  }

  /**
   * Gets an entity by ID
   * @param id - ID of the entity
   * @returns Promise resolving to the entity or null if not found
   */
  async get(id: string): Promise<(T & { id: string }) | null> {
    const snapshot = await this.getRef().child(id).once("value");
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.key!,
      ...snapshot.val(),
    } as T & { id: string };
  }

  /**
   * Gets all entities under the base path
   * @returns Promise resolving to an array of entities
   */
  async getAll(): Promise<(T & { id: string })[]> {
    const snapshot = await this.getRef().once("value");
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();

    return Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    })) as (T & { id: string })[];
  }

  /**
   * Removes an entity by ID
   * @param id - ID of the entity to remove
   * @returns Promise resolving when complete
   */
  async remove(id: string): Promise<void> {
    await this.getRef().child(id).remove();
  }

  /**
   * Creates a query on the base reference
   * @returns Query builder for this repository
   */
  query(): RealtimeQueryBuilder<T> {
    return new RealtimeQueryBuilder<T>(this.getRef());
  }
}

/**
 * Builder for Realtime Database queries
 */
export class RealtimeQueryBuilder<T> {
  private query: RTDBQuery;

  /**
   * Creates a new query builder
   * @param ref - Firebase database reference
   */
  constructor(ref: Reference) {
    this.query = ref;
  }

  /**
   * Filter results by value
   * @param child - Child path to filter on
   * @param value - Value to filter for
   * @returns This query builder for chaining
   */
  equalTo(
    child: string,
    value: string | number | boolean | null
  ): RealtimeQueryBuilder<T> {
    this.query = this.query.orderByChild(child).equalTo(value);
    return this;
  }

  /**
   * Filter results by value range
   * @param child - Child path to filter on
   * @param startValue - Start value (inclusive)
   * @param endValue - End value (inclusive)
   * @returns This query builder for chaining
   */
  between(
    child: string,
    startValue: any,
    endValue: any
  ): RealtimeQueryBuilder<T> {
    this.query = this.query
      .orderByChild(child)
      .startAt(startValue)
      .endAt(endValue);
    return this;
  }

  /**
   * Order results by child value
   * @param child - Child path to order by
   * @returns This query builder for chaining
   */
  orderByChild(child: string): RealtimeQueryBuilder<T> {
    this.query = this.query.orderByChild(child);
    return this;
  }

  /**
   * Order results by key
   * @returns This query builder for chaining
   */
  orderByKey(): RealtimeQueryBuilder<T> {
    this.query = this.query.orderByKey();
    return this;
  }

  /**
   * Order results by value
   * @returns This query builder for chaining
   */
  orderByValue(): RealtimeQueryBuilder<T> {
    this.query = this.query.orderByValue();
    return this;
  }

  /**
   * Limit the number of results
   * @param limit - Maximum number of results
   * @returns This query builder for chaining
   */
  limitToFirst(limit: number): RealtimeQueryBuilder<T> {
    this.query = this.query.limitToFirst(limit);
    return this;
  }

  /**
   * Limit to the last N results
   * @param limit - Maximum number of results
   * @returns This query builder for chaining
   */
  limitToLast(limit: number): RealtimeQueryBuilder<T> {
    this.query = this.query.limitToLast(limit);
    return this;
  }

  /**
   * Start results at a specific value
   * @param value - Value to start at
   * @returns This query builder for chaining
   */
  startAt(value: string | number | boolean | null): RealtimeQueryBuilder<T> {
    this.query = this.query.startAt(value);
    return this;
  }

  /**
   * End results at a specific value
   * @param value - Value to end at
   * @returns This query builder for chaining
   */
  endAt(value: string | number | boolean | null): RealtimeQueryBuilder<T> {
    this.query = this.query.endAt(value);
    return this;
  }

  /**
   * Execute the query
   * @returns Promise resolving to the query results
   */
  async get(): Promise<(T & { id: string })[]> {
    const snapshot = await this.query.once("value");
    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();

    return Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    })) as (T & { id: string })[];
  }

  /**
   * Listen for value changes
   * @param callback - Callback function receiving the updated data
   * @returns Unsubscribe function
   */
  onValue(callback: (data: (T & { id: string })[]) => void): () => void {
    const handler = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const data = snapshot.val();

      const items = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as (T & { id: string })[];

      callback(items);
    };

    this.query.on("value", handler);

    return () => {
      this.query.off("value", handler);
    };
  }
}
