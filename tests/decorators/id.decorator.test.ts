import "reflect-metadata";
import { getIdField, ID } from "../../src/decorators/id.decorator";
import { ID_FIELD_KEY } from "../../src/utils/metadata.utils";

describe("ID Decorator", () => {
  // Define test class
  class TestEntity {
    @ID()
    id!: string;

    name!: string;
  }

  it("should store ID field metadata", () => {
    // Get metadata directly
    const idField = Reflect.getMetadata(ID_FIELD_KEY, TestEntity);

    // Assert
    expect(idField).toBe("id");
  });

  it("should retrieve ID field using getIdField function", () => {
    // Get ID field using helper function
    const idField = getIdField(TestEntity);

    // Assert
    expect(idField).toBe("id");
  });

  it("should return undefined when getting ID field from a class without the decorator", () => {
    // Arrange
    class Regular {
      id!: string;
    }

    // Act
    const idField = getIdField(Regular);

    // Assert
    expect(idField).toBeUndefined();
  });

  it("should work with different property names", () => {
    // Arrange
    class CustomIdEntity {
      @ID()
      customId!: string;
    }

    // Act
    const idField = getIdField(CustomIdEntity);

    // Assert
    expect(idField).toBe("customId");
  });
});
