import { spawn } from "child_process";
import { Color } from "./colorize";
import { Command, getWholeCommandString } from "./command";
import { appendToLogFile, buildMessageHeader, Logger, LogLevel } from "./log";

export interface SpawnCommandResult {
  code: number | null;
}

export default function spawnCommand(
  command: Command,
  abortSignal: AbortSignal,
  context: { totalCommands: number; logger: Logger }
): Promise<SpawnCommandResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command.command, command.args, {
      signal: abortSignal,
      shell: true,
    });
    const commandNumber = command.index + 1;

    const buildHeader = () => buildMessageHeader(commandNumber, context.totalCommands);

    process.on("error", (error) => {
      if (error.name !== "AbortError") {
        const message = `Command "${getWholeCommandString(command)}" failed:`;
        context.logger.logError(`${message} ${error.message}`, buildHeader());
        appendToLogFile(LogLevel.ERROR, error);
      }
      reject(error);
    });

    process.stdout.setEncoding("utf8");
    process.stdout.on("data", (chunk) => {
      const output = String(chunk)
        // Remove trailing and leading newline
        .replace(/^[\n\r]/, "")
        .replace(/[\n\r]$/, "")
        .split(/\r?\n/);

      output.forEach((chunk) => context.logger.logInfo(chunk, buildHeader()));
    });

    process.on("exit", (code) => {
      const header = buildHeader();

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
