import { plainToInstance } from "class-transformer";
import {
  ClassType,
  transformAndValidateSync,
} from "class-transformer-validator";
import { ValidatorOptions } from "class-validator";
import {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getFirestore,
  WriteBatch,
} from "firebase-admin/firestore";
import { getCollectionName } from "../decorators";
import {
  Entity,
  FieldsOnly,
  PartialFields,
  validateEntity,
} from "../models/entity.model";
import { FieldMetadata, FIELDS_KEY } from "../utils/metadata.utils";
import { FirestoreBatchHelper } from "./batch-helper";
import { QueryBuilder } from "./query-builder";

/**
 * Repository for Firestore entities
 * Provides CRUD operations and query capabilities
 */
export class EntityRepository<T extends object> {
  private db: Firestore;
  private collectionRef: CollectionReference;
  private entityClass: ClassType<T>;
  private collectionName: string;
  private fields: FieldMetadata[];

  /**
   * Creates a new entity repository
   * @param entityClass - Entity class decorated with @Collection
   * @param collectionRef - Optional custom collection reference (used for subcollections)
   * @throws Error if the entity class is not properly decorated
   */
  constructor(entityClass: ClassType<T>, collectionRef?: CollectionReference) {
    this.entityClass = entityClass;
    this.db = getFirestore();
    // Check if Firebase is properly initialized
    if (!this.db) {
      throw new Error(
        "Firebase is not properly initialized. Make sure to call initializeFirebase() before creating repositories."
      );
    }

    // Get collection metadata
    this.collectionName = getCollectionName(entityClass) || "";
    if (!this.collectionName && !collectionRef) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection or @Subcollection`
      );
    }
    // Get collection metadata
    this.collectionName = getCollectionName(entityClass) || "";
    if (!this.collectionName && !collectionRef) {
      throw new Error(
        `Class ${entityClass.name} is not decorated with @Collection or @Subcollection`
      );
    }

    // Get field metadata
    this.fields = Reflect.getMetadata(FIELDS_KEY, entityClass) || [];

    // Get Firestore collection reference (use provided one or create from collection name)
    this.collectionRef =
      collectionRef || this.db.collection(this.collectionName);
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
  toFirestore(entity: PartialFields<T>): Record<string, any> {
    const data: Record<string, any> = {};

    // Add fields
    this.fields.forEach((field) => {
      const propKey = field.propertyKey.toString();
      if (propKey in entity) {
        let value = entity[propKey as keyof FieldsOnly<T>];

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
   * Create a subcollection repository for a parent entity
   * @param parentId - ID of the parent entity
   * @param childEntityClass - Class of the child entity
   * @param subcollectionName - Name of the subcollection
   * @returns A new repository for the child entity
   *
   * @example
   * ```typescript
   * const userRepo = BurnKit.getRepository(User);
   * const postRepo = userRepo.subcollection("user-id", Post, "posts");
   * ```
   */
  protected subcollection<R extends object>(
    parentId: string,
    childEntityClass: ClassType<R>,
    subcollectionName: string
  ): EntityRepository<R> {
    // Create a reference to the subcollection
    const subcollectionRef = this.collectionRef
      .doc(parentId)
      .collection(subcollectionName);

    // Create and return a new repository for the child entity
    return new EntityRepository<R>(childEntityClass, subcollectionRef);
  }

  /**
   * Convert Firestore document to entity
   * @param snapshot - Firestore document snapshot
   * @returns Entity instance
   */
  fromFirestore(snapshot: DocumentSnapshot): Entity<T> {
    const data = snapshot.data() || {};

    // Create a FirestoreDoc wrapper around the data
    const entityData = plainToInstance(this.entityClass, data);

    return {
      id: snapshot.id,
      createdAt: snapshot.createTime!.toDate(),
      updatedAt: snapshot.updateTime!.toDate(),
      ...entityData,
    };
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
  async create(data: FieldsOnly<T>, id?: string): Promise<Entity<T>> {
    // Convert entity to Firestore data
    const validatedData = transformAndSanitizeEntity(this.entityClass, data);
    const firestoreData = this.toFirestore(validatedData);

    // validate the data

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
  async findById(id: string): Promise<Entity<T> | null> {
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
  async getById(id: string): Promise<Entity<T>> {
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
  async update(id: string, data: PartialFields<T>): Promise<Entity<T>> {
    // Convert entity to Firestore data
    const validatedData = await validateEntity<PartialFields<T>>(
      this.entityClass,
      data,
      {
        skipMissingProperties: true,
      }
    );
    const firestoreData = this.toFirestore(validatedData);

    // Update document
    const docRef = this.collectionRef.doc(id);
    await docRef.set(firestoreData, { merge: true });

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
  async findAll(): Promise<Entity<T>[]> {
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
  query(): QueryBuilder<Entity<T>> {
    return new QueryBuilder<Entity<T>>(
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

export function transformAndSanitizeEntity<T extends object>(
  classType: ClassType<T>,
  obj: object,
  validatorOptions: ValidatorOptions = {
    skipMissingProperties: true,
    forbidUnknownValues: false,
  }
) {
  try {
    return transformAndValidateSync<T>(classType, obj, {
      validator: validatorOptions,
      transformer: {
        excludeExtraneousValues: false,
        exposeUnsetFields: false,
      },
    });
  } catch (error) {
    console.error("Validation error:", error);
    throw error;
  }
}
