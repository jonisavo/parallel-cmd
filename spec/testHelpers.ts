/* istanbul ignore file */

import { ChildProcess } from "child_process";
import { Readable } from "stream";
import { Logger } from "../src/log";

export const createMockStream = (): Readable => {
  const stream = new Readable();
  stream._read = (_size) => {
    /* dismiss */
  };
  return stream;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asMockedFunction = <T extends (...args: any[]) => any>(
  func: T
): jest.MockedFunction<T> => {
  return func as jest.MockedFunction<T>;
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
