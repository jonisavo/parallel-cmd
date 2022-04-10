import { ChildProcess } from "child_process";
import internal from "stream";
import { Color } from "./colorize";
import { Command, getWholeCommandString } from "./command";
import { Logger, LogLevel } from "./log";
import { HeaderTransformerFunction } from "./parallelCmd";

// Define interface missing from @types/node
interface ExtendedAbortSignal extends AbortSignal {
  addEventListener: (
    type: "abort",
    listener: (event: "abort") => void,
    options: { once: boolean }
  ) => void;
  removeEventListener: (type: "abort", listener: (event: "abort") => void) => void;
}

export type CommandSpawnFunction = (command: string, args: string[]) => ChildProcess;
export type CommandKillFunction = (pid: number) => Promise<void>;

export interface SpawnCommandResult {
  code: number | null;
}

export interface SpawnCommandContext {
  abortController: AbortController;
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
  stream: internal.Readable | null,
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
    let aborted = false;
    const abortSignal = context.abortController.signal as unknown as ExtendedAbortSignal;
    const process = context.spawnFunction(command.command, command.args);

    const onAbort = () => {
      abort(new Error("The operation was aborted"));
    };

    abortSignal.addEventListener("abort", onAbort, { once: true });

    const end = (result: Partial<{ code: number | null; error: Error }>) => {
      abortSignal.removeEventListener("abort", onAbort);
      if (result.error !== undefined) {
        reject(result.error);
      } else {
        resolve({ code: result.code ?? null });
      }
    };

    const buildHeader = () => context.headerTransformer(command, context.allCommands);

    const handleError = (error: Error) => {
      const message = `Command "${getWholeCommandString(command)}" failed:`;
      context.logger.logError(`${message} ${error.message}`, buildHeader());
      context.logger.appendToLogFile(LogLevel.ERROR, error);
    };

    const abort = (error: Error) => {
      if (aborted || process.pid === undefined || process.killed) {
        return;
      }
      context
        .killFunction(process.pid)
        .then(() =>
          context.logger.appendToLogFile(LogLevel.INFO, `Killed PID ${process.pid}`)
        )
        .catch((err) =>
          context.logger.appendToLogFile(LogLevel.ERROR, `Failed to kill process: ${err}`)
        );
      aborted = true;
      end({ error });
    };

    process.on("error", (error) => {
      if (error.name !== "AbortError") {
        handleError(error);
      }
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

      if (code !== null && code !== 0) {
        let error: Error;
        if (aborted) {
          error = new Error("Process aborted");
        } else {
          error = new Error(`Process exited with code ${code}`);
        }
        handleError(error);
        end({ error });
        return;
      }

      if (code === null) {
        context.logger.logWarn("Aborted", header);
      } else {
        const message = "Finished successfully";
        context.logger.log(LogLevel.INFO, message, { header, headerColor: Color.GREEN });
      }

      end({ code });
    });
  });
}
