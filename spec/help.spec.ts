import help from "../bin/help";

describe("CLI", () => {
  describe("help", () => {
    it("outputs to stdout", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
        /* stub */
      });
      help();
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });
});
