import type { Queue, Worker, JobHandler, JobPayload } from "./types.js";

/**
 * AWS SQS queue. Phase 2 stub — not implemented yet. 
 */
export class SqsQueue implements Queue {
  async enqueue(_type: string, _payload: JobPayload, _tenantId: string): Promise<void> {
    throw new Error(
      "SqsQueue is a Phase 2 stub — not implemented. See README §7 for the trigger condition to build this out."
    );
  }
}

export class SqsWorker implements Worker {
  registerHandler(_type: string, _handler: JobHandler): void {
    throw new Error("SqsWorker is a Phase 2 stub — not implemented.");
  }
  async run(): Promise<void> {
    throw new Error("SqsWorker is a Phase 2 stub — not implemented.");
  }
}
