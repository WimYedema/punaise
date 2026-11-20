/** Display name of the product, shared by the extension, CLI and MCP server. */
export const PRODUCT_NAME = "Punaise";

export { isSameSymbol, type SymbolIdentity, type SymbolKind, type SymbolPin, type SymbolTarget } from "./pin.js";
export { PinStore, baseId, type AddResult } from "./pinStore.js";
export { symbolAtPosition, type Position, type SymbolNode } from "./symbolAtPosition.js";
export { findSymbol, findSymbolPath } from "./symbolAtPosition.js";
export { signatureLineCount } from "./signature.js";
