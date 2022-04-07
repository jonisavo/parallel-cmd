import { appendFileSync } from "fs";

const DATE_STRING = new Date().toISOString().replace(/\s|:/g, "_");
const LOG_FILE_PATH = `parallel-cmd-${DATE_STRING}.log`;

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

function getLogFunction(
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

export function appendToLogFile(level: LogLevel, message: unknown): void {
  if (message instanceof Error) {
    message = `${message.message}\n${message.stack}`;
  }
  appendFileSync(LOG_FILE_PATH, `[${level}] ${message}\n`);
}

export function log(level: LogLevel, message: unknown): void {
  const logFunction = getLogFunction(level);
  logFunction(message);
  appendToLogFile(level, message);
}
