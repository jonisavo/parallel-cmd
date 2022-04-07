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
  return `${command.command} ${command.args.join(" ")}`;
}
