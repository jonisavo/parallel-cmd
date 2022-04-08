import { spawn } from "child_process";
import { Command, getWholeCommandString, parseCommand } from "./command";
import { appendToLogFile, Logger, LogLevel } from "./log";
import { Color } from "./colorize";
import ARGV from "./argv";

export type ParallelCmdOptions = Partial<{
  maxProcessCount: number;
  abortOnError: boolean;
  logger: Logger;
}>;

export interface ChildProcessResult {
  code: number | null;
}

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

function buildCommandMessageHeader(
  currentCommandNumber: number,
  totalCommandNumber: number
): string {
  return `[${currentCommandNumber}/${totalCommandNumber}]`;
}

function spawnSingleCommand(
  command: Command,
  abortSignal: AbortSignal,
  context: { totalCommands: number; logger: Logger }
): Promise<ChildProcessResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command.command, command.args, { signal: abortSignal });
    const commandNumber = command.index + 1;

    process.on("error", (error) => {
      if (error.name !== "AbortError") {
        const header = buildCommandMessageHeader(commandNumber, context.totalCommands);
        const message = `Command "${getWholeCommandString(command)}" failed:`;
        context.logger.logError(`${message} ${error.message}`, header);
        appendToLogFile(LogLevel.ERROR, error);
      }
      reject(error);
    });

    process.stdout.on("data", (chunk) => {
      const header = buildCommandMessageHeader(commandNumber, context.totalCommands);
      context.logger.logInfo(String(chunk), header);
    });

    process.on("exit", (code) => {
      const header = buildCommandMessageHeader(commandNumber, context.totalCommands);

      if (code === null) {
        context.logger.logWarn("Aborted", header);
      } else {
        const message = `Finished with code ${code}`;
        context.logger.log(LogLevel.INFO, message, { header, headerColor: Color.GREEN });
      }

      resolve({
        code,
      });
    });
  });
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
  const runningProcesses: Promise<ChildProcessResult>[] = [];

  const abortController = new AbortController();

  let completedProcessCount = 0;
  let failedProcessCount = 0;

  const runCommandAtIndex = (index: number): void => {
    const command = cmds[index];
    const header = buildCommandMessageHeader(index + 1, cmds.length);
    logger.logInfo(`Running command "${getWholeCommandString(command)}"`, header);
    const childProcess = spawnSingleCommand(command, abortController.signal, {
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
      logger.logWarn(`Skipped the remaining ${remainingProcesses} commands`);
    }
    return buildResult();
  }

  logger.logInfo(`Waiting for ${runningProcesses.length} processes...`);

  try {
    await Promise.all(runningProcesses);
  } catch {
    aborted = true;
    return buildResult();
  }

  return buildResult();
}
