import "reflect-metadata";
import {
  CreatedAt,
  getCreatedAtField,
  getUpdatedAtField,
  UpdatedAt,
} from "../../src/decorators/timestamp.decorators";
import { CREATED_AT_KEY, UPDATED_AT_KEY } from "../../src/utils/metadata.utils";

describe("Timestamp Decorators", () => {
  // Define test class
  class TestEntity {
    id!: string;

    @CreatedAt()
    createdAt!: Date;

    @UpdatedAt()
    updatedAt!: Date;
  }

  describe("CreatedAt Decorator", () => {
    it("should store createdAt field metadata", () => {
      // Get metadata directly
      const createdAtField = Reflect.getMetadata(CREATED_AT_KEY, TestEntity);

      // Assert
      expect(createdAtField).toBe("createdAt");
    });

    it("should retrieve createdAt field using getCreatedAtField function", () => {
      // Get createdAt field using helper function
      const createdAtField = getCreatedAtField(TestEntity);

      // Assert
      expect(createdAtField).toBe("createdAt");
    });

    it("should return undefined when getting createdAt field from a class without the decorator", () => {
      // Arrange
      class Regular {
        createdAt!: Date;
      }

      // Act
      const createdAtField = getCreatedAtField(Regular);

      // Assert
      expect(createdAtField).toBeUndefined();
    });

    it("should work with different property names", () => {
      // Arrange
      class CustomEntity {
        @CreatedAt()
        created!: Date;
      }

      // Act
      const createdAtField = getCreatedAtField(CustomEntity);

      // Assert
      expect(createdAtField).toBe("created");
    });
  });

  describe("UpdatedAt Decorator", () => {
    it("should store updatedAt field metadata", () => {
      // Get metadata directly
      const updatedAtField = Reflect.getMetadata(UPDATED_AT_KEY, TestEntity);

      // Assert
      expect(updatedAtField).toBe("updatedAt");
    });

    it("should retrieve updatedAt field using getUpdatedAtField function", () => {
      // Get updatedAt field using helper function
      const updatedAtField = getUpdatedAtField(TestEntity);

      // Assert
      expect(updatedAtField).toBe("updatedAt");
    });

    it("should return undefined when getting updatedAt field from a class without the decorator", () => {
      // Arrange
      class Regular {
        updatedAt!: Date;
      }

      // Act
      const updatedAtField = getUpdatedAtField(Regular);

      // Assert
      expect(updatedAtField).toBeUndefined();
    });

    it("should work with different property names", () => {
      // Arrange
      class CustomEntity {
        @UpdatedAt()
        lastModified!: Date;
      }

      // Act
      const updatedAtField = getUpdatedAtField(CustomEntity);

      // Assert
      expect(updatedAtField).toBe("lastModified");
    });
  });
});
