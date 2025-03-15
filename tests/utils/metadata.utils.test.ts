import "reflect-metadata";
import {
  addFieldMetadata,
  FieldOptions,
  FIELDS_KEY,
  getOrCreateFieldsMetadata,
} from "../../src/utils/metadata.utils";

describe("Metadata Utils", () => {
  describe("getOrCreateFieldsMetadata", () => {
    it("should create empty array if no metadata exists", () => {
      // Arrange
      class TestClass {}

      // Act
      const fields = getOrCreateFieldsMetadata(TestClass);

      // Assert
      expect(fields).toEqual([]);
    });

    it("should return existing metadata if it exists", () => {
      // Arrange
      class TestClass {}
      const existingMetadata = [{ propertyKey: "test", options: {} }];
      Reflect.defineMetadata(FIELDS_KEY, existingMetadata, TestClass);

      // Act
      const fields = getOrCreateFieldsMetadata(TestClass);

      // Assert
      expect(fields).toBe(existingMetadata);
    });

    it("should return empty array when metadata is undefined", () => {
      // Arrange
      class TestClass {}
      // Define metadata as undefined
      Reflect.defineMetadata(FIELDS_KEY, undefined, TestClass);

      // Act
      const fields = getOrCreateFieldsMetadata(TestClass);

      // Assert
      expect(fields).toEqual([]);
    });
  });

  describe("addFieldMetadata", () => {
    it("should add field metadata to empty array", () => {
      // Arrange
      class TestClass {}
      const propertyKey = "testField";
      const options: FieldOptions = { index: true };

      // Act
      addFieldMetadata(TestClass, propertyKey, options);

      // Assert
      const fields = Reflect.getMetadata(FIELDS_KEY, TestClass);
      expect(fields).toEqual([{ propertyKey, options }]);
    });

    it("should add field metadata to existing array", () => {
      // Arrange
      class TestClass {}
      const existingMetadata = [{ propertyKey: "existingField", options: {} }];
      Reflect.defineMetadata(FIELDS_KEY, existingMetadata, TestClass);

      const propertyKey = "newField";
      const options: FieldOptions = { name: "custom_name" };

      // Act
      addFieldMetadata(TestClass, propertyKey, options);

      // Assert
      const fields = Reflect.getMetadata(FIELDS_KEY, TestClass);
      expect(fields).toEqual([
        { propertyKey: "existingField", options: {} },
        { propertyKey, options },
      ]);
    });

    it("should use empty object as default options", () => {
      // Arrange
      class TestClass {}
      const propertyKey = "testField";

      // Act
      addFieldMetadata(TestClass, propertyKey);

      // Assert
      const fields = Reflect.getMetadata(FIELDS_KEY, TestClass);
      expect(fields).toEqual([{ propertyKey, options: {} }]);
    });

    it("should work with symbol property keys", () => {
      // Arrange
      class TestClass {}
      const propertyKey = Symbol("testSymbol");
      const options: FieldOptions = { index: true };

      // Act
      addFieldMetadata(TestClass, propertyKey, options);

      // Assert
      const fields = Reflect.getMetadata(FIELDS_KEY, TestClass);
      expect(fields).toEqual([{ propertyKey, options }]);
    });
  });
});
