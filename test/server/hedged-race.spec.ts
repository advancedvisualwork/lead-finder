import { describe, expect, it } from 'vitest';
import { BudgetExhaustedError, hedgedRace, type Attempt } from '../../server/leads/infrastructure/http/hedged-race';

const options = { hedgeDelayMs: 20, budgetMs: 500 };

/** Resolves after `ms`, rejecting early with AbortError if aborted; records the abort. */
function delayed<T>(ms: number, value: T, log: string[], name: string): Attempt<T> {
  return (signal) =>
    new Promise((resolve, reject) => {
      log.push(`start:${name}`);
      const timer = setTimeout(() => resolve(value), ms);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        log.push(`abort:${name}`);
        reject(new DOMException('aborted', 'AbortError'));
      });
    });
}

const failing = (log: string[], name: string): Attempt<never> => async () => {
  log.push(`start:${name}`);
  throw new Error(`${name} down`);
};

describe('hedgedRace', () => {
  it('uses the first attempt when it answers before the hedge delay (single request)', async () => {
    const log: string[] = [];
    const result = await hedgedRace([delayed(5, 'a', log, 'a'), delayed(5, 'b', log, 'b')], options);
    expect(result).toEqual({ value: 'a', index: 0 });
    expect(log).toEqual(['start:a']);
  });

  it('starts the next attempt immediately when one fails', async () => {
    const log: string[] = [];
    const result = await hedgedRace([failing(log, 'a'), delayed(5, 'b', log, 'b')], { ...options, hedgeDelayMs: 10_000 });
    expect(result).toEqual({ value: 'b', index: 1 });
  });

  it('hedges a slow attempt: the faster mirror wins and the slow one is aborted', async () => {
    const log: string[] = [];
    const result = await hedgedRace([delayed(300, 'slow', log, 'slow'), delayed(10, 'fast', log, 'fast')], options);
    expect(result).toEqual({ value: 'fast', index: 1 });
    expect(log).toEqual(['start:slow', 'start:fast', 'abort:slow']);
  });

  it('rejects with the last error when every attempt fails', async () => {
    const log: string[] = [];
    await expect(hedgedRace([failing(log, 'a'), failing(log, 'b')], options)).rejects.toThrow('b down');
  });

  it('gives up after the budget and aborts everything still running', async () => {
    const log: string[] = [];
    const race = hedgedRace([delayed(10_000, 'a', log, 'a'), delayed(10_000, 'b', log, 'b')], { hedgeDelayMs: 10, budgetMs: 60 });
    await expect(race).rejects.toBeInstanceOf(BudgetExhaustedError);
    expect(log).toEqual(['start:a', 'start:b', 'abort:a', 'abort:b']);
  });
});
