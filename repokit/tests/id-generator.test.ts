import "reflect-metadata";
import { InMemoryAdapter, Repokit } from "../src";
import { Collection, Field, ID } from "../src/decorators";
import { IIdGenerator } from "../src/interfaces";

// Define a simple sequential ID generator for testing
class SequentialIdGenerator implements IIdGenerator {
  private currentId = 0;

  constructor(startId = 0) {
    this.currentId = startId;
  }

  generateId(): string {
    return (++this.currentId).toString();
  }
}

// Define a test entity
@Collection({ name: "id-test-entities" })
class TestEntity {
  @ID()
  id!: string;

  @Field()
  name!: string;
}

describe("ID Generator Tests", () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    // Create a new adapter for each test
    adapter = new InMemoryAdapter();
    await Repokit.connect(adapter);
  });

  afterEach(async () => {
    await Repokit.disconnect();
  });

  it("should use UUID v4 by default", async () => {
    const repository = Repokit.getRepository<TestEntity>(TestEntity);

    // Create an entity without providing an ID
    const entity = await repository.create({ name: "Test Entity" });

    // UUID v4 format: 8-4-4-4-12 characters (36 total including hyphens)
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("should use custom ID generator when provided", async () => {
    // Set a sequential ID generator
    const sequentialGenerator = new SequentialIdGenerator(1000);
    adapter.setIdGenerator(sequentialGenerator);

    const repository = Repokit.getRepository<TestEntity>(TestEntity);

    // Create entities without providing IDs
    const entity1 = await repository.create({ name: "Entity 1" });
    const entity2 = await repository.create({ name: "Entity 2" });
    const entity3 = await repository.create({ name: "Entity 3" });

    // IDs should be sequential
    expect(entity1.id).toBe("1001");
    expect(entity2.id).toBe("1002");
    expect(entity3.id).toBe("1003");
  });

  it("should respect provided IDs even with custom generator", async () => {
    // Set a sequential ID generator
    adapter.setIdGenerator(new SequentialIdGenerator());

    const repository = Repokit.getRepository<TestEntity>(TestEntity);

    // Create entity with a specific ID
    const customIdEntity = await repository.create(
      { name: "Custom ID Entity" },
      "custom-id-123"
    );

    // The provided ID should be used
    expect(customIdEntity.id).toBe("custom-id-123");

    // Next auto-generated ID should still use the generator
    const autoIdEntity = await repository.create({ name: "Auto ID Entity" });
    expect(autoIdEntity.id).toBe("1"); // First ID from the generator
  });

  it("should allow changing ID generator at runtime", async () => {
    const repository = Repokit.getRepository<TestEntity>(TestEntity);

    // First entity uses default UUID generator
    const entity1 = await repository.create({ name: "UUID Entity" });
    expect(entity1.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Change to sequential generator
    adapter.setIdGenerator(new SequentialIdGenerator());

    // Next entity should use sequential generator
    const entity2 = await repository.create({ name: "Sequential Entity" });
    expect(entity2.id).toBe("1");
  });
});
