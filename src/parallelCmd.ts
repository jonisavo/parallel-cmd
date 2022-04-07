import { spawn } from "child_process";
import { Command, getWholeCommandString, parseCommand } from "./command";
import { appendToLogFile, log, LogLevel } from "./log";

export interface ChildProcessResult {
  code: number | null;
}

function spawnSingleCommand(
  command: Command,
  abortSignal: AbortSignal,
  context: { totalCommands: number }
): Promise<ChildProcessResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command.command, command.args, { signal: abortSignal });
    const commandNumber = command.index + 1;

    process.on("error", (error) => {
      if (error.name !== "AbortError") {
        const message = `Encountered error in command ${getWholeCommandString(command)}`;
        log(LogLevel.ERROR, `[${commandNumber}/${context.totalCommands}] ${message}`);
        log(LogLevel.ERROR, error);
      }
      reject(error);
    });

    process.stdout.on("data", (chunk) => {
      log(LogLevel.INFO, `[${commandNumber}/${context.totalCommands}] ${String(chunk)}`);
    });

    process.on("exit", (code) => {
      let message: string;

      if (code === null) {
        message = "Aborted";
      } else {
        message = `Finished with code ${code}`;
      }

      log(LogLevel.INFO, `[${commandNumber}/${context.totalCommands}] ${message}`);
      resolve({
        code,
      });
    });
  });
}

export default async function parallelCmd(
  commands: string[],
  { maxProcessCount = 3, abortOnError = false } = {}
): Promise<void> {
  const cmds: Command[] = commands.map((str, i) => parseCommand(str, i));
  const runningProcesses: Promise<ChildProcessResult>[] = [];

  const abortController = new AbortController();

  const runCommandAtIndex = (index: number): void => {
    const command = cmds[index];
    log(
      LogLevel.INFO,
      `[${index + 1}/${cmds.length}] Running command ${getWholeCommandString(command)}`
    );
    const childProcess = spawnSingleCommand(command, abortController.signal, {
      totalCommands: cmds.length,
    })
      .catch((error) => {
        process.exitCode = 1;

        if (abortOnError) {
          abortController.abort();
          throw error;
        }

        return { code: null };
      })
      .finally(() => {
        const indexOfProcess = runningProcesses.indexOf(childProcess);
        runningProcesses.splice(indexOfProcess, 1);
      });
    runningProcesses.push(childProcess);
  };

  let currentProcessIndex = 0;

  const initialMaxCount = Math.min(
    maxProcessCount === 0 ? cmds.length : maxProcessCount,
    cmds.length
  );

  for (; currentProcessIndex < initialMaxCount; currentProcessIndex++) {
    runCommandAtIndex(currentProcessIndex);
  }

  let abort = false;

  while (currentProcessIndex < cmds.length) {
    try {
      await Promise.race(runningProcesses);
    } catch {
      abort = true;
      break;
    }

    runCommandAtIndex(currentProcessIndex++);
  }

  if (abort) {
    const remainingProcesses = cmds.length - currentProcessIndex;
    if (remainingProcesses > 0) {
      log(LogLevel.WARN, `Skipped the remaining ${remainingProcesses} commands`);
    }
    return;
  }

  log(LogLevel.INFO, `Waiting for ${runningProcesses.length} processes...`);

  try {
    await Promise.all(runningProcesses);
  } catch {
    return;
  }

  appendToLogFile(LogLevel.INFO, "All processes run successfully.");
}
