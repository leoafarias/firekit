import {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  FieldValue,
  Firestore,
  getFirestore,
  Timestamp,
  WriteBatch,
} from "firebase-admin/firestore";

import {
  getCollectionName,
  getCreatedAtField,
  getIdField,
  getUpdatedAtField,
} from "../decorators";

import { FieldMetadata, FIELDS_KEY } from "../utils/metadata.utils";
import { FirestoreBatchHelper } from "./batch-helper";
import { QueryBuilder } from "./query-builder";

/**
 * Repository for Firestore entities
 * Provides CRUD operations and query capabilities
 */
export class EntityRepository<T> {
  private db: Firestore;
  private collectionRef: CollectionReference;
  private entityClass: new () => T;
  private collectionName: string;
  private idField: string | symbol | undefined;
  private createdAtField: string | symbol | undefined;
  private updatedAtField: string | symbol | undefined;
  private fields: FieldMetadata[];

  /**
   * Creates a new entity repository
   * @param entityClass - Entity class decorated with @Collection
   * @param collectionRef - Optional custom collection reference (used for subcollections)
   * @throws Error if the entity class is not properly decorated
   */
  constructor(entityClass: new () => T, collectionRef?: CollectionReference) {
    this.entityClass = entityClass;
    this.db = getFirestore();

    // Get collection metadata
    this.collectionName = getCollectionName(entityClass) || "";
    if (!this.collectionName && !collectionRef) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection or @Subcollection`
      );
    }

    // Get field metadata
    this.fields = Reflect.getMetadata(FIELDS_KEY, entityClass) || [];
    this.idField = getIdField(entityClass);
    this.createdAtField = getCreatedAtField(entityClass);
    this.updatedAtField = getUpdatedAtField(entityClass);

    // Get Firestore collection reference (use provided one or create from collection name)
    this.collectionRef =
      collectionRef || this.db.collection(this.collectionName);
  }

  /**
   * Gets the ID field property key
   * @returns ID field property key
   */
  getIdField(): string | symbol | undefined {
    return this.idField;
  }

  /**
   * Gets the createdAt field property key
   * @returns createdAt field property key
   */
  getCreatedAtField(): string | symbol | undefined {
    return this.createdAtField;
  }

  /**
   * Gets the updatedAt field property key
   * @returns updatedAt field property key
   */
  getUpdatedAtField(): string | symbol | undefined {
    return this.updatedAtField;
  }

  /**
   * Gets the collection reference
   * @returns Firestore collection reference
   */
  getCollectionRef(): CollectionReference {
    return this.collectionRef;
  }

  /**
   * Convert entity data to Firestore data
   * @param entity - Entity or partial entity data
   * @returns Firestore data object
   */
  toFirestore(entity: Partial<T>): Record<string, any> {
    const data: Record<string, any> = {};

    // Add fields
    this.fields.forEach((field) => {
      const propKey = field.propertyKey.toString();
      if (propKey in entity) {
        let value = entity[propKey as keyof T];

        // Apply custom transformers
        if (
          field.options.transformer &&
          field.options.transformer.toFirestore
        ) {
          value = field.options.transformer.toFirestore(value);
        }

        // Set field value in data
        data[propKey] = value;
      }
    });

    return data;
  }

  /**
   * Convert Firestore document to entity
   * @param snapshot - Firestore document snapshot
   * @returns Entity instance
   */
  fromFirestore(snapshot: DocumentSnapshot): T {
    const data = snapshot.data() || {};
    const entity = new this.entityClass();

    // Set ID
    if (this.idField) {
      entity[this.idField.toString() as keyof T] = snapshot.id as any;
    }

    // Set fields
    this.fields.forEach((field) => {
      const propKey = field.propertyKey.toString();
      if (propKey in data) {
        let value = data[propKey];

        // Convert Firestore Timestamp to Date
        if (value instanceof Timestamp) {
          value = value.toDate();
        }

        // Apply custom transformers
        if (
          field.options.transformer &&
          field.options.transformer.fromFirestore
        ) {
          value = field.options.transformer.fromFirestore(value);
        }

        // Set property
        entity[propKey as keyof T] = value as any;
      }
    });

    return entity;
  }

  /**
   * Create a new entity
   * @param data - Entity data
   * @param id - Optional custom ID (auto-generated if not provided)
   * @returns Promise that resolves to the created entity
   *
   * @example
   * ```typescript
   * const user = await userRepo.create({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   age: 30
   * });
   * ```
   */
  async create(data: Partial<T>, id?: string): Promise<T> {
    // Convert entity to Firestore data
    const firestoreData = this.toFirestore(data);

    // Add timestamps
    if (this.createdAtField) {
      firestoreData[this.createdAtField.toString()] =
        FieldValue.serverTimestamp();
    }
    if (this.updatedAtField) {
      firestoreData[this.updatedAtField.toString()] =
        FieldValue.serverTimestamp();
    }

    // Create document with auto-generated ID or custom ID if provided
    let docRef: DocumentReference;
    if (id) {
      docRef = this.collectionRef.doc(id);
      await docRef.set(firestoreData);
    } else {
      docRef = await this.collectionRef.add(firestoreData);
    }

    // Get the created document
    const snapshot = await docRef.get();
    return this.fromFirestore(snapshot);
  }

  /**
   * Find an entity by its ID
   * @param id - Entity ID
   * @returns Promise that resolves to the entity or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepo.findById('user-id');
   * if (user) {
   *   console.log(`Found user: ${user.name}`);
   * }
   * ```
   */
  async findById(id: string): Promise<T | null> {
    const snapshot = await this.collectionRef.doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    return this.fromFirestore(snapshot);
  }

  /**
   * Get an entity by its ID
   * @param id - Entity ID
   * @returns Promise that resolves to the entity
   * @throws Error if the entity is not found
   *
   * @example
   * ```typescript
   * try {
   *   const user = await userRepo.getById('user-id');
   *   console.log(`Found user: ${user.name}`);
   * } catch (error) {
   *   console.error('User not found');
   * }
   * ```
   */
  async getById(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error(
        `Entity with ID ${id} not found in collection ${this.collectionName}`
      );
    }
    return entity;
  }

  /**
   * Update an entity
   * @param id - Entity ID
   * @param data - Entity data to update
   * @returns Promise that resolves to the updated entity
   *
   * @example
   * ```typescript
   * const updatedUser = await userRepo.update('user-id', {
   *   name: 'John Smith',
   *   age: 31
   * });
   * console.log(updatedUser.name); // 'John Smith'
   * ```
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    // Convert entity to Firestore data
    const firestoreData = this.toFirestore(data);

    // Add updated timestamp
    if (this.updatedAtField) {
      firestoreData[this.updatedAtField.toString()] =
        FieldValue.serverTimestamp();
    }

    // Update document
    const docRef = this.collectionRef.doc(id);
    await docRef.update(firestoreData);

    // Get the updated document
    const snapshot = await docRef.get();
    return this.fromFirestore(snapshot);
  }

  /**
   * Delete an entity
   * @param id - Entity ID
   * @returns Promise that resolves when the delete is complete
   *
   * @example
   * ```typescript
   * await userRepo.delete('user-id');
   * ```
   */
  async delete(id: string): Promise<void> {
    await this.collectionRef.doc(id).delete();
  }

  /**
   * Find all entities in the collection
   * @returns Promise that resolves to an array of entities
   *
   * @example
   * ```typescript
   * const allUsers = await userRepo.findAll();
   * console.log(`Found ${allUsers.length} users`);
   * ```
   */
  async findAll(): Promise<T[]> {
    const snapshot = await this.collectionRef.get();
    return snapshot.docs.map((doc) => this.fromFirestore(doc));
  }

  /**
   * Create a query builder for this entity
   * @returns Query builder
   *
   * @example
   * ```typescript
   * const activeUsers = await userRepo
   *   .query()
   *   .where('status', '==', 'active')
   *   .orderBy('lastName')
   *   .get();
   * ```
   */
  query(): QueryBuilder<T> {
    return new QueryBuilder<T>(
      this.collectionRef,
      this.fromFirestore.bind(this)
    );
  }

  /**
   * Create a batch operation helper
   * @param operations - Function to define batch operations
   * @returns Promise that resolves when the batch is committed
   *
   * @example
   * ```typescript
   * await userRepo.batch(batch => {
   *   batch.create({ name: 'User 1', email: 'user1@example.com' });
   *   batch.update('user-id', { name: 'Updated User' });
   *   batch.delete('old-user-id');
   * });
   * ```
   */
  async batch(
    operations: (batch: FirestoreBatchHelper<T>) => void
  ): Promise<void> {
    const batch = this.db.batch();
    const helper = new FirestoreBatchHelper<T>(batch, this.collectionRef, this);

    operations(helper);

    await batch.commit();
  }

  /**
   * Get a write batch for manual batch operations
   * @returns Firestore write batch
   */
  getBatch(): WriteBatch {
    return this.db.batch();
  }
}
