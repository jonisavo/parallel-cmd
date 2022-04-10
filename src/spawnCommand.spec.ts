import { ChildProcess } from "child_process";
import { Readable } from "stream";
import { Color } from "./colorize";
import { Command } from "./command";
import { defaultHeaderTransformer, LogLevel } from "./log";
import spawnCommand, { processStream, SpawnCommandContext } from "./spawnCommand";

afterAll(() => {
  jest.restoreAllMocks();
});

const createMockStream = (): Readable => {
  const stream = new Readable();
  stream._read = (size) => {
    /* dismiss */
  };
  return stream;
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
    const mockSpawnFunction = (exitCode: number): ChildProcess => {
      const process = new ChildProcess();
      (process as any).pid = 1;
      process.stdout = createMockStream();
      process.stderr = createMockStream();

      setTimeout(() => {
        if (!process.stdout || !process.stderr) {
          throw new Error("Process stdout / stderr is null");
        }
        process.stdout.emit("data", "stdout data");
        process.stderr.emit("data", "stderr data");
      }, 5);

      setTimeout(() => process.emit("exit", exitCode), 10);

      return process;
    };
    const defaultContext: SpawnCommandContext = {
      abortController: new AbortController(),
      allCommands: [command],
      logger: {
        silent: false,
        writeToLogFile: false,
        appendToLogFile: jest.fn(),
        log: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarn: jest.fn(),
      },
      outputStderr: false,
      headerTransformer: jest.fn((command: Command, allCommands: Command[]) => {
        return defaultHeaderTransformer(command, allCommands);
      }),
      spawnFunction: jest.fn((command, args) => {
        return mockSpawnFunction(0);
      }),
      killFunction: jest.fn(),
    };

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

    const exitCodeOneContext: SpawnCommandContext = {
      ...defaultContext,
      spawnFunction: jest.fn((command, args) => {
        return mockSpawnFunction(1);
      }),
    };

    it("rejects if the process exits with non-zero exit code", async () => {
      await expect(spawnCommand(command, exitCodeOneContext)).rejects.toEqual(
        new Error("Process exited with code 1")
      );
    });

    it("outputs error message when the process exits with non-zero exit code", async () => {
      await spawnCommand(command, exitCodeOneContext).catch(() => {
        /* dismiss */
      });

      expect(defaultContext.logger.logError).toHaveBeenCalledWith(
        'Command "test a b" failed: Process exited with code 1',
        "[1/1]"
      );
    });
  });
});
