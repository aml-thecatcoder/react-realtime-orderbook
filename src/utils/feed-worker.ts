export const feedWorker = new Worker(
  new URL('./feed.worker.ts', import.meta.url),
);
