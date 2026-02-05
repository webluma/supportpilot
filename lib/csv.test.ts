import { strict as assert } from "node:assert";
import test from "node:test";

import { toCsv } from "@/lib/csv";

const headers = ["id", "text", "notes"];

test("toCsv escapes quotes and commas", () => {
  const rows = [[`1`, `hello, "world"`, "ok"]];
  const csv = toCsv(headers, rows);
  assert.equal(csv, `"id","text","notes"\n"1","hello, ""world""","ok"`);
});

test("toCsv handles new lines and undefined values", () => {
  const rows = [[`1`, "multi\nline", undefined]];
  const csv = toCsv(headers, rows);
  assert.equal(csv, `"id","text","notes"\n"1","multi line",""`);
});
