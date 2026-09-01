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
 * Implementation-agnostic queue interface. The queue is responsible for storing jobs and delivering them to workers. The worker is responsible for processing jobs and reporting success/failure back to the queue.
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
