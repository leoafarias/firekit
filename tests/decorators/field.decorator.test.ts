import "reflect-metadata";
import { Field } from "../../src/decorators/field.decorator";
import { FIELDS_KEY } from "../../src/utils/metadata.utils";

describe("Field Decorator", () => {
  // Define test class
  class TestEntity {
    @Field()
    name!: string;

    @Field({ index: true })
    email!: string;

    @Field({
      transformer: {
        toFirestore: (roles: string[]) => roles.join(","),
        fromFirestore: (value: string) => (value ? value.split(",") : []),
      },
    })
    roles!: string[];
  }

  it("should store field metadata with default options", () => {
    // Get metadata
    const fields = Reflect.getMetadata(FIELDS_KEY, TestEntity);

    // Find the name field metadata
    const nameField = fields.find((f: any) => f.propertyKey === "name");

    // Assert
    expect(nameField).toBeDefined();
    expect(nameField.options).toEqual({});
  });

  it("should store field metadata with index option", () => {
    // Get metadata
    const fields = Reflect.getMetadata(FIELDS_KEY, TestEntity);

    // Find the email field metadata
    const emailField = fields.find((f: any) => f.propertyKey === "email");

    // Assert
    expect(emailField).toBeDefined();
    expect(emailField.options.index).toBe(true);
  });

  it("should store field metadata with transformer option", () => {
    // Get metadata
    const fields = Reflect.getMetadata(FIELDS_KEY, TestEntity);

    // Find the roles field metadata
    const rolesField = fields.find((f: any) => f.propertyKey === "roles");

    // Assert
    expect(rolesField).toBeDefined();
    expect(rolesField.options.transformer).toBeDefined();

    // Test transformer functions
    const toFirestore = rolesField.options.transformer.toFirestore;
    const fromFirestore = rolesField.options.transformer.fromFirestore;

    expect(toFirestore(["admin", "user"])).toBe("admin,user");
    expect(fromFirestore("admin,user")).toEqual(["admin", "user"]);
    expect(fromFirestore("")).toEqual([]);
  });

  it("should accumulate multiple field decorators in the same class", () => {
    // Get metadata
    const fields = Reflect.getMetadata(FIELDS_KEY, TestEntity);

    // Assert
    expect(fields.length).toBe(3);
    expect(fields.map((f: any) => f.propertyKey)).toContain("name");
    expect(fields.map((f: any) => f.propertyKey)).toContain("email");
    expect(fields.map((f: any) => f.propertyKey)).toContain("roles");
  });
});
