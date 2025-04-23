import "reflect-metadata";
import { InMemoryAdapter } from "../../src/adapters/memory/memory.adapter";
import { Collection } from "../../src/decorators";
import { BaseEntity } from "../../src/entities/base.entity";
import { IDatabaseAdapter } from "../../src/interfaces/adapter.interface";
import {
  Creatable,
  Entity,
  Updatable,
} from "../../src/interfaces/entity.interface";
import { IQueryBuilder } from "../../src/interfaces/query.interface";
import { IRepository } from "../../src/interfaces/repository.interface";
import { Stash } from "../../src/stash";
import { ClassType } from "../../src/utils/class.type";

// Define a simple DTO for the Data part
class TestDataDto {
  name!: string;
}

/**
 * Mock entity for testing - needs to implement Entity<Data>
 */
@Collection({ name: "test-entities" })
class TestEntity extends BaseEntity {
  data!: TestDataDto;
}

/**
 * Mock repository for testing
 */
class MockRepository<T extends Entity> implements IRepository<T> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findById(id: string): Promise<T | null> {
    return Promise.resolve(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getById(id: string): Promise<T> {
    return Promise.resolve({} as T);
  }

  findAll(): Promise<T[]> {
    return Promise.resolve([]);
  }

  create(data: Creatable<T>, id?: string): Promise<T> {
    return Promise.resolve({
      id: id ?? "mock-create-id",
      data,
      // Ensure other required Entity props are present if needed by consumers
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as T);
  }

  update(id: string, data: Updatable<T>): Promise<T> {
    return Promise.resolve({
      id, // id is used here
      data,
      // Ensure other required Entity props are present
      createdAt: new Date(), // Example date
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as T);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(id: string): Promise<void> {
    return Promise.resolve();
  }

  query(): IQueryBuilder<T> {
    throw new Error("Mock query not implemented");
  }
}

/**
 * Mock adapter for testing
 */
class MockAdapter implements IDatabaseAdapter {
  private isConnectedFlag = false;
  private connectionError = false;
  private disconnectionError = false;

  static resetStash() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Stash as any).adapter = null;
  }

  connect(options?: unknown): Promise<void> {
    // Use options if needed, e.g., log them
    // console.log("MockAdapter connecting with options:", options);
    if (options) {
      // Example usage to satisfy linter if needed
      // console.log("Options provided");
    }
    if (this.connectionError) {
      return Promise.reject(new Error("Mock connection error"));
    }
    this.isConnectedFlag = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    if (this.disconnectionError) {
      return Promise.reject(new Error("Mock disconnection error"));
    }
    this.isConnectedFlag = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  getRepository<T extends Entity>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    entityClass: ClassType<T>
  ): IRepository<T> {
    return new MockRepository<T>();
  }

  simulateConnectionError(flag = true): void {
    this.connectionError = flag;
  }

  simulateDisconnectionError(flag = true): void {
    this.disconnectionError = flag;
  }
}

// Real adapter test entity definition
@Collection({ name: "real-test-entities" })
class RealTestDataDto {
  name!: string;
}

@Collection({ name: "real-test-entities" })
class RealTestEntity extends BaseEntity {
  data!: RealTestDataDto;
}

describe("Stash", () => {
  let adapter: MockAdapter;

  beforeEach(() => {
    MockAdapter.resetStash();
    adapter = new MockAdapter();
  });

  afterEach(() => {
    MockAdapter.resetStash();
  });

  it("should connect to an adapter", async () => {
    await Stash.connect(adapter);
    expect(Stash.isConnected()).toBe(true);
  });

  it("should pass options to the adapter during connection", async () => {
    const options = { customOption: "value" };
    const connectSpy = jest.spyOn(adapter, "connect");
    await Stash.connect(adapter, options);
    expect(connectSpy).toHaveBeenCalledWith(options);
  });

  it("should throw an error if null adapter provided", async () => {
    // Use unknown for the cast to avoid 'any'
    await expect(
      Stash.connect(null as unknown as IDatabaseAdapter)
    ).rejects.toThrow("Adapter cannot be null or undefined");
  });

  it("should throw an error if already connected", async () => {
    await Stash.connect(adapter);
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
    await expect(Stash.disconnect()).rejects.toThrow(
      "Failed to disconnect from adapter: Mock disconnection error"
    );
    expect(Stash.isConnected()).toBe(true);
    adapter.simulateDisconnectionError(false);
    await Stash.disconnect();
    expect(Stash.isConnected()).toBe(false);
  });

  it("should check if connected correctly", async () => {
    expect(Stash.isConnected()).toBe(false);
    await adapter.connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Stash as any).adapter = adapter;
    expect(Stash.isConnected()).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Stash as any).adapter = null;
  });

  it("should get a repository", async () => {
    await Stash.connect(adapter);
    const getRepositorySpy = jest.spyOn(adapter, "getRepository");
    const repository = Stash.getRepository(TestEntity);
    expect(getRepositorySpy).toHaveBeenCalledWith(TestEntity);
    expect(repository).toBeInstanceOf(MockRepository);
    await Stash.disconnect();
  });

  it("should throw an error if getting repository when not connected", () => {
    expect(() => Stash.getRepository(TestEntity)).toThrow(
      "Stash is not connected to an adapter"
    );
  });

  it("should throw an error if null entity class provided", async () => {
    await Stash.connect(adapter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => Stash.getRepository(null as any)).toThrow(
      "Entity class cannot be null or undefined"
    );
    await Stash.disconnect();
  });

  it("should expose the current adapter via getAdapter", async () => {
    expect(Stash.getAdapter()).toBeNull();
    await adapter.connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Stash as any).adapter = adapter;
    expect(Stash.getAdapter()).toBe(adapter);
    await adapter.disconnect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Stash as any).adapter = null;
    expect(() => Stash.getRepository(TestEntity)).toThrow(
      "Stash is not connected to an adapter"
    );
  });

  it("should get repository for different entity type", async () => {
    await Stash.connect(adapter);
    const getRepositorySpy = jest.spyOn(adapter, "getRepository");
    const repository = Stash.getRepository(RealTestEntity);
    expect(getRepositorySpy).toHaveBeenCalledWith(RealTestEntity);
    expect(repository).toBeDefined();
    await Stash.disconnect();
  });

  // Test with a real adapter to ensure end-to-end functionality
  describe("with Real InMemoryAdapter", () => {
    let realAdapter: InMemoryAdapter;

    beforeEach(async () => {
      MockAdapter.resetStash();
      realAdapter = new InMemoryAdapter();
      await Stash.connect(realAdapter);
    });

    afterEach(async () => {
      await Stash.disconnect();
    });

    it("should get a real repository", () => {
      const repository = Stash.getRepository(RealTestEntity);
      expect(repository).toBeDefined();
    });
  });

  test("check getRepository() with connected adapter", async () => {
    const mockAdapter = new MockAdapter();
    await Stash.connect(mockAdapter);
    expect(Stash.isConnected()).toBe(true);

    class TestEntity extends BaseEntity {
      id = "";
      createdAt = new Date();
      updatedAt = new Date();
      deletedAt = null;
      data = {} as TestData;
      entityType = "test";

      toDomain(): this {
        return this;
      }

      toDto(): TestData {
        return this.data;
      }
    }

    class TestData {}

    const repository = Stash.getRepository(TestEntity);
    expect(repository).toBeInstanceOf(MockRepository);
  });

  test("check getRepository() with disconnected adapter", () => {
    // Make sure we have a clean slate
    MockAdapter.resetStash();
    // Don't try to disconnect as it will throw if already disconnected
    expect(Stash.isConnected()).toBe(false);

    class TestEntity extends BaseEntity {
      id = "";
      createdAt = new Date();
      updatedAt = new Date();
      deletedAt = null;
      data = {} as TestData;
      entityType = "test";

      toDomain(): this {
        return this;
      }

      toDto(): TestData {
        return this.data;
      }
    }

    class TestData {}

    expect(() => Stash.getRepository(TestEntity)).toThrow(
      "Stash is not connected to an adapter"
    );
  });
});
