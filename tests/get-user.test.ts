import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

describe("getCurrentUserId", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns current user id from session", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const { getCurrentUserId } = await import("@/lib/get-user");

    await expect(getCurrentUserId()).resolves.toBe("u1");
  });

  it("throws unauthorized when user id is missing", async () => {
    authMock.mockResolvedValue({ user: {} });
    const { getCurrentUserId } = await import("@/lib/get-user");

    await expect(getCurrentUserId()).rejects.toThrow("Unauthorized");
  });
});
