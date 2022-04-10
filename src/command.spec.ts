import treeKill from "tree-kill";
import {
  defaultCommandKillFunction,
  getWholeCommandString,
  parseCommand,
} from "./command";

jest.mock("tree-kill");

afterAll(() => {
  jest.restoreAllMocks();
});

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
    let treeKillSpy: jest.MockedFunction<typeof treeKill>;

    const mockTreeKill = (error: Error | undefined) => {
      treeKillSpy.mockImplementation((_pid, signal, callback) => {
        if (typeof signal === "function") {
          (signal as unknown as (error: Error | undefined) => void)(error);
        }
        if (typeof callback === "function") {
          callback(error);
        }
      });
    };

    beforeEach(() => {
      treeKillSpy = treeKill as unknown as jest.MockedFunction<typeof treeKill>;
    });

    it("calls treeKill", async () => {
      mockTreeKill(undefined);

      await defaultCommandKillFunction(1);

      expect(treeKillSpy).toHaveBeenCalled();
    });

    it("rejects on error", async () => {
      mockTreeKill(new Error("Test"));
      await expect(defaultCommandKillFunction(0)).rejects.toEqual(new Error("Test"));
    });
  });
});
