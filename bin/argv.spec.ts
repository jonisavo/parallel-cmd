import { Logger, ParallelCmdOptions } from "../src";
import ARGV, { parseParallelCmdOptionsFromArgv } from "./argv";

describe("ARGV utilities", () => {
  describe("parseParallelCmdOptionsFromArgv", () => {
    const defaultOptions: ParallelCmdOptions = {
      maxProcessCount: undefined,
      abortOnError: false,
      outputStderr: false,
      logger: new Logger(),
    };

    const expectArgvToParseToOptions = (
      argv: ARGV,
      options: ParallelCmdOptions
    ): void => {
      expect(parseParallelCmdOptionsFromArgv(argv)).toEqual({
        ...defaultOptions,
        ...options,
      });
    };

    it("defaults to the correct options", () => {
      const emptyArgv: ARGV = { _: [] };
      expectArgvToParseToOptions(emptyArgv, defaultOptions);
    });

    it("parses the process count", () => {
      expectArgvToParseToOptions(
        {
          "process-count": 5,
          _: [],
        },
        { maxProcessCount: 5 }
      );
      expectArgvToParseToOptions(
        {
          p: 5,
          _: [],
        },
        { maxProcessCount: 5 }
      );
    });

    it("parses abort on error", () => {
      expectArgvToParseToOptions(
        {
          "abort-on-error": true,
          _: [],
        },
        { abortOnError: true }
      );
      expectArgvToParseToOptions(
        {
          a: true,
          _: [],
        },
        { abortOnError: true }
      );
    });

    it("parses silent", () => {
      let options = parseParallelCmdOptionsFromArgv({
        silent: true,
        _: [],
      });
      expect(options.logger?.silent).toEqual(true);
      options = parseParallelCmdOptionsFromArgv({
        s: true,
        _: [],
      });
      expect(options.logger?.silent).toEqual(true);
    });

    it("parses write to log file", () => {
      let options = parseParallelCmdOptionsFromArgv({
        "write-log": true,
        _: [],
      });
      expect(options.logger?.writeToLogFile).toEqual(true);
      options = parseParallelCmdOptionsFromArgv({
        l: true,
        _: [],
      });
      expect(options.logger?.writeToLogFile).toEqual(true);
    });

    it("parses output stderr", () => {
      expectArgvToParseToOptions(
        {
          stderr: true,
          _: [],
        },
        { outputStderr: true }
      );
      expectArgvToParseToOptions(
        {
          e: true,
          _: [],
        },
        { outputStderr: true }
      );
    });
  });
});
