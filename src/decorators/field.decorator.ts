import "reflect-metadata";
import { addFieldMetadata, FieldOptions } from "../utils/metadata.utils";

/**
 * Decorator to mark a property as a field in the Firestore document
 * @param options - Field options
 * @returns Property decorator function
 *
 * @example
 * ```typescript
 * class User {
 *   @Field()
 *   name: string;
 *
 *   @Field({ index: true })
 *   email: string;
 *
 *   @Field({
 *     transformer: {
 *       toFirestore: (roles: string[]) => roles.join(','),
 *       fromFirestore: (value: string) => value ? value.split(',') : []
 *     }
 *   })
 *   roles: string[];
 * }
 * ```
 */
export function Field(options: FieldOptions = {}): PropertyDecorator {
  return function decorateField(target: any, propertyKey: string | symbol) {
    // Handle both old-style decorators and new TypeScript 5.0+ decorators
    const constructor =
      typeof target === "function"
        ? target
        : (target && target.constructor) || target;

    addFieldMetadata(constructor, propertyKey, options);
  };
}
