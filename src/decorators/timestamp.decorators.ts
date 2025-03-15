import "reflect-metadata";
import { CREATED_AT_KEY, UPDATED_AT_KEY } from "../utils/metadata.utils";

/**
 * Decorator to mark a property as the createdAt timestamp field
 * This field will be automatically set when the document is created
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class User {
 *   @CreatedAt()
 *   createdAt: Date;
 * }
 * ```
 */
export function CreatedAt(): PropertyDecorator {
  return function decorateCreatedAt(target: any, propertyKey: string | symbol) {
    // Handle both old-style decorators and new TypeScript 5.0+ decorators
    const constructor =
      typeof target === "function"
        ? target
        : (target && target.constructor) || target;

    Reflect.defineMetadata(CREATED_AT_KEY, propertyKey, constructor);
  };
}

/**
 * Decorator to mark a property as the updatedAt timestamp field
 * This field will be automatically updated when the document is updated
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class User {
 *   @UpdatedAt()
 *   updatedAt: Date;
 * }
 * ```
 */
export function UpdatedAt(): PropertyDecorator {
  return function decorateUpdatedAt(target: any, propertyKey: string | symbol) {
    // Handle both old-style decorators and new TypeScript 5.0+ decorators
    const constructor =
      typeof target === "function"
        ? target
        : (target && target.constructor) || target;

    Reflect.defineMetadata(UPDATED_AT_KEY, propertyKey, constructor);
  };
}

/**
 * Gets the createdAt field from a class
 * @param target - The class to get the createdAt field from
 * @returns The createdAt field property key or undefined if not found
 */
export function getCreatedAtField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(CREATED_AT_KEY, target);
}

/**
 * Gets the updatedAt field from a class
 * @param target - The class to get the updatedAt field from
 * @returns The updatedAt field property key or undefined if not found
 */
export function getUpdatedAtField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(UPDATED_AT_KEY, target);
}
