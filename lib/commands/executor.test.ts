import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCommandExecutionDisabled,
  COMMAND_EXECUTION_DISABLED_MESSAGE,
  executeNexusCommand,
} from "@/lib/commands/executor";

test("executeNexusCommand is disabled in Mark I", async () => {
  const result = await executeNexusCommand();
  assert.equal(result.ok, false);
  assert.equal(result.disabled, true);
  assert.equal(result.error, COMMAND_EXECUTION_DISABLED_MESSAGE);
});

test("assertCommandExecutionDisabled throws", () => {
  assert.throws(() => assertCommandExecutionDisabled(), /disabled in Mark I/);
});
