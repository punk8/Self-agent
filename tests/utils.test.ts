import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves conflicts", () => {
    const classes = cn("px-2", "px-4", "font-bold", undefined, false, "text-sm");
    expect(classes).toBe("px-4 font-bold text-sm");
  });
});
