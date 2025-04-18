import { performance } from "perf_hooks";
import "reflect-metadata";
import { InMemoryAdapter, Repokit } from "../src";
import { Collection, CreatedAt, Field, ID, UpdatedAt } from "../src/decorators";

// Define a test entity class
@Collection({ name: "performance-test-items" })
class TestItem {
  @ID()
  id!: string;

  @Field()
  name!: string;

  @Field()
  value!: number;

  @Field()
  tags!: string[];

  @CreatedAt()
  createdAt!: Date;

  @UpdatedAt()
  updatedAt!: Date;
}

describe("Repokit Performance Tests", () => {
  let adapter: InMemoryAdapter;

  beforeAll(async () => {
    // Create adapter and connect
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
  });

  afterAll(async () => {
    // Disconnect after all tests
    await Repokit.disconnect();
  });

  describe("Memory Usage", () => {
    it("should efficiently handle large datasets", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);
      const initialMemory = process.memoryUsage().heapUsed;

      // Create 1000 items
      const batchSize = 1000;
      const itemIds: string[] = [];

      console.log(`Initial memory usage: ${formatMemoryUsage(initialMemory)}`);

      // Create items in batches
      const startTime = performance.now();
      for (let i = 0; i < batchSize; i++) {
        const item = await repository.create({
          name: `Item ${i}`,
          value: i,
          tags: [`tag${i % 10}`, `group${i % 5}`],
        });
        itemIds.push(item.id);
      }
      const endTime = performance.now();

      const afterCreationMemory = process.memoryUsage().heapUsed;
      console.log(
        `Memory after creating ${batchSize} items: ${formatMemoryUsage(
          afterCreationMemory
        )}`
      );
      console.log(
        `Average creation time per item: ${(endTime - startTime) / batchSize}ms`
      );

      // Memory increase per item
      const memoryPerItem = (afterCreationMemory - initialMemory) / batchSize;
      console.log(
        `Approximate memory per item: ${formatMemoryUsage(memoryPerItem)}`
      );

      // Check total memory usage is reasonable
      // Note: This is a soft assertion since memory usage can vary by environment
      expect(memoryPerItem).toBeLessThan(1024 * 10); // Less than 10KB per item
    });
  });

  describe("Query Performance", () => {
    beforeEach(async () => {
      // Create a fresh repository for each test
      const repository = Repokit.getRepository<TestItem>(TestItem);

      // Clear collection
      const store = adapter.getStore();
      if (store["performance-test-items"]) {
        store["performance-test-items"].clear();
      }

      // Create 1000 items with various tags
      for (let i = 0; i < 1000; i++) {
        await repository.create({
          name: `Query Item ${i}`,
          value: i,
          tags: [
            `tag${i % 10}`,
            `category${i % 5}`,
            i % 2 === 0 ? "even" : "odd",
          ],
        });
      }
    });

    it("should efficiently handle equality queries", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);

      // Measure query performance
      const startTime = performance.now();
      const results = await repository
        .query()
        .where("value", "==", 500)
        .getResults();
      const endTime = performance.now();

      expect(results.length).toBe(1);
      console.log(`Equality query execution time: ${endTime - startTime}ms`);

      // Soft assertion - query should be reasonably fast
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
    });

    it("should efficiently handle range queries", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);

      // Measure query performance
      const startTime = performance.now();
      const results = await repository
        .query()
        .where("value", ">=", 400)
        .where("value", "<", 500)
        .getResults();
      const endTime = performance.now();

      expect(results.length).toBe(100);
      console.log(`Range query execution time: ${endTime - startTime}ms`);

      // Soft assertion - query should be reasonably fast
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
    });

    it("should efficiently handle array-contains queries", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);

      // Measure query performance
      const startTime = performance.now();
      const results = await repository
        .query()
        .where("tags", "array-contains", "tag3")
        .getResults();
      const endTime = performance.now();

      expect(results.length).toBe(100); // Should match 10% of items
      console.log(
        `Array-contains query execution time: ${endTime - startTime}ms`
      );

      // Soft assertion - query should be reasonably fast
      expect(endTime - startTime).toBeLessThan(50); // Less than 50ms
    });

    it("should efficiently handle complex queries with ordering and limits", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);

      // Measure complex query performance
      const startTime = performance.now();
      const results = await repository
        .query()
        .where("tags", "array-contains", "even")
        .where("value", ">", 200)
        .orderBy("value", "desc")
        .limit(20)
        .getResults();
      const endTime = performance.now();

      expect(results.length).toBe(20);
      console.log(`Complex query execution time: ${endTime - startTime}ms`);

      // Verify ordering
      const values = results.map((r) => (r as unknown as TestItem).value);
      expect(values[0]).toBeGreaterThan(values[1]); // Descending order

      // Soft assertion - complex query should be reasonably fast
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
    });
  });

  describe("Batch Operation Performance", () => {
    it("should efficiently handle batch operations", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);
      const batchSize = 100;

      // Create a fresh store
      const store = adapter.getStore();
      if (store["performance-test-items"]) {
        store["performance-test-items"].clear();
      }

      // Create batch
      const batch = repository.batch();

      // Add operations to batch
      const startTime = performance.now();
      for (let i = 0; i < batchSize; i++) {
        batch.create(
          TestItem,
          {
            name: `Batch Item ${i}`,
            value: i,
            tags: [`batch${i % 10}`],
          },
          `batch-id-${i}`
        );
      }

      // Commit batch
      await batch.commit();
      const endTime = performance.now();

      console.log(
        `Batch operation with ${batchSize} items: ${endTime - startTime}ms`
      );
      console.log(
        `Average time per operation: ${(endTime - startTime) / batchSize}ms`
      );

      // Verify all items were created
      const allItems = await repository.query().getResults();
      expect(allItems.length).toBe(batchSize);

      // Soft assertion - batch operations should be efficient
      expect((endTime - startTime) / batchSize).toBeLessThan(1); // Less than 1ms per operation
    });

    it("should efficiently handle batch rollbacks", async () => {
      const repository = Repokit.getRepository<TestItem>(TestItem);
      const batchSize = 100;

      // Create a fresh store
      const store = adapter.getStore();
      if (store["performance-test-items"]) {
        store["performance-test-items"].clear();
      }

      // Create some initial items for updating
      const initialIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const item = await repository.create({
          name: `Initial Item ${i}`,
          value: i,
          tags: ["initial"],
        });
        initialIds.push(item.id);
      }

      // Create batch with a mix of valid and invalid operations
      const batch = repository.batch();

      // Add valid operations
      for (let i = 0; i < batchSize; i++) {
        batch.create(
          TestItem,
          {
            name: `New Batch Item ${i}`,
            value: i,
            tags: ["new"],
          },
          `new-id-${i}`
        );
      }

      // Update existing items
      for (const id of initialIds) {
        batch.update(TestItem, id, { tags: ["updated"] });
      }

      // Add invalid operation that will cause rollback
      batch.update(TestItem, "non-existent-id", { value: 999 });

      // Measure rollback performance
      const startTime = performance.now();
      try {
        await batch.commit();
      } catch (error) {
        // Expected error
      }
      const endTime = performance.now();

      console.log(
        `Batch rollback with ${batchSize + initialIds.length + 1} operations: ${
          endTime - startTime
        }ms`
      );

      // Verify no new items were created and existing items weren't updated
      const allItems = await repository.query().getResults();
      expect(allItems.length).toBe(10); // Only initial items

      const firstItem = await repository.findById(initialIds[0]);
      expect((firstItem as unknown as TestItem)?.tags).toEqual(["initial"]); // Not updated

      // Soft assertion - rollback should be reasonably fast
      expect(endTime - startTime).toBeLessThan(200); // Less than 200ms for rollback
    });
  });

  describe("Transformation Performance", () => {
    it("should efficiently transform data between entity and database formats", async () => {
      // Create entity with custom transformers
      @Collection({ name: "transform-test" })
      class TransformItem {
        @ID()
        id!: string;

        @Field({
          transformer: {
            toDatabaseFormat: (obj: Record<string, any>) => JSON.stringify(obj),
            fromDatabaseFormat: (str: string) => JSON.parse(str),
          },
        })
        complexObject!: Record<string, any>;

        @Field({
          transformer: {
            toDatabaseFormat: (arr: string[]) => arr.join(","),
            fromDatabaseFormat: (str: string) => (str ? str.split(",") : []),
          },
        })
        stringArray!: string[];

        @Field()
        simpleValue!: number;

        @CreatedAt()
        createdAt!: Date;

        @UpdatedAt()
        updatedAt!: Date;
      }

      // Create repository
      const repository = Repokit.getRepository<TransformItem>(TransformItem);

      // Create complex object
      const complexObject = {
        nested: {
          properties: {
            with: {
              deep: {
                nesting: [1, 2, 3, 4, 5],
              },
            },
          },
        },
        arrayOfObjects: Array(50)
          .fill(0)
          .map((_, i) => ({ id: i, value: `value-${i}` })),
      };

      // Create string array
      const stringArray = Array(100)
        .fill(0)
        .map((_, i) => `item-${i}`);

      // Measure transformation performance
      const startCreateTime = performance.now();
      const item = await repository.create({
        complexObject,
        stringArray,
        simpleValue: 42,
      });
      const endCreateTime = performance.now();

      console.log(
        `Create with transformations: ${endCreateTime - startCreateTime}ms`
      );

      // Measure read transformation performance
      const startReadTime = performance.now();
      const retrievedItem = await repository.findById(item.id);
      const endReadTime = performance.now();

      console.log(
        `Read with transformations: ${endReadTime - startReadTime}ms`
      );

      // Verify transformations worked correctly
      expect(
        (retrievedItem as unknown as TransformItem)?.complexObject
      ).toBeDefined();
      expect(
        (retrievedItem as unknown as TransformItem)?.complexObject.nested
      ).toBeDefined();
      expect(
        (retrievedItem as unknown as TransformItem)?.stringArray.length
      ).toBe(100);

      // Soft assertions on performance
      expect(endCreateTime - startCreateTime).toBeLessThan(50); // Less than 50ms
      expect(endReadTime - startReadTime).toBeLessThan(50); // Less than 50ms
    });
  });
});

// Helper function to format memory usage
function formatMemoryUsage(bytes: number): string {
  return bytes < 1024
    ? `${bytes} bytes`
    : bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(2)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
