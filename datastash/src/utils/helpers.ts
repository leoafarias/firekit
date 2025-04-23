/**
 * Utility helper functions
 */

/**
 * Helper method to create a deep clone of an object
 * @param obj - The object to clone
 * @returns A deep clone of the input object
 */
export function deepClone<U>(obj: U): U {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as U;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => deepClone(item)) as unknown as U;
  }

  const clonedObj = {} as { [K in keyof U]: U[K] };
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }

  return clonedObj;
}
