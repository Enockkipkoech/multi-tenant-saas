import type { Worker } from "@multitenant-saas/queue";
import { processWebhookEvent } from "./processWebhookEvent.js";

export function registerProcessors(worker: Worker): void {
  worker.registerHandler("process_webhook_event", processWebhookEvent);
}
