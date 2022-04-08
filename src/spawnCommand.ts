import { spawn } from "child_process";
import internal from "stream";
import { Color } from "./colorize";
import { Command, getWholeCommandString } from "./command";
import { appendToLogFile, Logger, LogLevel } from "./log";
import { HeaderTransformerFunction } from "./parallelCmd";

export interface SpawnCommandResult {
  code: number | null;
}

export interface SpawnCommandContext {
  allCommands: Command[];
  logger: Logger;
  outputStderr: boolean;
  headerTransformer: HeaderTransformerFunction;
}

function trimAndSplitOutput(output: string): string[] {
  return output.trim().split(/\r?\n/);
}

function processStream(stream: internal.Readable, func: (data: string[]) => void): void {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => func(trimAndSplitOutput(String(chunk))));
}

export default function spawnCommand(
  command: Command,
  abortSignal: AbortSignal,
  context: SpawnCommandContext
): Promise<SpawnCommandResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command.command, command.args, {
      signal: abortSignal,
      shell: true,
    });

    const buildHeader = () => context.headerTransformer(command, context.allCommands);

    process.on("error", (error) => {
      if (error.name !== "AbortError") {
        const message = `Command "${getWholeCommandString(command)}" failed:`;
        context.logger.logError(`${message} ${error.message}`, buildHeader());
        appendToLogFile(LogLevel.ERROR, error);
      }
      reject(error);
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

      if (code === null) {
        context.logger.logWarn("Aborted", header);
      } else {
        const message = `Finished with code ${code}`;
        context.logger.log(LogLevel.INFO, message, { header, headerColor: Color.GREEN });
      }

      resolve({ code });
    });
  });
}
