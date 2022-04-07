#!/usr/bin/env node

import parseArgs from "minimist";
import { ARGV, parseProcessCount, parallelCmd } from "../src/index";
import { Logger } from "../src/log";

const argv: ARGV = parseArgs(process.argv.slice(2));

const maxProcessCount = parseProcessCount(argv);

if (typeof maxProcessCount === "number" && isNaN(maxProcessCount)) {
  console.error("Invalid max process count given");
  process.exit(2);
}

if (argv._.length === 0) {
  console.error("No commands given");
  process.exit(2);
}

const abortOnError = argv["abort-on-error"] || argv.a;

const silent = argv.silent || argv.s;

parallelCmd(argv._, {
  maxProcessCount,
  abortOnError,
  logger: new Logger({ silent }),
});
