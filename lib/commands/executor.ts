export const COMMAND_EXECUTION_DISABLED_MESSAGE =
  "Command execution is disabled in Mark I.";

export type CommandExecutionResult = {
  ok: false;
  error: string;
  disabled: true;
};

export async function executeNexusCommand(): Promise<CommandExecutionResult> {
  return {
    ok: false,
    error: COMMAND_EXECUTION_DISABLED_MESSAGE,
    disabled: true,
  };
}

export function assertCommandExecutionDisabled(): never {
  throw new Error(COMMAND_EXECUTION_DISABLED_MESSAGE);
}
