import "reflect-metadata";
import { ID_FIELD_KEY } from "../utils/metadata.utils";

/**
 * Decorator to mark a property as the ID field for the Firestore document
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class User {
 *   @ID()
 *   id: string;
 * }
 * ```
 */
export function ID(): PropertyDecorator {
  return function decorateId(target: any, propertyKey: string | symbol) {
    // Handle both old-style decorators and new TypeScript 5.0+ decorators
    const constructor =
      typeof target === "function"
        ? target
        : (target && target.constructor) || target;

    Reflect.defineMetadata(ID_FIELD_KEY, propertyKey, constructor);
  };
}

/**
 * Gets the ID field from a class
 * @param target - The class to get the ID field from
 * @returns The ID field property key or undefined if not found
 */
export function getIdField(target: any): string | symbol | undefined {
  return Reflect.getMetadata(ID_FIELD_KEY, target);
}
