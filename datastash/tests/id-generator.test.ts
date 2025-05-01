import "reflect-metadata";
import { Stash } from "../src";
import { InMemoryAdapter } from "../src/adapters/memory/memory.adapter"; // Import adapter
import { Collection, Field } from "../src/decorators"; // Removed unused ID import
import { Creatable } from "../src/interfaces/entity.interface"; // Import Creatable and Ref

// Mock the uuid library
jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
// Import v4 *after* mocking
import { v4 as uuidv4 } from "uuid";

// Define the domain entity class
@Collection({ name: "test_entities" })
class TestEntity {
  @Field()
  name!: string;
}

describe("Repository ID Generation", () => {
  let adapter: InMemoryAdapter;

  beforeEach(async () => {
    // Reset mocks and connection before each test
    (uuidv4 as jest.Mock).mockClear();
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
    // Using default adapter (which should use UUID)
    adapter = new InMemoryAdapter();
    await Stash.connect(adapter);
  });

  afterEach(async () => {
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }
  });

  it("should use default UUIDv4 from AbstractRepository fallback", async () => {
    // Get repository with only Entity class
    const repo = Stash.getRepository(TestEntity);

    // Set a specific return value for the mocked v4
    const mockUuid = "mock-uuid-12345678";
    (uuidv4 as jest.Mock).mockReturnValue(mockUuid);

    // Create data matches Creatable<TestEntity>
    const createData: Creatable<TestEntity> = { name: "test-uuid" };
    const entity = await repo.create(createData);

    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(entity.id).toBe(mockUuid);
    // Access property directly
    expect(entity.data.name).toBe("test-uuid");
  });

  // Add a test for custom ID usage if not present
  it("should allow custom ID on create", async () => {
    const repo = Stash.getRepository(TestEntity);
    const customId = "my-test-custom-id";
    const entity = await repo.create({ name: "custom-id" }, customId);
    expect(uuidv4).not.toHaveBeenCalled(); // Should not call uuid generator
    expect(entity.id).toBe(customId);
    expect(entity.data.name).toBe("custom-id");
  });

  // Add a test for adapter-provided ID (e.g., sequential)
  it("should use ID generator from adapter if provided", async () => {
    await Stash.disconnect(); // Disconnect default adapter
    const seqAdapter = new InMemoryAdapter({
      idGenerator: "sequential",
      sequentialIdPrefix: "item-",
    });
    await Stash.connect(seqAdapter);

    const repo = Stash.getRepository(TestEntity);
    const entity1 = await repo.create({ name: "item1" });

    const entity2 = await repo.create({ name: "item2" });

    expect(uuidv4).not.toHaveBeenCalled(); // Should not call uuid generator
    expect(entity1.id).toBe("item-1");
    expect(entity2.id).toBe("item-2");
  });
});
