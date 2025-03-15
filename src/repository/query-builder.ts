import {
  CollectionReference,
  DocumentSnapshot,
  Query as FirestoreQuery,
  WhereFilterOp,
} from "firebase-admin/firestore";

/**
 * Type for the supported Firestore where operators
 */
export type FirestoreOperator =
  | "<"
  | "<="
  | "=="
  | "!="
  | ">="
  | ">"
  | "array-contains"
  | "array-contains-any"
  | "in"
  | "not-in";

/**
 * Builder for type-safe Firestore queries
 * Supports method chaining for building complex queries
 */
export class QueryBuilder<T> {
  private query: FirestoreQuery;
  private fromFirestore: (snapshot: DocumentSnapshot) => T;

  /**
   * Creates a new query builder
   * @param collectionRef - Firestore collection reference
   * @param fromFirestore - Function to convert Firestore document to entity
   */
  constructor(
    collectionRef: CollectionReference,
    fromFirestore: (snapshot: DocumentSnapshot) => T
  ) {
    this.query = collectionRef;
    this.fromFirestore = fromFirestore;
  }

  /**
   * Add a where clause to the query
   * @param field - Field name
   * @param operator - Comparison operator
   * @param value - Value to compare against
   * @returns Updated query builder for chaining
   *
   * @example
   * ```typescript
   * const users = await userRepo
   *   .query()
   *   .where('age', '>', 25)
   *   .where('status', '==', 'active')
   *   .get();
   * ```
   */
  where<K extends keyof T>(
    field: K,
    operator: FirestoreOperator,
    value: any
  ): QueryBuilder<T> {
    this.query = this.query.where(
      field.toString(),
      operator as WhereFilterOp,
      value
    );
    return this;
  }

  /**
   * Set the query limit
   * @param limit - Maximum number of documents to return
   * @returns Updated query builder for chaining
   *
   * @example
   * ```typescript
   * const users = await userRepo
   *   .query()
   *   .limit(10)
   *   .get();
   * ```
   */
  limit(limit: number): QueryBuilder<T> {
    this.query = this.query.limit(limit);
    return this;
  }

  /**
   * Set the query offset
   * @param offset - Number of documents to skip
   * @returns Updated query builder for chaining
   *
   * @example
   * ```typescript
   * // Get the second page of results
   * const users = await userRepo
   *   .query()
   *   .limit(10)
   *   .offset(10)
   *   .get();
   * ```
   */
  offset(offset: number): QueryBuilder<T> {
    this.query = this.query.offset(offset);
    return this;
  }

  /**
   * Order the query results
   * @param field - Field to order by
   * @param direction - Sort direction (asc or desc)
   * @returns Updated query builder for chaining
   *
   * @example
   * ```typescript
   * const users = await userRepo
   *   .query()
   *   .orderBy('lastName')
   *   .orderBy('firstName', 'asc')
   *   .get();
   * ```
   */
  orderBy<K extends keyof T>(
    field: K,
    direction: "asc" | "desc" = "asc"
  ): QueryBuilder<T> {
    this.query = this.query.orderBy(field.toString(), direction);
    return this;
  }

  /**
   * Start query results at a specific document
   * @param documentId - Document ID to start at
   * @returns Updated query builder for chaining
   *
   * @example
   * ```typescript
   * const users = await userRepo
   *   .query()
   *   .orderBy('lastName')
   *   .startAt('Smith')
   *   .get();
   * ```
   */
  startAt(documentId: string): QueryBuilder<T> {
    this.query = this.query.startAt(documentId);
    return this;
  }

  /**
   * Start query results after a specific document
   * @param documentId - Document ID to start after
   * @returns Updated query builder for chaining
   */
  startAfter(documentId: string): QueryBuilder<T> {
    this.query = this.query.startAfter(documentId);
    return this;
  }

  /**
   * End query results at a specific document
   * @param documentId - Document ID to end at
   * @returns Updated query builder for chaining
   */
  endAt(documentId: string): QueryBuilder<T> {
    this.query = this.query.endAt(documentId);
    return this;
  }

  /**
   * End query results before a specific document
   * @param documentId - Document ID to end before
   * @returns Updated query builder for chaining
   */
  endBefore(documentId: string): QueryBuilder<T> {
    this.query = this.query.endBefore(documentId);
    return this;
  }

  /**
   * Execute the query
   * @returns Promise that resolves to an array of entities
   *
   * @example
   * ```typescript
   * const users = await userRepo
   *   .query()
   *   .where('age', '>', 25)
   *   .orderBy('lastName')
   *   .limit(10)
   *   .get();
   * ```
   */
  async get(): Promise<T[]> {
    const snapshot = await this.query.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc));
  }

  /**
   * Get the first matching document
   * @returns Promise that resolves to the first entity or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepo
   *   .query()
   *   .where('email', '==', 'john@example.com')
   *   .getFirst();
   * ```
   */
  async getFirst(): Promise<T | null> {
    const snapshot = await this.query.limit(1).get();
    return snapshot.empty ? null : this.fromFirestore(snapshot.docs[0]);
  }

  /**
   * Count the number of documents that would be returned by the query
   * @returns Promise that resolves to the count
   *
   * @example
   * ```typescript
   * const count = await userRepo
   *   .query()
   *   .where('status', '==', 'active')
   *   .count();
   * ```
   */
  async count(): Promise<number> {
    const snapshot = await this.query.count().get();
    return snapshot.data().count;
  }
}
