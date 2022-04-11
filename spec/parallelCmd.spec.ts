import { parseCommand } from "../src/command";
import { defaultHeaderTransformer } from "../src/log";
import parallelCmd, { ParallelCmdOptions } from "../src/parallelCmd";
import { buildMockedLogger, MockChildProcess, mockSpawnFunction } from "./testHelpers";

describe("parallelCmd", () => {
  const commands = ["hello world", "lorem", "parallel-cmd -a lorem ipsum"];

  let childProcesses: MockChildProcess[] = [];

  let options!: Required<ParallelCmdOptions>;

  beforeEach(() => {
    childProcesses = [];
    options = {
      allCommands: commands.map((text, i) => parseCommand(text, i)),
      abortController: new AbortController(),
      maxProcessCount: 3,
      abortOnError: false,
      outputStderr: false,
      headerTransformer: defaultHeaderTransformer,
      spawnFunction: jest.fn((_command) => {
        const process = mockSpawnFunction({ exitCode: 0 });
        childProcesses.push(process);
        return process;
      }),
      killFunction: jest.fn((pid) => {
        const indexOfProcess = childProcesses.findIndex((process) => process.pid === pid);
        childProcesses[indexOfProcess].clearTimeouts();
        childProcesses.splice(indexOfProcess, 1);
        return Promise.resolve();
      }),
      logger: buildMockedLogger(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("calls the spawn function for each process", async () => {
    const promise = parallelCmd(commands, options);

    expect(options.spawnFunction).toHaveBeenCalledWith("hello", ["world"]);
    expect(options.spawnFunction).toHaveBeenCalledWith("lorem", []);
    expect(options.spawnFunction).toHaveBeenCalledWith("parallel-cmd", [
      "-a",
      "lorem",
      "ipsum",
    ]);

    await promise;
  });

  describe("return value", () => {
    it("contains the correct values when all processes succeed", async () => {
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: false,
        totalProcessCount: 3,
        completedProcessCount: 3,
        failedProcessCount: 0,
      });
    });

    it("contains the correct values when some processes fail", async () => {
      options.spawnFunction = jest.fn((command) => {
        let process: MockChildProcess;
        if (command === commands[1]) {
          process = mockSpawnFunction({ exitCode: 1 });
        } else {
          process = mockSpawnFunction({ exitCode: 0 });
        }
        childProcesses.push(process);
        return process;
      });
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: false,
        totalProcessCount: 3,
        completedProcessCount: 2,
        failedProcessCount: 1,
      });
    });

    it("contains the correct values when the processes are aborted", async () => {
      options.abortOnError = true;
      options.spawnFunction = jest.fn((command) => {
        let process: MockChildProcess;
        if (command === commands[1]) {
          process = mockSpawnFunction({ exitCode: 1, emitTimeout: 1, resolveTimeout: 5 });
        } else {
          process = mockSpawnFunction({ exitCode: 0 });
        }
        childProcesses.push(process);
        return process;
      });
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: true,
        totalProcessCount: 3,
        completedProcessCount: 0,
        failedProcessCount: 3,
      });
    });
  });

  describe("printing to stdout", () => {
    it("is done when starting each process", async () => {
      const promise = parallelCmd(commands, options);

      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "hello world"',
        "[1/3]"
      );
      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "lorem"',
        "[2/3]"
      );
      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "parallel-cmd -a lorem ipsum"',
        "[3/3]"
      );

      await promise;
    });
    it("is done for stdout of each process", async () => {
      await parallelCmd(commands, options);

      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[1/3]");
      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[2/3]");
      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[3/3]");
    });
  });

  describe("printing to stderr", () => {
    it("is not done for a successful process", async () => {
      await parallelCmd(commands, options);
      expect(options.logger.logWarn).not.toHaveBeenCalled();
      expect(options.logger.logError).not.toHaveBeenCalled();
    });
    it("is done for stderr of a process if enabled", async () => {
      options.outputStderr = true;
      await parallelCmd(commands, options);

      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[1/3]");
      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[2/3]");
      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[3/3]");
    });
  });
});
