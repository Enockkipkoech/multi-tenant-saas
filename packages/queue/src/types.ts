export interface JobPayload {
  [key: string]: unknown;
}

export interface Job<T extends JobPayload = JobPayload> {
  id: string;
  type: string;
  tenantId: string;
  payload: T;
  attempts: number;
}

/**
 * Implementation-agnostic queue interface (README §4/§7). Phase 1 backs
 * this with Postgres (graphile-worker); Phase 2 swaps in SQS behind the
 * same interface — ingest and worker business logic never change.
 */
export interface Queue {
  enqueue(type: string, payload: JobPayload, tenantId: string): Promise<void>;
}

export type JobHandler = (job: Job) => Promise<void>;

export interface Worker {
  /** Register a handler for a job type, then call run() to start consuming. */
  registerHandler(type: string, handler: JobHandler): void;
  run(): Promise<void>;
}
