# TypeScript Type Fixes Required

## Progress Overview

### ✅ Completed Fixes
1. **Timestamp Implementation**
   - Fixed all related ESLint errors.
2. **Entity Base Types**
   - Improved type safety.
3. **Easy Fixes**
   - Fixed `Function` type usage.
   - Fixed `async commit` method.
   - Addressed floating promises.
   - Handled unused variables & missing await in tests (using ignores).

### 🚧 Remaining Issues by Difficulty (44 Errors + 2 Features)

## Easy Fixes ✅ (Complete)
*Minor linter noise may remain in test files but is considered ignorable.*

## Medium Fixes (15 errors)

### 1. Test Type Safety (10 errors + 1 unbound method)

- **TestItem Type Mismatches (4 TS Errors in `performance.test.ts`)**
  - *Lines*: 102, 133, 195, 247
  - *Root Cause*: The `createTestItem` helper returns `Partial<TestItem>`, which doesn't fully match the type expected by `repository.create`. `create` likely expects all user-defined fields except auto-generated ones (`id`, `updatedAt`).
  - *Recommendation*: Modify `createTestItem` to return `Omit<TestItem, 'id' | 'updatedAt'>` to provide the correct data shape.

- **Any Types in Tests (6 ESLint Errors)**
  - *Locations*: `integration.test.ts:135`, `performance.test.ts:238`, `unit/stash.test.ts:183, 238, 242, 270, 282, 286`
  - *Root Causes*:
    - Intentional invalid input for error testing (`{} as any` in `integration.test.ts:135`).
    - Accessing potentially null/undefined properties after DB operations (`(result as any)?.prop` in `performance.test.ts:238`).
    - Accessing internal state or testing invalid arguments (`(Stash as any).adapter`, `null as any` in `unit/stash.test.ts`).
  - *Recommendations*:
    - For invalid input tests: Replace `as any` or `as Entity` with `@ts-expect-error` directive on the line above the call (e.g., `// @ts-expect-error 
 await expect(repo.create({})).rejects...`).
    - For property access: Ensure the preceding function returns the correct type (e.g., `Entity | null`) and use optional chaining (`result?.prop`). Fix the return type of the function if necessary.
    - For internal state/invalid args: Use `@ts-expect-error` with comments, or more specific casting (`null as unknown as ExpectedType`) only if a direct test setup function isn't feasible.

- **Unbound Method (1 ESLint Error in `unit/stash.test.ts`)**
  - *Line*: 174
  - *Root Cause*: Likely passing a method reference directly to `expect().toThrow()` without binding `this` (e.g., `expect(obj.method).toThrow()` instead of `expect(() => obj.method()).toThrow()`).
  - *Recommendation*: Wrap the method call in an arrow function: `expect(() => instance.method()).toThrow(...)`.

### 2. Decorator Type Safety (5 errors)

- **Collection Decorator (5 ESLint Errors in `src/decorators/collection.decorator.ts`)**
  - *Lines*: 40:46, 54:43 (Unexpected any); 45:58, 55:46 (Unsafe argument); 55:3 (Unsafe return)
  - *Root Cause*: Decorator function (`decorateCollection`) and helper (`getCollectionName`) accept `target: any`, triggering `no-explicit-any` and derived `unsafe-*` rules.
  - *Recommendation*: Change `target: any` to `target: Function` or `target: { new (...args: any[]): {} }` (constructor signature) for better type safety aligned with decorator usage.

## Hard Fixes (29 errors + 2 Features)

### 1. Batch Processor Type Safety (29 errors)

#### FS Batch Processor (13 ESLint Errors)
- Unexpected any (5)
- Unsafe assignment (4)
- Unsafe member access (4)

#### Memory Batch Processor (16 ESLint Errors)
- Unexpected any (8)
- Unsafe assignment (5)
- Unsafe member access (1)
- Unsafe Map assignment (1)
- prefer-promise-reject-errors (1)

### 2. Field Path Type Safety (Feature)
### 3. Query Operator Type Safety (Feature)

## Implementation Strategy

### Phase 1: Easy Wins ✅

### Phase 2: Test Improvements
1. Fix TestItem type definitions (Modify `createTestItem` return type)
2. Remove `any` types from tests (Use `@ts-expect-error` or optional chaining)
3. Fix unbound method error (Wrap method calls in arrow functions for `expect.toThrow`)

### Phase 3: Core Type Safety
1. Implement batch processor types
2. Fix collection decorator types
3. Add field path type safety
4. Implement query operator types

## Notes
- Each phase should include tests
- Run `pnpm run lint --fix` after each change
- Update documentation as we progress
- Consider backwards compatibility
- **Future Consideration**: Explore standardizing input types for `create` and `update` operations (currently inferred as `Omit<T, ...>`) into a dedicated utility type, e.g., `DataFieldsOnly<T extends BaseEntity>`, to improve consistency and clarity across repository methods. 