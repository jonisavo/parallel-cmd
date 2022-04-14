import { ChildProcess } from "child_process";
import { EventEmitter } from "stream";
import { emitAbortEmitter } from "../src/abort";
import { Color } from "../src/colorize";
import { Command } from "../src/command";
import { defaultHeaderTransformer, LogLevel } from "../src/log";
import spawnCommand, { processStream, SpawnCommandContext } from "../src/spawnCommand";
import { buildMockedLogger, createMockStream, mockSpawnFunction } from "./testHelpers";

afterAll(() => {
  jest.restoreAllMocks();
});

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

    let context: jest.Mocked<SpawnCommandContext>;

    beforeEach(() => {
      context = {
        abortEmitter: new EventEmitter(),
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
    });

    it("spawns a new child process and resolves with exit code", async () => {
      await expect(spawnCommand(command, context)).resolves.toEqual({ code: 0 });

      expect(context.spawnFunction).toHaveBeenCalledWith(command.command, command.args);
    });

    it("outputs a message when the process exits successfully", async () => {
      await spawnCommand(command, context);

      expect(context.logger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        "Finished successfully",
        { header: "[1/1]", headerColor: Color.GREEN }
      );
    });

    it("emits to stdout by default", async () => {
      await spawnCommand(command, context);

      expect(context.logger.logInfo).toHaveBeenCalledWith("stdout data", "[1/1]");
    });

    it("emits to stderr if enabled", async () => {
      await spawnCommand(command, {
        ...context,
        outputStderr: true,
      });

      expect(context.logger.logWarn).toHaveBeenCalledWith("stderr data", "[1/1]");
    });

    describe("Non-zero exit code", () => {
      beforeEach(() => {
        context.spawnFunction.mockImplementation((_command, _args) => {
          return mockSpawnFunction({ exitCode: 1 });
        });
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

        expect(context.logger.logError).toHaveBeenCalledWith(
          'Command "test a b" failed: Process exited with code 1',
          "[1/1]"
        );
        expect(context.logger.appendToLogFile).toHaveBeenLastCalledWith(
          LogLevel.ERROR,
          new Error("Process exited with code 1")
        );
      });
    });

    describe("Process error", () => {
      it("causes the promise to reject", async () => {
        context.spawnFunction.mockImplementation((_command, _args) => {
          const process = mockSpawnFunction({ exitCode: 0 });
          setTimeout(() => process.emit("error", new Error("Test error"), 5));
          return process;
        });
        await expect(spawnCommand(command, context)).rejects.toEqual(
          new Error("Test error")
        );
      });
    });

    describe("Aborting process", () => {
      beforeEach(() => {
        context.spawnFunction.mockImplementation((_command, _args) => {
          const process = mockSpawnFunction({ exitCode: 0 });
          setTimeout(() => emitAbortEmitter(context.abortEmitter), 4);
          return process;
        });
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
          const process = context.spawnFunction(command, args);
          setTimeout(() => emitAbortEmitter(context.abortEmitter), 4);
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
          const process = context.spawnFunction(command, args);
          setTimeout(() => emitAbortEmitter(context.abortEmitter), 4);
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

      it("outputs an error in the log file if the process can not be killed", async () => {
        context.killFunction.mockImplementation((_pid: number) => {
          return Promise.reject("Test failure");
        });

        expect.assertions(1);
        try {
          await spawnCommand(command, context);
        } catch (e) {
          expect(context.logger.appendToLogFile).toHaveBeenCalledWith(
            LogLevel.ERROR,
            "Failed to kill process: Test failure"
          );
        }
      });
    });
  });
});
