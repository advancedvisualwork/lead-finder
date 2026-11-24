export type Attempt<T> = (signal: AbortSignal) => Promise<T>;

export interface HedgedRaceOptions {
  /** Start the next attempt after this delay even if the current one is still running. */
  hedgeDelayMs: number;
  /** Give up (and abort everything) after this total time. */
  budgetMs: number;
}

export interface HedgedRaceResult<T> {
  value: T;
  index: number;
}

export class BudgetExhaustedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Time budget exhausted', options);
    this.name = 'BudgetExhaustedError';
  }
}

/**
 * "Hedged requests": attempts start one at a time; the next one starts as soon as the
 * current one fails or after `hedgeDelayMs`. The first success wins and the rest are aborted,
 * so a single slow mirror cannot consume the whole budget, while healthy mirrors are hit once.
 */
class HedgedRace<T> {
  private readonly controllers = new Set<AbortController>();
  private next = 0;
  private running = 0;
  private settled = false;
  private lastError: unknown;
  private hedgeTimer?: ReturnType<typeof setTimeout>;
  private budgetTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly attempts: readonly Attempt<T>[],
    private readonly options: HedgedRaceOptions,
    private readonly resolve: (result: HedgedRaceResult<T>) => void,
    private readonly reject: (error: unknown) => void,
  ) {}

  start(): void {
    this.budgetTimer = setTimeout(
      () => this.settle(() => this.reject(new BudgetExhaustedError({ cause: this.lastError }))),
      this.options.budgetMs,
    );
    this.launchNext();
  }

  private launchNext(): void {
    clearTimeout(this.hedgeTimer);
    if (this.settled || this.next >= this.attempts.length) return;
    const index = this.next++;
    const controller = new AbortController();
    this.controllers.add(controller);
    this.running++;
    if (this.next < this.attempts.length) {
      this.hedgeTimer = setTimeout(() => this.launchNext(), this.options.hedgeDelayMs);
    }
    this.attempts[index](controller.signal).then(
      (value) => {
        this.controllers.delete(controller);
        this.settle(() => this.resolve({ value, index }));
      },
      (error: unknown) => this.onFailure(controller, error),
    );
  }

  private onFailure(controller: AbortController, error: unknown): void {
    this.running--;
    this.controllers.delete(controller);
    this.lastError = error;
    if (this.settled) return;
    if (this.next < this.attempts.length) this.launchNext();
    else if (this.running === 0) this.settle(() => this.reject(error));
  }

  private settle(action: () => void): void {
    if (this.settled) return;
    this.settled = true;
    clearTimeout(this.hedgeTimer);
    clearTimeout(this.budgetTimer);
    for (const controller of this.controllers) controller.abort();
    action();
  }
}

export function hedgedRace<T>(attempts: readonly Attempt<T>[], options: HedgedRaceOptions): Promise<HedgedRaceResult<T>> {
  if (attempts.length === 0) return Promise.reject(new Error('hedgedRace needs at least one attempt'));
  return new Promise((resolve, reject) => new HedgedRace(attempts, options, resolve, reject).start());
}
