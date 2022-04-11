import { ChildProcess } from "child_process";
import { Readable } from "stream";
import { Color } from "./colorize";
import { Command } from "./command";
import { defaultHeaderTransformer, Logger, LogLevel } from "./log";
import spawnCommand, { processStream, SpawnCommandContext } from "./spawnCommand";

afterAll(() => {
  jest.restoreAllMocks();
});

export const createMockStream = (): Readable => {
  const stream = new Readable();
  stream._read = (_size) => {
    /* dismiss */
  };
  return stream;
};

export class MockChildProcess extends ChildProcess {
  emitTimeout?: NodeJS.Timeout;
  resolveTimeout?: NodeJS.Timeout;

  override readonly pid: number;

  constructor(pid: number) {
    super();
    this.pid = pid;
    this.stdout = createMockStream();
    this.stderr = createMockStream();
  }

  clearTimeouts(): void {
    if (this.emitTimeout) {
      clearTimeout(this.emitTimeout);
    }
    if (this.resolveTimeout) {
      clearTimeout(this.resolveTimeout);
    }
  }
}

export const mockSpawnFunction = ({
  exitCode,
  emitTimeout = 5,
  resolveTimeout = 20,
  pid = 1,
}: {
  exitCode: number;
  emitTimeout?: number;
  resolveTimeout?: number;
  pid?: number;
}): MockChildProcess => {
  const process = new MockChildProcess(pid);

  process.emitTimeout = setTimeout(() => {
    if (!process.stdout || !process.stderr) {
      throw new Error("Process stdout / stderr is null");
    }
    process.stdout.emit("data", "stdout data");
    process.stderr.emit("data", "stderr data");
  }, emitTimeout);

  process.resolveTimeout = setTimeout(
    () => process.emit("exit", exitCode),
    resolveTimeout
  );

  return process;
};

export const buildMockedLogger = (): jest.Mocked<Logger> => {
  return {
    silent: false,
    writeToLogFile: false,
    appendToLogFile: jest.fn(),
    log: jest.fn(),
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
  };
};

describe("Command spawing", () => {
  describe("Helper functions", () => {
    describe("processStream", () => {
      it("sets the stream enconding to UTF-8", () => {
        const stream = createMockStream();
        processStream(stream, (_data) => {
          /* dismiss */
        });
        expect(stream.readableEncoding).toEqual("utf8");
      });

      it("calls the given callback with data trimmed and split by newline", (done) => {
        expect.assertions(1);
        const stream = createMockStream();
        processStream(stream, (data) => {
          expect(data).toEqual(["HEADER:", "Some information"]);
          done();
        });

        stream.emit("data", "\r\nHEADER:\nSome information\r\n");
      });

      it("handles the case where stream is null", () => {
        expect(() => {
          processStream(null, (_data) => {
            /* dismiss */
          });
        }).not.toThrow();
      });
    });
  });

  describe("spawnCommand", () => {
    const command: Command = {
      command: "test",
      args: ["a", "b"],
      index: 0,
    };

    const defaultContext: jest.Mocked<SpawnCommandContext> = {
      abortController: new AbortController(),
      allCommands: [command],
      logger: buildMockedLogger(),
      outputStderr: false,
      headerTransformer: jest.fn((command: Command, allCommands: Command[]) => {
        return defaultHeaderTransformer(command, allCommands);
      }),
      spawnFunction: jest.fn((_command, _args) => {
        return mockSpawnFunction({ exitCode: 0 });
      }),
      killFunction: jest.fn((_pid) => Promise.resolve()),
    };

    beforeEach(() => {
      defaultContext.abortController = new AbortController();
      defaultContext.spawnFunction.mockClear();
      defaultContext.killFunction.mockClear();
    });

    it("spawns a new child process and resolves with exit code", async () => {
      await expect(spawnCommand(command, defaultContext)).resolves.toEqual({ code: 0 });

      expect(defaultContext.spawnFunction).toHaveBeenCalledWith(
        command.command,
        command.args
      );
    });

    it("outputs a message when the process exits successfully", async () => {
      await spawnCommand(command, defaultContext);

      expect(defaultContext.logger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Finished successfully",
        { header: "[1/1]", headerColor: Color.GREEN }
      );
    });

    it("emits to stdout by default", async () => {
      await spawnCommand(command, defaultContext);

      expect(defaultContext.logger.logInfo).toHaveBeenCalledWith("stdout data", "[1/1]");
    });

    it("emits to stderr if enabled", async () => {
      await spawnCommand(command, {
        ...defaultContext,
        outputStderr: true,
      });

      expect(defaultContext.logger.logWarn).toHaveBeenCalledWith("stderr data", "[1/1]");
    });

    describe("Non-zero exit code", () => {
      const context: SpawnCommandContext = {
        ...defaultContext,
        spawnFunction: jest.fn((_command, _args) => {
          return mockSpawnFunction({ exitCode: 1 });
        }),
      };

      beforeEach(() => {
        context.abortController = new AbortController();
      });

      it("causes the promise to reject", async () => {
        await expect(spawnCommand(command, context)).rejects.toEqual(
          new Error("Process exited with code 1")
        );
      });

      it("outputs error message", async () => {
        await spawnCommand(command, context).catch(() => {
          /* dismiss */
        });

        expect(defaultContext.logger.logError).toHaveBeenCalledWith(
          'Command "test a b" failed: Process exited with code 1',
          "[1/1]"
        );
        expect(defaultContext.logger.appendToLogFile).toHaveBeenLastCalledWith(
          LogLevel.ERROR,
          new Error("Process exited with code 1")
        );
      });
    });

    describe("Process error", () => {
      const context: SpawnCommandContext = {
        ...defaultContext,
        spawnFunction: jest.fn((_command, _args) => {
          const process = mockSpawnFunction({ exitCode: 0 });
          setTimeout(() => process.emit("error", new Error("Test error"), 5));
          return process;
        }),
      };

      it("causes the promise to reject", async () => {
        await expect(spawnCommand(command, context)).rejects.toEqual(
          new Error("Test error")
        );
      });
    });

    describe("Aborting process", () => {
      const context: SpawnCommandContext = {
        ...defaultContext,
        spawnFunction: (command, args) => {
          const process = defaultContext.spawnFunction(command, args);
          setTimeout(() => context.abortController.abort(), 4);
          return process;
        },
      };

      beforeEach(() => {
        context.abortController = new AbortController();
      });

      it("causes the promise to reject", async () => {
        expect.assertions(3);
        try {
          await spawnCommand(command, context);
        } catch (e) {
          expect(e).toBeInstanceOf(Error);
          if (e instanceof Error) {
            expect(e.message).toEqual("The operation was aborted");
          }
          expect(context.logger.logError).toHaveBeenCalledWith(
            'Command "test a b" aborted',
            "[1/1]"
          );
        }
      });

      it("kills the child process", async () => {
        expect.assertions(2);
        try {
          await spawnCommand(command, context);
        } catch (e) {
          // process PID is mocked to be 1
          expect(context.killFunction).toHaveBeenCalledWith(1);
          expect(context.logger.appendToLogFile).toHaveBeenCalledWith(
            LogLevel.INFO,
            "Killed PID 1"
          );
        }
      });

      it("does not kill the process if the PID is undefined", async () => {
        const spawnFunction = (command: string, args: string[]): ChildProcess => {
          const process = defaultContext.spawnFunction(command, args);
          setTimeout(() => context.abortController.abort(), 4);
          (process as any).pid = undefined;
          return process;
        };
        expect.assertions(1);
        try {
          await spawnCommand(command, { ...context, spawnFunction });
        } catch (e) {
          expect(context.killFunction).not.toHaveBeenCalled();
        }
      });

      it("does not kill the process if it has already been killed", async () => {
        const spawnFunction = (command: string, args: string[]): ChildProcess => {
          const process = defaultContext.spawnFunction(command, args);
          setTimeout(() => context.abortController.abort(), 4);
          (process as any).killed = true;
          return process;
        };
        expect.assertions(1);
        try {
          await spawnCommand(command, { ...context, spawnFunction });
        } catch (e) {
          expect(context.killFunction).not.toHaveBeenCalled();
        }
      });

      // TODO: Fix this test, it doesn't work for some reason
      xit("outputs an error in the log file if the process can not be killed", async () => {
        const logger = buildMockedLogger();
        logger.writeToLogFile = true;

        const killFunction = (_pid: number) => {
          return Promise.reject("Test failure");
        };

        expect.assertions(1);
        try {
          await spawnCommand(command, { ...context, logger, killFunction });
        } catch (e) {
          expect(logger.appendToLogFile).toHaveBeenCalledWith(
            LogLevel.ERROR,
            "Failed to kill process: Test failure"
          );
        }
      });
    });
  });
});
