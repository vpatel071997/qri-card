import { VCardProps } from "./props";

describe("VCardProps interface", () => {
  it("allows all defined fields", () => {
    const vcard: VCardProps = {
      firstName: "John",
      lastName: "Doe",
      middleName: "A",
      prefix: "Mr.",
      suffix: "Jr.",
      nickname: "Johnny",
      email: "john@example.com",
      phone: "1234567890",
      homePhone: "0987654321",
      workPhone: "1112223333",
      cellPhone: "4445556666",
      fax: "7778889999",
      org: "Example Corp",
      title: "Developer",
      street: "123 Main St",
      city: "Metropolis",
      state: "CA",
      country: "USA",
      postalCode: "12345",
      website: "https://example.com",
      birthday: "2000-01-01",
      photoUrl: "https://example.com/photo.jpg",
      gender: "M",
      timezone: "PST",
      note: "Test note",
    };
    expect(vcard.firstName).toBe("John");
    expect(vcard.email).toBe("john@example.com");
    expect(vcard.note).toBe("Test note");
  });

  it("allows additional string keys", () => {
    const vcard: VCardProps = {
      customField: "customValue",
    };
    expect(vcard.customField).toBe("customValue");
  });
});
