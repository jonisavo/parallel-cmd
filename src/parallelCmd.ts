import { Command, getWholeCommandString, parseCommand } from "./command";
import { appendToLogFile, buildMessageHeader, Logger, LogLevel } from "./log";
import ARGV from "./argv";
import spawnCommand, { SpawnCommandResult } from "./spawnCommand";

export type ParallelCmdOptions = Partial<{
  maxProcessCount: number;
  abortOnError: boolean;
  logger: Logger;
}>;

export interface ParallelCmdResult {
  aborted: boolean;
  totalProcessCount: number;
  completedProcessCount: number;
  failedProcessCount: number;
}

export function parseParallelCmdOptionsFromArgv(argv: ARGV): ParallelCmdOptions {
  let maxProcessCount: number | undefined;

  if (typeof argv["process-count"] === "number") {
    maxProcessCount = argv["process-count"];
  } else if (typeof argv.p === "number") {
    maxProcessCount = argv.p;
  }

  const abortOnError = argv["abort-on-error"] || argv.a;
  const silent = argv.silent || argv.s;
  const logger = new Logger({ silent });

  return {
    maxProcessCount,
    abortOnError,
    logger,
  };
}

export default async function parallelCmd(
  commands: string[],
  {
    maxProcessCount = 3,
    abortOnError = false,
    logger = new Logger({ silent: false }),
  }: ParallelCmdOptions
): Promise<ParallelCmdResult> {
  const cmds: Command[] = commands.map((str, i) => parseCommand(str, i));
  const runningProcesses: Promise<SpawnCommandResult>[] = [];

  const abortController = new AbortController();

  let completedProcessCount = 0;
  let failedProcessCount = 0;

  const runCommandAtIndex = (index: number): void => {
    const command = cmds[index];
    const header = buildMessageHeader(index + 1, cmds.length);
    logger.logInfo(`Running command "${getWholeCommandString(command)}"`, header);
    const childProcess = spawnCommand(command, abortController.signal, {
      totalCommands: cmds.length,
      logger,
    })
      .then((result) => {
        completedProcessCount++;
        return result;
      })
      .catch((error) => {
        process.exitCode = 1;
        failedProcessCount++;

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

  let aborted = false;

  while (currentProcessIndex < cmds.length) {
    try {
      await Promise.race(runningProcesses);
    } catch {
      aborted = true;
      break;
    }

    runCommandAtIndex(currentProcessIndex++);
  }

  const buildResult = (): ParallelCmdResult => ({
    aborted,
    totalProcessCount: cmds.length,
    completedProcessCount,
    failedProcessCount,
  });

  if (aborted) {
    const remainingProcesses = cmds.length - currentProcessIndex;
    if (remainingProcesses > 0) {
      appendToLogFile(LogLevel.WARN, `Skipped ${remainingProcesses} commands`);
    }
    return buildResult();
  }

  try {
    await Promise.all(runningProcesses);
  } catch {
    aborted = true;
    return buildResult();
  }

  return buildResult();
}
