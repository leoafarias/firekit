import "reflect-metadata";
import { ID_FIELD_KEY } from "../utils/metadata.utils";
import { Field } from "./field.decorator";

/**
 * Decorator to mark a property as the ID field for an entity
 * @returns Property decorator
 *
 * @example
 * ```typescript
 * class User {
 *   @ID()
 *   userId: string;
 *
 *   // other properties...
 * }
 * ```
 */
export function ID(): PropertyDecorator {
  return function decorateIdField(target: any, propertyKey: string | symbol) {
    // Mark the property as an ID field
    Reflect.defineMetadata(
      ID_FIELD_KEY,
      propertyKey,
      target.constructor || target
    );

    // Also mark it as a regular field
    Field()(target, propertyKey);
  };
}

/**
 * Gets the ID field property key from a class decorated with @ID
 * @param target - The class to get the ID field from
 * @returns The ID field property key or undefined if not found
 */
export function getIdField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(ID_FIELD_KEY, target);
}
