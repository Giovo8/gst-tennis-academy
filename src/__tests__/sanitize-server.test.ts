import { sanitizeObject } from "@/lib/security/sanitize-server";

describe("sanitizeObject", () => {
  it("preserves arrays while sanitizing nested string values", () => {
    const payload = {
      user_id: "user-id",
      participants: [
        {
          full_name: "Mario\u0000 Rossi",
          email: "mario@example.com",
          is_registered: true,
        },
        {
          full_name: "Luigi Bianchi",
          email: null,
          is_registered: false,
        },
      ],
      notes: "note\u0000",
    };

    const sanitized = sanitizeObject(payload);

    expect(Array.isArray(sanitized.participants)).toBe(true);
    expect(sanitized.participants).toHaveLength(2);
    expect(sanitized.participants[0].full_name).toBe("Mario Rossi");
    expect(sanitized.notes).toBe("note");
  });
});
