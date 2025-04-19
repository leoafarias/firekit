import "reflect-metadata";
import { CreatedAt, Field, ID, UpdatedAt } from "./index";

/**
 * Decorator to mark a class as an entity and adds standard entity fields
 * This automatically applies ID, CreatedAt, and UpdatedAt decorators
 *
 * @example
 * ```typescript
 * @Entity()
 * @Collection({ name: 'users' })
 * class User {
 *   id!: string;
 *   createdAt!: Date;
 *   updatedAt!: Date;
 *
 *   @Field()
 *   name!: string;
 * }
 * ```
 */
export function Entity(): ClassDecorator {
  return function decorateEntity(target: any) {
    // Apply ID decorator to id property
    ID()(target.prototype, "id");

    // Apply CreatedAt decorator to createdAt property
    CreatedAt()(target.prototype, "createdAt");

    // Apply UpdatedAt decorator to updatedAt property
    UpdatedAt()(target.prototype, "updatedAt");

    // Add field metadata if needed
    Field()(target.prototype, "id");
  };
}
