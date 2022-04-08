import ARGV from "./argv";
import parallelCmd, { parseParallelCmdOptionsFromArgv } from "./parallelCmd";
import { Logger } from "./log";

export default parallelCmd;
export { parallelCmd, ARGV, parseParallelCmdOptionsFromArgv, Logger };
