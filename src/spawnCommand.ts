import { ChildProcess } from "child_process";
import { Readable } from "stream";
import {
  AbortEmitter,
  addListenerToAbortEmitter,
  removeListenerFromAbortEmitter,
} from "./abort";
import { Color } from "./colorize";
import { Command, getWholeCommandString } from "./command";
import { Logger, LogLevel } from "./log";
import { HeaderTransformerFunction } from "./parallelCmd";

export type CommandSpawnFunction = (command: string, args: string[]) => ChildProcess;
export type CommandKillFunction = (pid: number) => Promise<void>;

export interface SpawnCommandResult {
  code: number;
}

export interface SpawnCommandContext {
  abortEmitter: AbortEmitter;
  allCommands: Command[];
  logger: Logger;
  outputStderr: boolean;
  headerTransformer: HeaderTransformerFunction;
  spawnFunction: CommandSpawnFunction;
  killFunction: CommandKillFunction;
}

function trimAndSplitOutput(output: string): string[] {
  return output.trim().split(/\r?\n/);
}

export function processStream(
  stream: Readable | null,
  callback: (data: string[]) => void
): void {
  if (stream === null) {
    return;
  }
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => callback(trimAndSplitOutput(String(chunk))));
}

export default function spawnCommand(
  command: Command,
  context: SpawnCommandContext
): Promise<SpawnCommandResult> {
  return new Promise((resolve, reject) => {
    const process = context.spawnFunction(command.command, command.args);

    const onAbort = () => {
      abort(new Error("The operation was aborted"));
    };

    addListenerToAbortEmitter(context.abortEmitter, onAbort);

    const end = (result: Partial<{ code: number; error: Error }>) => {
      process.removeAllListeners();
      removeListenerFromAbortEmitter(context.abortEmitter, onAbort);
      if (result.error !== undefined || result.code === undefined) {
        reject(result.error);
      } else {
        resolve({ code: result.code });
      }
    };

    const buildHeader = () => context.headerTransformer(command, context.allCommands);

    const handleError = (error: Error) => {
      const message = `Command "${getWholeCommandString(command)}" failed:`;
      context.logger.logError(`${message} ${error.message}`, buildHeader());
      context.logger.appendToLogFile(LogLevel.ERROR, error);
    };

    const killProcess = (pid: number): Promise<void> => {
      return context
        .killFunction(pid)
        .then(() =>
          context.logger.appendToLogFile(LogLevel.INFO, `Killed PID ${process.pid}`)
        )
        .catch((err) => {
          context.logger.appendToLogFile(
            LogLevel.ERROR,
            `Failed to kill process: ${err}`
          );
        });
    };

    const abort = async (error: Error) => {
      if (process.pid !== undefined && !process.killed) {
        await killProcess(process.pid);
      }

      context.logger.logError(
        `Command "${getWholeCommandString(command)}" aborted`,
        buildHeader()
      );

      end({ error });
    };

    process.on("error", (error) => {
      handleError(error);
      end({ error });
    });

    processStream(process.stdout, (data) => {
      data.forEach((chunk) => context.logger.logInfo(chunk, buildHeader()));
    });

    if (context.outputStderr) {
      processStream(process.stderr, (data) => {
        data.forEach((chunk) => context.logger.logWarn(chunk, buildHeader()));
      });
    }

    process.on("exit", (code) => {
      const header = buildHeader();

      if (code !== 0) {
        const error = new Error(`Process exited with code ${code}`);
        handleError(error);
        end({ error });
        return;
      }

      context.logger.log(LogLevel.INFO, "Finished successfully", {
        header,
        headerColor: Color.GREEN,
      });

      end({ code });
    });
  });
}
