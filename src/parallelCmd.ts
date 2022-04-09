import {
  Command,
  defaultCommandKillFunction,
  getWholeCommandString,
  parseCommand,
} from "./command";
import { appendToLogFile, defaultHeaderTransformer, Logger, LogLevel } from "./log";
import spawnCommand, { SpawnCommandContext, SpawnCommandResult } from "./spawnCommand";
import spawn from "cross-spawn";

export type HeaderTransformerFunction = (
  command: Command,
  allCommands: Command[]
) => string;

export type ParallelCmdOptions = Partial<{
  maxProcessCount: number;
  abortOnError: boolean;
}> &
  Partial<SpawnCommandContext>;

export interface ParallelCmdResult {
  aborted: boolean;
  totalProcessCount: number;
  completedProcessCount: number;
  failedProcessCount: number;
}

export default async function parallelCmd(
  commands: string[],
  {
    abortController = new AbortController(),
    maxProcessCount = 3,
    abortOnError = false,
    outputStderr = false,
    headerTransformer = defaultHeaderTransformer,
    spawnFunction = spawn,
    killFunction = defaultCommandKillFunction,
    logger = new Logger({ silent: false }),
  }: ParallelCmdOptions = {}
): Promise<ParallelCmdResult> {
  const cmds: Command[] = commands.map((str, i) => parseCommand(str, i));
  const runningProcesses: Promise<SpawnCommandResult>[] = [];

  let completedProcessCount = 0;
  let failedProcessCount = 0;

  const spawnCommandContext: SpawnCommandContext = {
    abortController,
    allCommands: cmds,
    outputStderr,
    headerTransformer,
    spawnFunction,
    killFunction,
    logger,
  };

  const runCommandAtIndex = (index: number): void => {
    const command = cmds[index];
    const header = headerTransformer(command, cmds);
    logger.logInfo(`Running command "${getWholeCommandString(command)}"`, header);
    const childProcess = spawnCommand(command, spawnCommandContext)
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
