#!/usr/bin/env node

import parseArgs from "minimist";
import parallelCmd, { ARGV, parseParallelCmdOptionsFromArgv } from "../src/index";

const argv: ARGV = parseArgs(process.argv.slice(2));

const options = parseParallelCmdOptionsFromArgv(argv);

if (argv._.length === 0) {
  console.error("No commands given");
  process.exit(2);
}

parallelCmd(argv._, options);
