import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import "reflect-metadata";
import { Stash } from "../../src";
import { InMemoryAdapter } from "../../src/adapters/memory/memory.adapter";
import { Collection, Field } from "../../src/decorators";
import { Creatable } from "../../src/interfaces/entity.interface";
import {
  ComparisonOperator,
  SortDirection,
} from "../../src/interfaces/query.interface";

// --- Test Entity Definition ---

class NestedData {
  @IsString()
  nestedProp!: string;

  @IsNumber()
  @IsOptional()
  nestedNum?: number;
}

@Collection({ name: "test_data" })
class TestDataEntity {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsInt()
  @Min(0)
  count!: number;

  @Field()
  @IsBoolean()
  isActive!: boolean;

  @Field()
  @IsArray()
  @IsString({ each: true })
  tags!: string[];

  @Field()
  @IsDate()
  @Type(() => Date)
  eventTimestamp!: Date;

  @Field()
  @IsObject()
  @ValidateNested()
  @Type(() => NestedData)
  nested!: NestedData;

  @Field()
  @IsOptional()
  @IsString()
  optionalField?: string;
}

// --- Test Suite ---

describe("InMemoryAdapter Repository Tests", () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
    adapter = new InMemoryAdapter();
    await Stash.connect(adapter);
  });

  afterEach(async () => {
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
  });

  // --- CRUD Tests ---
  describe("CRUD Operations", () => {
    it("should create an entity with correct data and metadata", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const initialData: Creatable<TestDataEntity> = {
        name: "Test Create",
        count: 10,
        isActive: true,
        tags: ["a", "b"],
        eventTimestamp: new Date("2023-01-01T10:00:00Z"),
        nested: { nestedProp: "nested create" },
      };
      const created = await repo.create(initialData);

      expect(created.id).toBeDefined();
      expect(created.data.name).toBe("Test Create");
      expect(created.data.count).toBe(10);
      expect(created.data.isActive).toBe(true);
      expect(created.data.tags).toEqual(["a", "b"]);
      expect(created.data.eventTimestamp).toEqual(
        new Date("2023-01-01T10:00:00Z")
      );
      expect(created.data.nested.nestedProp).toBe("nested create");
      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.updatedAt).toBeInstanceOf(Date);
      expect(created.createdAt.getTime()).toBeCloseTo(
        created.updatedAt.getTime()
      );
    });

    it("should find an entity by ID", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const created = await repo.create({
        name: "Test Find",
        count: 1,
        isActive: false,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "find me" },
      });

      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found?.data.name).toBe("Test Find");
      expect(found?.data.nested.nestedProp).toBe("find me");
    });

    it("should return null when finding by non-existent ID", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const found = await repo.findById("non-existent-id");
      expect(found).toBeNull();
    });

    it("should update an existing entity", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const created = await repo.create({
        name: "Test Update",
        count: 5,
        isActive: true,
        tags: ["initial"],
        eventTimestamp: new Date("2023-02-01T00:00:00Z"),
        nested: { nestedProp: "before update" },
      });

      const updateTimeBefore = created.updatedAt;
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedData: Partial<TestDataEntity> = {
        name: "Updated Name",
        count: 200,
        isActive: false,
        eventTimestamp: new Date("2024-01-02"),
        tags: ["c", "d"],
        nested: {
          nestedProp: "after update",
        },
        optionalField: "updated optional",
      };
      const updatedDoc = await repo.update(created.id, updatedData);

      expect(updatedDoc).not.toBeNull();
      expect(updatedDoc?.data.name).toBe("Updated Name");
      expect(updatedDoc?.data.count).toBe(200);
      expect(updatedDoc?.data.isActive).toBe(false);
      expect(updatedDoc?.data.tags).toEqual(["c", "d"]);
      expect(updatedDoc?.data.eventTimestamp).toEqual(new Date("2024-01-02"));
      expect(updatedDoc?.data.nested.nestedProp).toBe("after update");
      expect(updatedDoc?.data.optionalField).toBe("updated optional");
      expect(updatedDoc?.updatedAt.getTime()).toBeGreaterThan(
        updateTimeBefore.getTime()
      );
      expect(updatedDoc?.createdAt).toEqual(created.createdAt);
    });

    it("should correctly update nested properties (fetch and modify)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const created = await repo.create({
        name: "Test Nested Update",
        count: 50,
        isActive: true,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "initial nested", nestedNum: 500 },
      });

      const fetched = await repo.findById(created.id);
      expect(fetched).not.toBeNull();
      if (!fetched) return;

      const dataToUpdate: Partial<TestDataEntity> = {
        nested: { ...fetched.data.nested, nestedProp: "updated nested" },
        count: 55,
      };

      const updated = await repo.update(created.id, dataToUpdate);

      expect(updated).not.toBeNull();
      expect(updated?.data.count).toBe(55);
      expect(updated?.data.nested.nestedProp).toBe("updated nested");
      expect(updated?.data.nested.nestedNum).toBe(500);
    });

    it("should throw error when updating a non-existent ID", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      await expect(
        repo.update("non-existent-id", {
          name: "Wont Work",
        })
      ).rejects.toThrow();
    });

    it("should delete an existing entity", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const created = await repo.create({
        name: "Test Delete",
        count: 1,
        isActive: false,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "delete me" },
      });

      await repo.delete(created.id);
      const found = await repo.findById(created.id);
      expect(found).toBeNull();
    });

    it("should handle deleting a non-existent ID gracefully", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      await expect(repo.delete("non-existent-id")).resolves.toBeUndefined();
    });
  });

  // --- Query Tests ---
  describe("Query Operations", () => {
    beforeEach(async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const itemsToCreate: Creatable<TestDataEntity>[] = [
        {
          name: "Alice",
          count: 5,
          isActive: true,
          tags: ["a", "b"],
          eventTimestamp: new Date("2023-01-01"),
          nested: { nestedProp: "A" },
        },
        {
          name: "Bob",
          count: 10,
          isActive: false,
          tags: ["b", "c"],
          eventTimestamp: new Date("2023-01-02"),
          nested: { nestedProp: "B", nestedNum: 100 },
        },
        {
          name: "Charlie",
          count: 5,
          isActive: true,
          tags: ["a", "c"],
          eventTimestamp: new Date("2023-01-03"),
          nested: { nestedProp: "C" },
        },
        {
          name: "David",
          count: 15,
          isActive: false,
          tags: ["d"],
          eventTimestamp: new Date("2023-01-04"),
          nested: { nestedProp: "D", nestedNum: 200 },
          optionalField: "davidOpt",
        },
        {
          name: "Eve",
          count: 8,
          isActive: true,
          tags: ["e"],
          eventTimestamp: new Date("2023-01-05"),
          nested: { nestedProp: "E" },
          optionalField: "eveOpt",
        },
      ];
      for (const item of itemsToCreate) {
        await repo.create(item);
      }
    });

    it("should find all entities", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo.findAll();
      expect(results.length).toBe(5);
    });

    it("should query by simple field (Equals)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.name", ComparisonOperator.Equals, "Alice")
        .getResults();
      expect(results.length).toBe(1);
      expect(results[0].data.name).toBe("Alice");
    });

    it("should query by simple field (NotEquals)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.name", ComparisonOperator.NotEquals, "Alice")
        .getResults();
      expect(results.length).toBe(4);
      expect(results.some((r) => r.data.name === "Alice")).toBe(false);
    });

    it("should query by number field (GreaterThan)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.count", ComparisonOperator.GreaterThan, 8)
        .getResults();
      expect(results.length).toBe(2);
      expect(results.some((r) => r.data.name === "Bob")).toBe(true);
      expect(results.some((r) => r.data.name === "David")).toBe(true);
    });

    it("should query by boolean field", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .getResults();
      expect(results.length).toBe(3);
      expect(results.every((r) => r.data.isActive === true)).toBe(true);
    });

    it("should query by nested field path (Equals)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.nested.nestedProp", ComparisonOperator.Equals, "B")
        .getResults();
      expect(results.length).toBe(1);
      expect(results[0].data.name).toBe("Bob");
      expect(results[0].data.nested.nestedProp).toBe("B");
    });

    it("should query by nested field path (GreaterThanOrEqual)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const resultsRef = await repo
        .query()
        .where(
          "data.nested.nestedNum",
          ComparisonOperator.GreaterThanOrEqual,
          150
        )
        .getResults();
      const results = resultsRef;
      expect(results.length).toBe(1);
      expect(results[0].data.name).toBe("David");
    });

    it("should query using IN operator", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.name", ComparisonOperator.In, ["Alice", "Eve"])
        .getResults();
      expect(results.length).toBe(2);
      expect(results.map((r) => r.data.name).sort()).toEqual(["Alice", "Eve"]);
    });

    it("should query using NotIn operator", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.name", ComparisonOperator.NotIn, [
          "Alice",
          "Eve",
          "Charlie",
        ])
        .getResults();
      expect(results.length).toBe(2);
      expect(results.map((r) => r.data.name).sort()).toEqual(["Bob", "David"]);
    });

    it("should query using ArrayContains operator", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.tags", ComparisonOperator.ArrayContains, "c")
        .getResults();
      expect(results.length).toBe(2);
      expect(results.some((r) => r.data.name === "Bob")).toBe(true);
      expect(results.some((r) => r.data.name === "Charlie")).toBe(true);
    });

    it("should query using ArrayContainsAny operator", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.tags", ComparisonOperator.ArrayContainsAny, ["c", "d"])
        .getResults();
      expect(results.length).toBe(3);
      expect(results.some((r) => r.data.name === "Bob")).toBe(true);
      expect(results.some((r) => r.data.name === "Charlie")).toBe(true);
      expect(results.some((r) => r.data.name === "David")).toBe(true);
    });

    it("should combine multiple where clauses (AND)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .where("data.count", ComparisonOperator.Equals, 5)
        .getResults();
      expect(results.length).toBe(2);
      expect(results.some((r) => r.data.name === "Alice")).toBe(true);
      expect(results.some((r) => r.data.name === "Charlie")).toBe(true);
    });

    it("should apply limit", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo.query().limit(2).getResults();
      expect(results.length).toBe(2);
    });

    it("should apply skip", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const allSorted = await repo
        .query()
        .orderBy("data.name", SortDirection.Ascending)
        .getResults();

      const skippedResults = await repo
        .query()
        .orderBy("data.name", SortDirection.Ascending)
        .skip(2)
        .getResults();
      expect(skippedResults.length).toBe(allSorted.length - 2);
      expect(skippedResults[0].data.name).toBe(allSorted[2].data.name);
    });

    it("should apply skip and limit", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const allSorted = await repo
        .query()
        .orderBy("data.name", SortDirection.Ascending)
        .getResults();

      const paginatedResults = await repo
        .query()
        .orderBy("data.name", SortDirection.Ascending)
        .skip(1)
        .limit(2)
        .getResults();
      expect(paginatedResults.length).toBe(2);
      expect(paginatedResults[0].data.name).toBe(allSorted[1].data.name);
      expect(paginatedResults[1].data.name).toBe(allSorted[2].data.name);
    });

    it("should apply orderBy (Ascending)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .orderBy("data.count", SortDirection.Ascending)
        .getResults();
      expect(results.length).toBe(5);
      expect(results.map((r) => r.data.count)).toEqual([5, 5, 8, 10, 15]);
      expect(results.map((r) => r.data.name)).toEqual([
        "Alice",
        "Charlie",
        "Eve",
        "Bob",
        "David",
      ]);
    });

    it("should apply orderBy (Descending)", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .orderBy("data.eventTimestamp", SortDirection.Descending)
        .getResults();
      expect(results.length).toBe(5);
      expect(results.map((r) => r.data.name)).toEqual([
        "Eve",
        "David",
        "Charlie",
        "Bob",
        "Alice",
      ]);
    });

    it("should apply multiple orderBy clauses", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .orderBy("data.isActive", SortDirection.Descending)
        .orderBy("data.count", SortDirection.Ascending)
        .getResults();
      expect(results.length).toBe(5);
      expect(results.map((r) => r.data.name)).toEqual([
        "Alice",
        "Charlie",
        "Eve",
        "Bob",
        "David",
      ]);
    });

    it("should apply orderBy on nested path", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .orderBy("data.nested.nestedNum", SortDirection.Descending)
        .getResults();

      const names = results.map((r) => r.data.name);
      expect(names.indexOf("David")).toBeLessThan(names.indexOf("Bob"));
      expect(results.filter((r) => r.data.nested.nestedNum).length).toBe(2);
    });

    it("should handle query with no results", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const results = await repo
        .query()
        .where("data.name", ComparisonOperator.Equals, "NonExistent")
        .getResults();
      expect(results.length).toBe(0);
    });

    it("should count results correctly", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const count = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .count();
      expect(count).toBe(3);
    });

    it("should count results correctly with limit", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const count = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .limit(2)
        .count();
      expect(count).toBe(2);
    });

    it("should count results correctly with skip", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const count = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .skip(1)
        .count();
      expect(count).toBe(2);
    });

    it("should count results correctly with skip and limit", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const count = await repo
        .query()
        .where("data.isActive", ComparisonOperator.Equals, true)
        .skip(1)
        .limit(1)
        .count();
      expect(count).toBe(1);
    });

    it("should clone query builder correctly", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const originalQuery = repo
        .query()
        .where("data.count", ComparisonOperator.GreaterThan, 5);
      const clonedQuery = originalQuery.clone();

      const limitedOriginalQuery = originalQuery.limit(1);
      const originalResults = await limitedOriginalQuery.getResults();

      const limitedClonedQuery = clonedQuery.limit(2);
      const clonedResults = await limitedClonedQuery.getResults();

      expect(limitedOriginalQuery.getQueryOptions().limit).toBe(1);
      expect(limitedClonedQuery.getQueryOptions().limit).toBe(2);
      expect(clonedQuery.getQueryOptions().conditions).toEqual(
        originalQuery.getQueryOptions().conditions
      );

      expect(originalResults.length).toBe(1);
      expect(clonedResults.length).toBe(2);
      expect(clonedResults[0].id).toEqual(originalResults[0].id);
    });
  });

  // --- ID Generator Tests ---
  describe("ID Generation", () => {
    it("should use default UUID generator if adapter has none", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const entityRef = await repo.create({
        name: "uuid-test",
        count: 0,
        isActive: false,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "default" },
      });
      const entity = entityRef;
      expect(entity.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should use sequential ID generator from adapter", async () => {
      await Stash.disconnect();
      const seqAdapter = new InMemoryAdapter({
        idGenerator: "sequential",
        sequentialIdPrefix: "seq-",
      });
      await Stash.connect(seqAdapter);

      const repo = Stash.getRepository(TestDataEntity);
      const entity1 = await repo.create({
        name: "seq-1",
        count: 1,
        isActive: true,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "s1" },
      });

      const entity2 = await repo.create({
        name: "seq-2",
        count: 2,
        isActive: true,
        tags: [],
        eventTimestamp: new Date(),
        nested: { nestedProp: "s2" },
      });

      expect(entity1.id).toBe("seq-1");
      expect(entity2.id).toBe("seq-2");
    });

    it("should allow custom ID on create", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const customId = "my-custom-id-123";
      const entity = await repo.create(
        {
          name: "custom-id-test",
          count: 1,
          isActive: true,
          tags: [],
          eventTimestamp: new Date(),
          nested: { nestedProp: "c1" },
        },
        customId
      );
      expect(entity.id).toBe(customId);
    });

    it("should throw error if creating with an existing custom ID", async () => {
      const repo = Stash.getRepository(TestDataEntity);
      const customId = "existing-custom-id";
      await repo.create(
        {
          name: "first custom",
          count: 1,
          isActive: true,
          tags: [],
          eventTimestamp: new Date(),
          nested: { nestedProp: "ex1" },
        },
        customId
      );

      await expect(
        repo.create(
          {
            name: "second custom fails",
            count: 1,
            isActive: true,
            tags: [],
            eventTimestamp: new Date(),
            nested: { nestedProp: "ex2" },
          },
          customId
        )
      ).rejects.toThrow(/already exists/);
    });
  });
});
