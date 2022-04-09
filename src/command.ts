import treeKill from "tree-kill";

export interface Command {
  command: string;
  args: string[];
  index: number;
}

export function parseCommand(input: string, index: number): Command {
  const inputChunks = input.split(/\s/g);

  return {
    command: inputChunks[0],
    args: inputChunks.slice(1),
    index,
  };
}

export function getWholeCommandString(command: Command): string {
  let commandString = command.command;
  if (command.args.length > 0) {
    commandString += ` ${command.args.join(" ")}`;
  }
  return commandString;
}

export function defaultCommandKillFunction(pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    treeKill(pid, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
