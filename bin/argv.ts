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

  const abortOnError = argv["abort-on-error"] || argv.a;
  const silent = argv.silent || argv.s;
  const writeToLogFile = argv["write-log"] || argv.l;
  const outputStderr = argv.stderr || argv.e;
  const logger = new Logger({ silent, writeToLogFile });

  return {
    maxProcessCount,
    abortOnError,
    outputStderr,
    logger,
  };
}
