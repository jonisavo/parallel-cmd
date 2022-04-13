#!/usr/bin/env node

import parseArgs from "minimist";
import parallelCmd from "../src/index";
import ARGV, { parseParallelCmdOptionsFromArgv } from "./argv";
import help from "./help";

/**
 * Main function for the parallel-cmd CLI
 * @returns exit code
 */
export async function runCli(): Promise<number> {
  const argv: ARGV = parseArgs(process.argv.slice(2));

  if (argv.h || argv.help) {
    help();
    return 0;
  }

  if (argv._.length === 0) {
    help();
    return 2;
  }

  const options = parseParallelCmdOptionsFromArgv(argv);

  const result = await parallelCmd(argv._, options);

  if (result.aborted) {
    return 1;
  }

  return 0;
}

runCli().then((code) => (process.exitCode = code));
