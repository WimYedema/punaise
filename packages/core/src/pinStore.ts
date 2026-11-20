import { isSameSymbol, type SymbolPin, type SymbolTarget } from "./pin.js";

export interface AddResult {
  pin: SymbolPin;
  /** False when the symbol was already pinned; `pin` is then the existing pin. */
  added: boolean;
}

/** In-memory, ordered list of symbol pins. New pins go to the end. */
export class PinStore {
  private pins: SymbolPin[] = [];

  add(target: SymbolTarget): AddResult {
    const existing = this.pins.find((pin) => isSameSymbol(pin, target));
    if (existing) return { pin: existing, added: false };
    const pin: SymbolPin = {
      id: this.uniqueId(baseId(target)),
      type: "symbol",
      path: target.path,
      symbol: { ...target.symbol, container: [...target.symbol.container] },
    };
    this.pins.push(pin);
    return { pin, added: true };
  }

  /** Returns false when no pin has this id. */
  remove(id: string): boolean {
    const index = this.pins.findIndex((pin) => pin.id === id);
    if (index === -1) return false;
    this.pins.splice(index, 1);
    return true;
  }

  /** The pins in display order. The returned array is a copy. */
  list(): readonly SymbolPin[] {
    return [...this.pins];
  }

  private uniqueId(base: string): string {
    let id = base;
    for (let n = 2; this.pins.some((pin) => pin.id === id); n++) id = `${base}-${n}`;
    return id;
  }
}

/** Kebab-case id from the container chain and name, e.g. `simulation-service-run`. */
export function baseId(target: SymbolTarget): string {
  const words = [...target.symbol.container, target.symbol.name]
    .join(" ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z0-9]+/g);
  return words?.join("-") ?? "pin";
}
