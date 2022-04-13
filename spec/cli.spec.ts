import help from "../bin/help";
import { runCli } from "../bin/parallel-cmd";
import parallelCmd from "../src/index";
import { asMockedFunction } from "./testHelpers";

jest.mock("../src/index");
jest.mock("../bin/help");

const helpMock = asMockedFunction(help);
const parallelCmdMock = asMockedFunction(parallelCmd);

describe("CLI", () => {
  let previousProcessArgv: string[];

  beforeEach(() => {
    previousProcessArgv = process.argv;
  });

  afterEach(() => {
    process.argv = previousProcessArgv;
    helpMock.mockReset();
    parallelCmdMock.mockReset();
  });

  const mockProcessArgv = (...argv: string[]): void => {
    process.argv = ["node", "parallel-cmd.js", ...argv];
  };

  describe("runCli", () => {
    describe("on successful run", () => {
      beforeEach(() => {
        parallelCmdMock.mockResolvedValue({
          aborted: false,
          totalProcessCount: 2,
          completedProcessCount: 2,
          failedProcessCount: 0,
        });
        mockProcessArgv("command1", "command2");
      });

      it("resolves with exit code 0", async () => {
        const exitCode = await runCli();
        await expect(exitCode).toEqual(0);
      });

      it("does not show help", async () => {
        await runCli();
        expect(helpMock).not.toHaveBeenCalled();
      });
    });

    it("shows help and resolves to code 0 when a help option is present", async () => {
      mockProcessArgv("command", "-h");

      await expect(runCli()).resolves.toEqual(0);
      expect(helpMock).toHaveBeenCalled();

      mockProcessArgv("command", "--help");

      helpMock.mockClear();

      await expect(runCli()).resolves.toEqual(0);
      expect(helpMock).toHaveBeenCalled();
    });

    it("shows help and resolves to code 2 when no commands are given", async () => {
      mockProcessArgv();

      await expect(runCli()).resolves.toEqual(2);
      expect(helpMock).toHaveBeenCalled();
    });

    it("resolves to code 1 if the run is aborted", async () => {
      parallelCmdMock.mockResolvedValue({
        aborted: true,
        totalProcessCount: 2,
        completedProcessCount: 0,
        failedProcessCount: 1,
      });
      mockProcessArgv("command1", "command2");
      await expect(runCli()).resolves.toEqual(1);
    });
  });
});
