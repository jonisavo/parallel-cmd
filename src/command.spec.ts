import { execFile } from "child_process";
import {
  defaultCommandKillFunction,
  getWholeCommandString,
  parseCommand,
} from "./command";

describe("Command utilities", () => {
  const npmInstallConcurrentlyString = "npm install -g concurrently";
  const npmInstallConcurrentlyCommandAndArgs = {
    command: "npm",
    args: ["install", "-g", "concurrently"],
  };
  const explorerString = "explorer";
  const explorerCommandAndArgs = {
    command: "explorer",
    args: [],
  };

  describe("parseCommand", () => {
    it("parses the main command and its arguments from the input string", () => {
      expect(parseCommand(npmInstallConcurrentlyString, 0)).toEqual({
        ...npmInstallConcurrentlyCommandAndArgs,
        index: 0,
      });

      expect(parseCommand(explorerString, 1)).toEqual({
        ...explorerCommandAndArgs,
        index: 1,
      });
    });
  });

  describe("getWholeCommandString", () => {
    it("pieces together the original command string", () => {
      const npmInstallConcurrentlyCommand = {
        ...npmInstallConcurrentlyCommandAndArgs,
        index: 0,
      };
      expect(getWholeCommandString(npmInstallConcurrentlyCommand)).toEqual(
        npmInstallConcurrentlyString
      );
      const explorerCommand = {
        ...explorerCommandAndArgs,
        index: 0,
      };
      expect(getWholeCommandString(explorerCommand)).toEqual(explorerString);
    });
  });

  describe("defaultCommandKillFunction", () => {
    it("kills a process and resolves when successful", async () => {
      expect.assertions(1);
      const process = execFile("node", ["-e", "setTimeout(() => {}, 3000)"]);
      process.on("close", (code, _signal) => {
        expect(code).toEqual(1);
      });

      if (process.pid === undefined) {
        throw new Error("Process could not start");
      }

      await defaultCommandKillFunction(process.pid);
    });

    it("rejects on error", async () => {
      await expect(defaultCommandKillFunction(0)).rejects.toBeTruthy();
    });
  });
});
