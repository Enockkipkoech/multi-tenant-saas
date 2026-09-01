import type { Queue, Worker, JobHandler, JobPayload } from "./types.js";

/**
 * Phase 2 stub (README §7). Not implemented yet — this repo runs Phase 1
 * (Postgres) only. Wiring this in later is meant to be a config change
 * (QUEUE_DRIVER=sqs), not a rewrite of ingest or worker code, because both
 * only ever talk to the Queue/Worker interface in ./types.ts.
 *
 * Phase 2 implementation sketch:
 *  - enqueue(): @aws-sdk/client-sqs SendMessageCommand, signed via IAM
 *    creds scoped to the ingest service (README §7 flagged design choice —
 *    no VPC peering between Railway and AWS, public HTTPS + signed requests).
 *  - Worker.run(): long-poll ReceiveMessageCommand loop on Fargate, one
 *    task per README §7 Phase 2 diagram, DeleteMessageCommand on success,
 *    left in-flight (and eventually visible again) on failure/crash.
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
