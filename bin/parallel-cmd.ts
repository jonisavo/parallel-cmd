#!/usr/bin/env node

import parseArgs from "minimist";
import parallelCmd from "../src/index";
import ARGV, { parseParallelCmdOptionsFromArgv } from "./argv";
import help from "./help";

const argv: ARGV = parseArgs(process.argv.slice(2));

if (argv.h || argv.help) {
  help();
  process.exit(0);
}

const options = parseParallelCmdOptionsFromArgv(argv);

if (argv._.length === 0) {
  help();
  process.exit(2);
}

parallelCmd(argv._, options);
