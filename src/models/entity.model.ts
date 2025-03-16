import { plainToInstance } from "class-transformer";
import { ClassType } from "class-transformer-validator";
import { validate, ValidatorOptions } from "class-validator";

export type Entity<T> = T & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Utility type that extracts only the data fields from an entity type,
 * excluding methods and functions.
 */
export type FieldsOnly<T extends object> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};
/**
 * Utility type for partial updates that only includes data fields.
 */
export type PartialFields<T extends object> = {
  [K in keyof FieldsOnly<T>]?: FieldsOnly<T>[K];
};

export function toPartialFields<T extends object>(
  data: FieldsOnly<T>
): PartialFields<T> {
  return data as unknown as PartialFields<T>;
}

/*
 * Validates an entity, allowing both full and partial data.
 *
 * @param cls - The entity class constructor.
 * @param data - The entity data, either a full set of fields (FieldsOnly<T>) or a partial update (PartialFields<T>).
 * @param options - Validation options. Set `skipMissingProperties` to true for partial updates.
 * @returns A promise that resolves with a validated instance of the entity.
 */
export async function validateEntity<T extends object>(
  cls: ClassType<T>,
  data: Partial<T>,
  options: ValidatorOptions = {
    skipMissingProperties: false,
  }
): Promise<T> {
  // Enable implicit conversion for proper instance creation.
  const entityInstance = plainToInstance(cls, data, {
    enableImplicitConversion: true,
  });
  const errors = await validate(entityInstance, options);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  return entityInstance;
}
