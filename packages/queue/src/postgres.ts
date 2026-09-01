import { run, quickAddJob, type Runner, type Task } from "graphile-worker";
import { loadEnv } from "@switchboard/shared";
import type { Job, JobHandler, JobPayload, Queue, Worker } from "./types.js";

/**
 * Phase 1 queue: Postgres via graphile-worker. Uses SELECT ... FOR UPDATE
 * SKIP LOCKED under the hood, so multiple worker replicas can safely
 * compete for jobs (README §7 horizontal scaling table) without double
 * processing. Runs as a second Railway service — no AWS account needed.
 */
export class PostgresQueue implements Queue {
  async enqueue(type: string, payload: JobPayload, tenantId: string): Promise<void> {
    const env = loadEnv();
    await quickAddJob(
      { connectionString: env.DATABASE_URL },
      type,
      { ...payload, tenantId } satisfies JobPayload
    );
  }
}

export class PostgresWorker implements Worker {
  private handlers = new Map<string, JobHandler>();
  private runner: Runner | undefined;

  registerHandler(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  async run(): Promise<void> {
    const env = loadEnv();
    const taskList: Record<string, Task> = {};

    for (const [type, handler] of this.handlers) {
      taskList[type] = async (payload, helpers) => {
        const job: Job = {
          id: String(helpers.job.id),
          type,
          tenantId: (payload as JobPayload).tenantId as string,
          payload: payload as JobPayload,
          attempts: helpers.job.attempts,
        };
        await handler(job);
      };
    }

    this.runner = await run({
      connectionString: env.DATABASE_URL,
      concurrency: 5,
      taskList,
    });

    await this.runner.promise;
  }
}
