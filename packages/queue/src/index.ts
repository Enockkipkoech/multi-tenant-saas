import { loadEnv } from "@multitenant-saas/shared";
import { PostgresQueue, PostgresWorker } from "./postgres.js";
import { SqsQueue, SqsWorker } from "./sqs.js";
import type { Queue, Worker } from "./types.js";

export * from "./types.js";

/** Driver selection is one env var — QUEUE_DRIVER — per README §7 phasing. */
export function getQueue(): Queue {
  const env = loadEnv();
  return env.QUEUE_DRIVER === "sqs" ? new SqsQueue() : new PostgresQueue();
}

export function getWorker(): Worker {
  const env = loadEnv();
  return env.QUEUE_DRIVER === "sqs" ? new SqsWorker() : new PostgresWorker();
}
