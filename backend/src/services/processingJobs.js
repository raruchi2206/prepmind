const { randomUUID } = require("node:crypto");
const { createHttpError } = require("../middleware/errorMiddleware");

/**
 * In-process registry of running ingestion jobs, keyed by knowledge source ID.
 * Each job owns an AbortController so cancellation can stop in-flight HTTP calls,
 * and a `done` promise so a cancel request can wait for the job to acknowledge.
 */
const jobs = new Map();

class ProcessingCancelledError extends Error {
  constructor() {
    super("Processing was cancelled.");
    this.name = "ProcessingCancelledError";
    this.statusCode = 409;
    this.code = "PROCESSING_CANCELLED";
  }
}

function startJob(sourceId) {
  const key = sourceId.toString();
  if (jobs.has(key)) {
    throw createHttpError(409, "This source is already being processed.", "SOURCE_PROCESSING");
  }
  let resolveDone;
  const job = {
    id: randomUUID(),
    sourceId: key,
    controller: new AbortController(),
    cancelRequested: false,
    done: new Promise((resolve) => {
      resolveDone = resolve;
    }),
  };
  job.finish = () => {
    jobs.delete(key);
    resolveDone();
  };
  // Throws at safe checkpoints once cancellation has been requested
  job.checkpoint = () => {
    if (job.cancelRequested) throw new ProcessingCancelledError();
  };
  jobs.set(key, job);
  return job;
}

function getJob(sourceId) {
  return jobs.get(sourceId.toString()) || null;
}

function isCancellation(error, job) {
  return (
    error instanceof ProcessingCancelledError ||
    error?.code === "PROCESSING_CANCELLED" ||
    Boolean(job?.cancelRequested && (error?.name === "AbortError" || job.controller.signal.aborted))
  );
}

module.exports = {
  startJob,
  getJob,
  isCancellation,
  ProcessingCancelledError,
};
