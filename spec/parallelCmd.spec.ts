import spawn = require("cross-spawn");
import treeKill = require("tree-kill");
import { getWholeCommandString, parseCommand } from "../src/command";
import { defaultHeaderTransformer, LogLevel } from "../src/log";
import parallelCmd, { ParallelCmdOptions } from "../src/parallelCmd";
import { buildMockedLogger, MockChildProcess, mockSpawnFunction } from "./testHelpers";

jest.mock("cross-spawn");
jest.mock("tree-kill");

afterAll(() => {
  jest.restoreAllMocks();
});

describe("parallelCmd", () => {
  const commands = ["hello world", "lorem", "parallel-cmd -a lorem ipsum", "exit 0"];

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
      spawnFunction: jest.fn((_command, _args) => {
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

  const createDifferentSpawnFunctionForCommand = (
    spawnFunc: () => MockChildProcess,
    predicate: (command: string) => boolean
  ): jest.Mock<MockChildProcess, [command: string, args: string[]]> => {
    return jest.fn((command: string, args: string[]) => {
      const entireCommand = getWholeCommandString({
        command,
        args,
        index: 0,
      });
      let process: MockChildProcess;
      if (predicate(entireCommand)) {
        process = spawnFunc();
      } else {
        process = mockSpawnFunction({ exitCode: 0 });
      }
      childProcesses.push(process);
      return process;
    });
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("calls the spawn function for each process according to the max process count", async () => {
    const promise = parallelCmd(commands, options);

    expect(options.spawnFunction).toHaveBeenCalledWith("hello", ["world"]);
    expect(options.spawnFunction).toHaveBeenCalledWith("lorem", []);
    expect(options.spawnFunction).toHaveBeenCalledWith("parallel-cmd", [
      "-a",
      "lorem",
      "ipsum",
    ]);
    expect(options.spawnFunction).not.toHaveBeenCalledWith("exit", ["0"]);

    await promise;

    expect(options.spawnFunction).toHaveBeenCalledWith("exit", ["0"]);
  });

  it("starts every command at once if the process count is zero", async () => {
    options.maxProcessCount = 0;
    const promise = parallelCmd(commands, options);
    expect(options.spawnFunction).toHaveBeenCalledWith("hello", ["world"]);
    expect(options.spawnFunction).toHaveBeenCalledWith("lorem", []);
    expect(options.spawnFunction).toHaveBeenCalledWith("parallel-cmd", [
      "-a",
      "lorem",
      "ipsum",
    ]);
    expect(options.spawnFunction).toHaveBeenCalledWith("exit", ["0"]);
    await promise;
  });

  it("uses cross-spawn as the default spawn function", async () => {
    const promise = parallelCmd(commands);

    expect(spawn).toHaveBeenCalledWith("hello", ["world"]);
    expect(spawn).toHaveBeenCalledWith("lorem", []);
    expect(spawn).toHaveBeenCalledWith("parallel-cmd", ["-a", "lorem", "ipsum"]);

    await promise;

    expect(spawn).toHaveBeenCalledWith("exit", ["0"]);
  });

  it("uses treeKill as the default kill function", async () => {
    const spawnFunction = createDifferentSpawnFunctionForCommand(
      () => mockSpawnFunction({ exitCode: 1 }),
      (command) => command === commands[0]
    );
    await parallelCmd(commands, { spawnFunction, abortOnError: true });
    expect(treeKill).toHaveBeenCalled();
  });

  describe("return value", () => {
    it("contains the correct values when all processes succeed", async () => {
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: false,
        totalProcessCount: 4,
        completedProcessCount: 4,
        failedProcessCount: 0,
      });
    });

    it("contains the correct values when some processes fail", async () => {
      options.spawnFunction = createDifferentSpawnFunctionForCommand(
        () => mockSpawnFunction({ exitCode: 1 }),
        (command) => command === commands[1]
      );
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: false,
        totalProcessCount: 4,
        completedProcessCount: 3,
        failedProcessCount: 1,
      });
    });

    it("contains the correct values when one of the first processes fails", async () => {
      options.abortOnError = true;
      options.spawnFunction = createDifferentSpawnFunctionForCommand(
        () => mockSpawnFunction({ exitCode: 1, emitTimeout: 1, resolveTimeout: 5 }),
        (command) => command === commands[1]
      );
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: true,
        totalProcessCount: 4,
        completedProcessCount: 0,
        failedProcessCount: 3,
      });
    });

    it("contains the correct values when the last remaining process is aborted", async () => {
      options.abortOnError = true;
      options.spawnFunction = createDifferentSpawnFunctionForCommand(
        () => mockSpawnFunction({ exitCode: 1, emitTimeout: 0, resolveTimeout: 7 }),
        (command) => command === commands[commands.length - 1]
      );
      const result = await parallelCmd(commands, options);
      expect(result).toEqual({
        aborted: true,
        totalProcessCount: 4,
        completedProcessCount: 3,
        failedProcessCount: 1,
      });
    });
  });

  describe("printing to stdout", () => {
    it("is done when starting each process", async () => {
      const promise = parallelCmd(commands, options);

      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "hello world"',
        "[1/4]"
      );
      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "lorem"',
        "[2/4]"
      );
      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "parallel-cmd -a lorem ipsum"',
        "[3/4]"
      );
      expect(options.logger.logInfo).not.toHaveBeenCalledWith(
        'Running command "exit 0"',
        "[4/4]"
      );

      await promise;

      expect(options.logger.logInfo).toHaveBeenCalledWith(
        'Running command "exit 0"',
        "[4/4]"
      );
    });
    it("is done for stdout of each process", async () => {
      await parallelCmd(commands, options);

      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[1/4]");
      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[2/4]");
      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[3/4]");
      expect(options.logger.logInfo).toHaveBeenCalledWith("stdout data", "[4/4]");
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

      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[1/4]");
      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[2/4]");
      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[3/4]");
      expect(options.logger.logWarn).toHaveBeenCalledWith("stderr data", "[4/4]");
    });
  });

  const createAbortMockOptions = (): void => {
    options.abortOnError = true;
    options.spawnFunction = createDifferentSpawnFunctionForCommand(
      () => mockSpawnFunction({ exitCode: 1, emitTimeout: 1, resolveTimeout: 5 }),
      (command) => command === commands[1]
    );
  };

  it("outputs a message to the log file on abort when a command is skipped", async () => {
    createAbortMockOptions();
    await parallelCmd(commands, options);
    expect(options.logger.appendToLogFile).toHaveBeenCalledWith(
      LogLevel.WARN,
      "Skipped 1 command"
    );
  });

  it("outputs a message to the log file on abort when multiple commands are skipped", async () => {
    createAbortMockOptions();
    const newCommands = [...commands, "final"];
    await parallelCmd(newCommands, options);
    expect(options.logger.appendToLogFile).toHaveBeenCalledWith(
      LogLevel.WARN,
      "Skipped 2 commands"
    );
  });
});
