export default function help(): void {
  [
    "parallel-cmd [commands]",
    "",
    "Options:",
    "--process-count, -p [count]",
    "Override the maximum process count (3 by default)",
    "",
    "--abort-on-error, -a",
    "Abort execution if one process fails",
    "",
    "--silent, -s",
    "Do not print anything to the console",
    "",
    "--write-log, -l",
    "Write output to log file",
    "",
    "--stderr, -e",
    "Output stderr in addition to stdout",
    "",
    "--help, -h",
    "Show this help and exit",
  ].forEach((chunk) => console.log(chunk));
}
