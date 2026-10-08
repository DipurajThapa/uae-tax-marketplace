import { describe, it, expect } from "vitest";
import { stagingGate } from "@/lib/staging-gate";

const basic = (s: string) => `Basic ${btoa(s)}`;
const env = { APP_ENV: "staging", STAGING_BASIC_AUTH: "owner:correct-horse-battery-staple" };

describe("private staging gate", () => {
  it("does nothing outside staging", () => {
    expect(stagingGate({ APP_ENV: "production" }, null)).toBe("open");
    expect(stagingGate({}, null)).toBe("open");
  });

  it("fails closed when the secret is missing or weak", () => {
    expect(stagingGate({ APP_ENV: "staging" }, basic("a:b"))).toBe("misconfigured");
    expect(stagingGate({ APP_ENV: "staging", STAGING_BASIC_AUTH: "owner:short" }, basic("owner:short"))).toBe("misconfigured");
    expect(stagingGate({ APP_ENV: "staging", STAGING_BASIC_AUTH: ":no-user-but-long-password" }, null)).toBe("misconfigured");
  });

  it("asks for credentials and accepts only the exact pair", () => {
    expect(stagingGate(env, null)).toBe("challenge");
    expect(stagingGate(env, "Bearer x")).toBe("challenge");
    expect(stagingGate(env, "Basic !!!not-base64")).toBe("challenge");
    expect(stagingGate(env, basic("owner:correct-horse-battery-stapl"))).toBe("challenge");
    expect(stagingGate(env, basic("owner:correct-horse-battery-staple"))).toBe("allow");
  });
});
