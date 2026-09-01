import { getWorker } from "@switchboard/queue";
import { registerProcessors } from "./processors/index.js";

const worker = getWorker();
registerProcessors(worker);

console.log("worker starting (driver: postgres — Phase 1, see README §7)");
await worker.run();
