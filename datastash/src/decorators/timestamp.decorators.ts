import "reflect-metadata";
import {
  CREATED_AT_FIELD_KEY,
  DELETED_AT_FIELD_KEY,
  UPDATED_AT_FIELD_KEY,
} from "../utils/metadata.utils";
import { Field } from "./field.decorator";

/**
 * Decorator to mark a property as the creation timestamp field
 * @returns PropertyDecorator
 */
export function CreatedAt(): PropertyDecorator {
  return function decorateCreatedAtField(
    target: object,
    propertyKey: string | symbol
  ): void {
    // Mark the property as a creation timestamp field
    Reflect.defineMetadata(
      CREATED_AT_FIELD_KEY,
      propertyKey,
      target.constructor
    );

    // Also mark it as a regular field
    Field()(target, propertyKey);
  };
}

/**
 * Decorator to mark a property as the update timestamp field
 * @returns PropertyDecorator
 */
export function UpdatedAt(): PropertyDecorator {
  return function decorateUpdatedAtField(
    target: object,
    propertyKey: string | symbol
  ): void {
    // Mark the property as an update timestamp field
    Reflect.defineMetadata(
      UPDATED_AT_FIELD_KEY,
      propertyKey,
      target.constructor
    );

    // Also mark it as a regular field
    Field()(target, propertyKey);
  };
}

// DeletedAt

/**
 * Decorator to mark a property as the deletion timestamp field
 * @returns PropertyDecorator
 */
export function DeletedAt(): PropertyDecorator {
  return function decorateDeletedAtField(
    target: object,
    propertyKey: string | symbol
  ): void {
    // Mark the property as a deletion timestamp field
    Reflect.defineMetadata(
      DELETED_AT_FIELD_KEY,
      propertyKey,
      target.constructor
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
export function getCreatedAtField(target: object): string | symbol | undefined {
  // Add explicit type assertion
  return Reflect.getMetadata(CREATED_AT_FIELD_KEY, target) as
    | string
    | symbol
    | undefined;
}

/**
 * Gets the update timestamp field property key
 * @param target - The class to get the updated at field from
 * @returns The update timestamp field property key or undefined if not found
 */
export function getUpdatedAtField(target: object): string | symbol | undefined {
  // Add explicit type assertion
  return Reflect.getMetadata(UPDATED_AT_FIELD_KEY, target) as
    | string
    | symbol
    | undefined;
}
