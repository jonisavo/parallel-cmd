import { appendFileSync } from "fs";
import { Color, colorText } from "./color";

const DATE_STRING = new Date().toISOString().replace(/\s|:/g, "_");
const LOG_FILE_PATH = `parallel-cmd-${DATE_STRING}.log`;

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export function appendToLogFile(level: LogLevel, message: unknown): void {
  if (message instanceof Error) {
    message = `${message.message}\n${message.stack}`;
  }
  appendFileSync(LOG_FILE_PATH, `[${level}] ${message}\n`);
}

export class Logger {
  silent: boolean;

  constructor({ silent = false } = {}) {
    this.silent = silent;
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

  log(
    level: LogLevel,
    message: unknown,
    {
      header = undefined,
      headerColor = Color.WHITE,
    }: { header?: string; headerColor?: Color } = {}
  ): void {
    const getFullMessage = ({ colorized = false } = {}) => {
      if (header !== undefined) {
        const usedHeader = colorized ? colorText(headerColor, header) : header;
        return `${usedHeader} ${message}`;
      }
      return message;
    };

    if (!this.silent) {
      const logFunction = Logger.getLogFunction(level);
      logFunction(getFullMessage({ colorized: true }));
    }
    appendToLogFile(level, getFullMessage());
  }
}
