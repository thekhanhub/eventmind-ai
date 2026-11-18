import { AsyncLocalStorage } from 'node:async_hooks';

const executionContext = new AsyncLocalStorage();

export function runWithRuntimeLimit(callback, maxRuntimeMs) {
  return executionContext.run({ deadlineAt: Date.now() + maxRuntimeMs }, callback);
}

export function getRemainingRuntimeMs() {
  const context = executionContext.getStore();
  return context ? Math.max(0, context.deadlineAt - Date.now()) : Infinity;
}
