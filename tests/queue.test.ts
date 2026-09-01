import { describe, expect, it, beforeEach, vi } from "vitest";

// Verifies the Phase 1 -> Phase 2 driver swap (README §7) actually swaps
// implementations based on QUEUE_DRIVER, without needing a real DB or AWS.
describe("getQueue driver selection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("defaults to PostgresQueue", async () => {
    process.env.QUEUE_DRIVER = "postgres";
    const { getQueue } = await import("../packages/queue/src/index.js");
    const { PostgresQueue } = await import("../packages/queue/src/postgres.js");
    expect(getQueue()).toBeInstanceOf(PostgresQueue);
  });

  it("selects SqsQueue when QUEUE_DRIVER=sqs", async () => {
    process.env.QUEUE_DRIVER = "sqs";
    const { getQueue } = await import("../packages/queue/src/index.js");
    const { SqsQueue } = await import("../packages/queue/src/sqs.js");
    expect(getQueue()).toBeInstanceOf(SqsQueue);
  });
});
