import "reflect-metadata";
import { InMemoryAdapter } from "../../src/adapters";
import { Collection } from "../../src/decorators";
import { IDatabaseAdapter, IRepository } from "../../src/interfaces";
import { Entity } from "../../src/models/entity.model";
import { Stash } from "../../src/stash";

/**
 * Mock entity for testing
 */
@Collection({ name: "test-entities" })
class TestEntity {
  id!: string;
  name!: string;
}

/**
 * Mock repository for testing
 */
class MockRepository<T extends object> implements IRepository<T> {
  // Mock implementations of required methods
  async findById(id: string): Promise<(Entity<T> & T) | null> {
    return null;
  }

  async getById(id: string): Promise<Entity<T> & T> {
    return {} as Entity<T> & T;
  }

  async findAll(): Promise<(Entity<T> & T)[]> {
    return [];
  }

  async create(data: Partial<T>, id?: string): Promise<Entity<T> & T> {
    return {} as Entity<T> & T;
  }

  async update(id: string, data: Partial<T>): Promise<Entity<T> & T> {
    return {} as Entity<T> & T;
  }

  async delete(id: string): Promise<void> {
    // Do nothing
  }

  async deleteAll(): Promise<void> {
    // Do nothing
  }

  query(): any {
    return {};
  }

  batch(): any {
    return {};
  }
}

/**
 * Mock adapter for testing
 */
class MockAdapter implements IDatabaseAdapter {
  private isConnectedFlag = false;
  private connectionError = false;
  private disconnectionError = false;

  // Add a static method to the MockAdapter to reset Stash state for testing
  static resetStash() {
    // This uses a type cast to access the private adapter property
    (Stash as any).adapter = null;
  }

  async connect(options?: any): Promise<void> {
    if (this.connectionError) {
      throw new Error("Mock connection error");
    }
    this.isConnectedFlag = true;
  }

  async disconnect(): Promise<void> {
    if (this.disconnectionError) {
      throw new Error("Mock disconnection error");
    }
    this.isConnectedFlag = false;
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  getRepository<T extends object>(entityClass: any): IRepository<T> {
    return new MockRepository<T>();
  }

  simulateConnectionError(flag = true): void {
    this.connectionError = flag;
  }

  simulateDisconnectionError(flag = true): void {
    this.disconnectionError = flag;
  }
}

// Real adapter test
@Collection({ name: "real-test-entities" })
class RealTestEntity {
  id!: string;
  name!: string;
}

describe("Stash", () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    // Reset Stash state directly
    MockAdapter.resetStash();
    adapter = new MockAdapter();
  });

  afterEach(async () => {
    // Reset Stash state directly instead of trying to disconnect
    MockAdapter.resetStash();
  });

  it("should connect to an adapter", async () => {
    await Stash.connect(adapter);
    expect(Stash.isConnected()).toBe(true);
  });

  it("should pass options to the adapter during connection", async () => {
    const options = { customOption: "value" };
    // Spy on the adapter's connect method
    const connectSpy = jest.spyOn(adapter, "connect");
    await Stash.connect(adapter, options);
    expect(connectSpy).toHaveBeenCalledWith(options);
  });

  it("should throw an error if null adapter provided", async () => {
    await expect(Stash.connect(null as any)).rejects.toThrow(
      "Adapter cannot be null or undefined"
    );
  });

  it("should throw an error if already connected", async () => {
    await Stash.connect(adapter);
    // Try to connect again
    await expect(Stash.connect(adapter)).rejects.toThrow(
      "Stash is already connected to an adapter"
    );
  });

  it("should handle connection errors", async () => {
    adapter.simulateConnectionError();
    await expect(Stash.connect(adapter)).rejects.toThrow(
      "Failed to connect to adapter: Mock connection error"
    );
    expect(Stash.isConnected()).toBe(false);
  });

  it("should disconnect from the adapter", async () => {
    await Stash.connect(adapter);
    await Stash.disconnect();
    // Check that we're disconnected
    expect(Stash.isConnected()).toBe(false);
  });

  it("should throw an error if disconnecting when not connected", async () => {
    await expect(Stash.disconnect()).rejects.toThrow(
      "Stash is not connected to an adapter"
    );
  });

  it("should handle disconnection errors", async () => {
    await Stash.connect(adapter);
    adapter.simulateDisconnectionError();
    // Try to disconnect, should throw
    await expect(Stash.disconnect()).rejects.toThrow(
      "Failed to disconnect from adapter: Mock disconnection error"
    );
    // Stash should still be marked as connected even if disconnect failed
    expect(Stash.isConnected()).toBe(true);
    // Reset for cleanup
    adapter.simulateDisconnectionError(false);
    await Stash.disconnect();
    expect(Stash.isConnected()).toBe(false);
  });

  it("should check if connected correctly", () => {
    expect(Stash.isConnected()).toBe(false);
    // Manually set as connected
    (Stash as any).adapter = adapter;
    adapter.connect();
    expect(Stash.isConnected()).toBe(true);
    // Cleanup
    (Stash as any).adapter = null;
  });

  it("should get a repository", async () => {
    // Connect to the adapter
    await Stash.connect(adapter);
    // Spy on adapter's getRepository method
    const getRepositorySpy = jest.spyOn(adapter, "getRepository");
    // Get a repository
    const repository = Stash.getRepository(TestEntity);
    // Check that adapter.getRepository was called with TestEntity
    expect(getRepositorySpy).toHaveBeenCalledWith(TestEntity);
    // Clean up
    await Stash.disconnect();
  });

  it("should throw an error if getting repository when not connected", async () => {
    expect(() => Stash.getRepository(TestEntity)).toThrow(
      "Stash is not connected to an adapter"
    );
  });

  it("should throw an error if null entity class provided", async () => {
    // Connect to avoid "not connected" error
    await Stash.connect(adapter);
    expect(() => Stash.getRepository(null as any)).toThrow(
      "Entity class cannot be null or undefined"
    );
    await Stash.disconnect();
  });

  it("should expose the current adapter via getAdapter", () => {
    expect(Stash.getAdapter()).toBeNull();
    // Connect and check
    adapter.connect();
    (Stash as any).adapter = adapter;
    expect(Stash.getAdapter()).toBe(adapter);
    // Clean up
    adapter.disconnect();
    (Stash as any).adapter = null;
    expect(() => Stash.getRepository(TestEntity)).toThrow(
      "Stash is not connected to an adapter"
    );
  });

  // Test with a real adapter to ensure end-to-end functionality
  it("should work with a real adapter", async () => {
    // Make sure we're disconnected before this test
    if (Stash.isConnected()) {
      await Stash.disconnect();
    }

    // Use the InMemoryAdapter as a real adapter
    const realAdapter = new InMemoryAdapter();
    await Stash.connect(realAdapter);
    // Should be connected
    expect(Stash.isConnected()).toBe(true);

    // Get a repository
    const repo = Stash.getRepository<RealTestEntity>(RealTestEntity);

    // Create a test entity
    const entity = await repo.create({
      name: "Test Entity",
    });

    // Debug the entity content
    console.log("Entity:", JSON.stringify(entity));

    // Should have an ID
    expect(entity.id).toBeDefined();

    // Instead of using 'as any', we'll cast to the expected type
    const entityData = entity as Entity<RealTestEntity> & RealTestEntity;
    const foundEntity = await repo.findById(entity.id);

    if (foundEntity) {
      // Access properties using the properly typed entity
      console.log("Found entity name:", (foundEntity as RealTestEntity).name);
    }

    expect(foundEntity).not.toBeNull();

    // Clean up
    await Stash.disconnect();
    expect(Stash.isConnected()).toBe(false);
  });
});
