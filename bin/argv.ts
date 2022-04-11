import parseArgs from "minimist";
import { Logger } from "../src/log";
import { ParallelCmdOptions } from "../src/parallelCmd";

export default interface ARGV extends parseArgs.ParsedArgs {
  "process-count"?: number;
  p?: number;
  "abort-on-error"?: boolean;
  a?: boolean;
  silent?: boolean;
  s?: boolean;
  "write-log"?: boolean;
  l?: boolean;
  stderr?: boolean;
  e?: boolean;
  help?: boolean;
  h?: boolean;
}

export function parseParallelCmdOptionsFromArgv(argv: ARGV): ParallelCmdOptions {
  let maxProcessCount: number | undefined;

  if (typeof argv["process-count"] === "number") {
    maxProcessCount = argv["process-count"];
  } else if (typeof argv.p === "number") {
    maxProcessCount = argv.p;
  }

  const checkBooleanOpts = (...opts: (keyof ARGV)[]): boolean => {
    return opts.some((opt) => argv[opt]);
  };

  const abortOnError = checkBooleanOpts("abort-on-error", "a");
  const silent = checkBooleanOpts("silent", "s");
  const writeToLogFile = checkBooleanOpts("write-log", "l");
  const outputStderr = checkBooleanOpts("stderr", "e");
  const logger = new Logger({ silent, writeToLogFile });

  return {
    maxProcessCount,
    abortOnError,
    outputStderr,
    logger,
  };
}
