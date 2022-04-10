import { appendFileSync } from "fs";
import { Color, colorize } from "./colorize";
import { HeaderTransformerFunction } from "./parallelCmd";

export const DATE_STRING = new Date().toISOString().replace(/\s|:/g, "_");
const LOG_FILE_PATH = `parallel-cmd-${DATE_STRING}.log`;

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

type LogOptions = Partial<{
  header: string;
  headerColor: Color;
}>;

export const defaultHeaderTransformer: HeaderTransformerFunction = (
  command,
  allCommands
) => {
  return `[${command.index + 1}/${allCommands.length}]`;
};

export class Logger {
  silent: boolean;
  writeToLogFile: boolean;

  constructor({ silent = false, writeToLogFile = false } = {}) {
    this.silent = silent;
    this.writeToLogFile = writeToLogFile;
  }

  static getLogFunction(
    level: LogLevel
  ): typeof console.error | typeof console.warn | typeof console.log {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      default:
        return console.log;
    }
  }

  appendToLogFile(level: LogLevel, message: unknown): void {
    if (!this.writeToLogFile) {
      return;
    }
    if (message instanceof Error) {
      message = `${message.message}\n${message.stack}`;
    }
    appendFileSync(LOG_FILE_PATH, `[${level}] ${message}\n`);
  }

  log(level: LogLevel, message: unknown, options: LogOptions = {}): void {
    const getFullMessage = ({ colorized = false } = {}) => {
      if (options.header !== undefined) {
        const color = options.headerColor ?? Color.WHITE;
        const usedHeader = colorized ? colorize(color, options.header) : options.header;
        return `${usedHeader} ${message}`;
      }
      return message;
    };

    if (!this.silent) {
      const logFunction = Logger.getLogFunction(level);
      logFunction(getFullMessage({ colorized: true }));
    }
    this.appendToLogFile(level, getFullMessage());
  }

  logInfo(message: unknown, header?: string): void {
    this.log(LogLevel.INFO, message, { header, headerColor: Color.BLUE });
  }

  logWarn(message: unknown, header?: string): void {
    this.log(LogLevel.WARN, message, { header, headerColor: Color.YELLOW });
  }

  logError(message: unknown, header?: string): void {
    this.log(LogLevel.ERROR, message, { header, headerColor: Color.RED });
  }
}
