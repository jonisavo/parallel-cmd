import parseArgs from "minimist";

export default interface ARGV extends parseArgs.ParsedArgs {
  "process-count"?: number;
  p?: number;
  "abort-on-error"?: boolean;
  a?: boolean;
}

export function parseProcessCount(argv: ARGV): number | undefined {
  if (typeof argv["process-count"] === "number") {
    return argv["process-count"];
  }
  if (typeof argv.p === "number") {
    return argv.p;
  }
  return undefined;
}
