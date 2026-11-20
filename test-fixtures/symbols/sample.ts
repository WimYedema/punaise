// PUN-003 fixture: shapes that a symbol identity (name, kind, container chain) must handle.

export const MAX_RETRIES = 3;

export function topLevel(a: number): number {
  function nestedHelper(x: number): number {
    const innerArrow = (y: number) => y * 2;
    return innerArrow(x);
  }
  return nestedHelper(a);
}

export const arrowFunction = (s: string): string => s.trim();

// Overloads: three declarations, one implementation.
export function parse(input: string): number;
export function parse(input: number): string;
export function parse(input: string | number): number | string {
  return typeof input === "string" ? Number(input) : String(input);
}

export interface Store {
  get(key: string): number | undefined;
  readonly size: number;
}

export enum Mode {
  Fast,
  Safe,
}

export class SimulationService {
  static instances = 0;
  private cache = new Map<string, number>();

  constructor(private readonly store: Store) {}

  get size(): number {
    return this.cache.size;
  }

  set size(value: number) {
    void value;
  }

  // Method overloads.
  run(id: string): number;
  run(id: string, attempts: number): number;
  run(id: string, attempts = 1): number {
    const localHelper = () => attempts;
    function localFunction(): number {
      return localHelper();
    }
    return this.store.get(id) ?? localFunction();
  }

  async runAsync(id: string): Promise<number> {
    return this.run(id);
  }

  static create(store: Store): SimulationService {
    return new SimulationService(store);
  }
}

export class OtherService {
  // Same method name as SimulationService.run: only the container tells them apart.
  run(): void {}
}

export namespace Utils {
  export function format(n: number): string {
    return n.toFixed(2);
  }
  export namespace Inner {
    export const deep = () => 1;
  }
}

export const handlers = {
  onStart() {
    return 1;
  },
  onStop: () => 2,
};

export default function () {
  return "anonymous default export";
}

declare function describe(name: string, body: () => void): void;
describe("simulation", () => {
  function setupInsideCallback(): void {}
  setupInsideCallback();
});
