import parseArgs from "minimist";

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
