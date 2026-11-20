import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCT_NAME } from "../src/index.js";

test("exports the product name", () => {
  assert.equal(PRODUCT_NAME, "Punaise");
});
