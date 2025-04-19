import "reflect-metadata";
import {
  CREATED_AT_FIELD_KEY,
  UPDATED_AT_FIELD_KEY,
} from "../utils/metadata.utils";
import { Field } from "./field.decorator";

/**
 * Decorator to mark a property as the creation timestamp field
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   @CreatedAt()
 *   creationDate: Date;
 *
 *   // other properties...
 * }
 * ```
 */
export function CreatedAt(): PropertyDecorator {
  return function decorateCreatedAtField(
    target: any,
    propertyKey: string | symbol
  ) {
    // Mark the property as a creation timestamp field
    Reflect.defineMetadata(
      CREATED_AT_FIELD_KEY,
      propertyKey,
      target.constructor || target
    );

    // Also mark it as a regular field
    Field()(target, propertyKey);
  };
}

/**
 * Decorator to mark a property as the update timestamp field
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   @UpdatedAt()
 *   lastModified: Date;
 *
 *   // other properties...
 * }
 * ```
 */
export function UpdatedAt(): PropertyDecorator {
  return function decorateUpdatedAtField(
    target: any,
    propertyKey: string | symbol
  ) {
    // Mark the property as an update timestamp field
    Reflect.defineMetadata(
      UPDATED_AT_FIELD_KEY,
      propertyKey,
      target.constructor || target
    );

    // Also mark it as a regular field
    Field()(target, propertyKey);
  };
}

/**
 * Gets the creation timestamp field property key
 * @param target - The class to get the created at field from
 * @returns The creation timestamp field property key or undefined if not found
 */
export function getCreatedAtField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(CREATED_AT_FIELD_KEY, target);
}

/**
 * Gets the update timestamp field property key
 * @param target - The class to get the updated at field from
 * @returns The update timestamp field property key or undefined if not found
 */
export function getUpdatedAtField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(UPDATED_AT_FIELD_KEY, target);
}
