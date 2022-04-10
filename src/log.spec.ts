import fs from "fs";
import { blue, red, white, yellow } from "kleur/colors";
import { DATE_STRING, defaultHeaderTransformer, Logger, LogLevel } from "./log";

describe("Logging", () => {
  let appendFileSyncSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    appendFileSyncSpy = jest.spyOn(fs, "appendFileSync");
    consoleLogSpy = jest.spyOn(console, "log");
    consoleWarnSpy = jest.spyOn(console, "warn");
    consoleErrorSpy = jest.spyOn(console, "error");
  });

  afterEach(() => {
    appendFileSyncSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const expectLogFileMessage = (message: string): void => {
    expect(appendFileSyncSpy).toHaveBeenCalledWith(
      `parallel-cmd-${DATE_STRING}.log`,
      message + "\n"
    );
  };

  describe("Log utilities", () => {
    describe("defaultHeaderTransformer", () => {
      it("outputs the current message number and number of all commands", () => {
        const command = {
          command: "explorer",
          args: [],
          index: 0,
        };
        const allCommands = [
          command,
          {
            command: "reboot",
            args: [],
            index: 1,
          },
        ];
        expect(defaultHeaderTransformer(command, allCommands)).toEqual("[1/2]");
      });
    });
  });

  describe("Logger", () => {
    describe("::getLogFunction", () => {
      it("returns the correct log function for the given log level", () => {
        const functions = [
          LogLevel.ERROR,
          LogLevel.WARN,
          LogLevel.INFO,
          LogLevel.DEBUG,
        ].map((level) => Logger.getLogFunction(level));
        expect(functions).toEqual([
          console.error,
          console.warn,
          console.log,
          console.log,
        ]);
      });
    });

    const getConsoleSpy = (level: LogLevel): jest.SpyInstance => {
      switch (level) {
        case LogLevel.ERROR:
          return consoleErrorSpy;
        case LogLevel.WARN:
          return consoleWarnSpy;
        default:
          return consoleLogSpy;
      }
    };

    const expectConsoleOutput = (
      level: LogLevel,
      message: string,
      { header = undefined }: { header?: string } = {}
    ) => {
      const consoleMsg = typeof header === "string" ? `${header} ${message}` : message;
      expect(getConsoleSpy(level)).toHaveBeenCalledWith(consoleMsg);
    };

    describe("#appendToLogFile", () => {
      let logger: Logger;
      beforeEach(() => (logger = new Logger({ writeToLogFile: true })));

      it("calls appendFileSync with the file path and message", () => {
        logger.appendToLogFile(LogLevel.INFO, "Message");
        expectLogFileMessage("[INFO] Message");
      });

      it("it uses the given log level in the output", () => {
        logger.appendToLogFile(LogLevel.DEBUG, "Message");
        expectLogFileMessage("[DEBUG] Message");
        logger.appendToLogFile(LogLevel.ERROR, "Message");
        expectLogFileMessage("[ERROR] Message");
        logger.appendToLogFile(LogLevel.WARN, "Message");
        expectLogFileMessage("[WARN] Message");
      });

      it("it outputs Errors with their message and stacktrace", () => {
        const error = new Error("Error");
        logger.appendToLogFile(LogLevel.ERROR, error);
        expectLogFileMessage(`[ERROR] Error\n${error.stack}`);
      });

      it("does not output anything if writing to log file is disabled", () => {
        logger.writeToLogFile = false;
        logger.appendToLogFile(LogLevel.DEBUG, "Message");
        logger.appendToLogFile(LogLevel.ERROR, "Message");
        logger.appendToLogFile(LogLevel.WARN, "Message");
        expect(appendFileSyncSpy).not.toHaveBeenCalled();
      });
    });

    describe("#log", () => {
      it("writes to the console", () => {
        const logger = new Logger();
        logger.log(LogLevel.INFO, "Lorem ipsum");
        expectConsoleOutput(LogLevel.INFO, "Lorem ipsum");
      });

      it("writes a colorized header when passed", () => {
        const logger = new Logger();
        logger.log(LogLevel.INFO, "Lorem ipsum", { header: ">" });
        expectConsoleOutput(LogLevel.INFO, "Lorem ipsum", {
          header: white(">"),
        });
      });

      it("does not write to console when the Logger is silenced", () => {
        const logger = new Logger({ silent: true });
        logger.log(LogLevel.INFO, "Lorem ipsum");
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it("writes to log file if enabled in the Logger", () => {
        const logger = new Logger({ writeToLogFile: true });
        logger.log(LogLevel.INFO, "Lorem ipsum");
        expectLogFileMessage("[INFO] Lorem ipsum");
      });

      it("writes the header to the log file without ANSI colors", () => {
        const logger = new Logger({ writeToLogFile: true });
        logger.log(LogLevel.INFO, "Lorem ipsum", { header: ">" });
        expectLogFileMessage("[INFO] > Lorem ipsum");
      });
    });

    describe("#logInfo", () => {
      let logger: Logger;
      beforeEach(() => (logger = new Logger({ writeToLogFile: true })));

      it("writes to log with log level INFO", () => {
        logger.logInfo("Info");
        expectConsoleOutput(LogLevel.INFO, "Info");
        expectLogFileMessage("[INFO] Info");
      });

      it("colors the header blue", () => {
        logger.logInfo("Info", ">");
        expectConsoleOutput(LogLevel.INFO, "Info", { header: blue(">") });
        expectLogFileMessage("[INFO] > Info");
      });
    });

    describe("#logWarn", () => {
      let logger: Logger;
      beforeEach(() => (logger = new Logger({ writeToLogFile: true })));

      it("writes to log with log level WARN", () => {
        logger.logWarn("Warn");
        expectConsoleOutput(LogLevel.WARN, "Warn");
        expectLogFileMessage("[WARN] Warn");
      });

      it("colors the header yellow", () => {
        logger.logWarn("Warn", "!");
        expectConsoleOutput(LogLevel.WARN, "Warn", { header: yellow("!") });
        expectLogFileMessage("[WARN] ! Warn");
      });
    });

    describe("#logError", () => {
      let logger: Logger;
      beforeEach(() => (logger = new Logger({ writeToLogFile: true })));

      it("writes to log with log level ERROR", () => {
        logger.logError("Error");
        expectConsoleOutput(LogLevel.ERROR, "Error");
        expectLogFileMessage("[ERROR] Error");
      });

      it("colors the header red", () => {
        logger.logError("Error", "?!");
        expectConsoleOutput(LogLevel.ERROR, "Error", { header: red("?!") });
        expectLogFileMessage("[ERROR] ?! Error");
      });
    });
  });
});
