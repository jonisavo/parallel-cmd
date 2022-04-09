import { white, yellow, red, green, blue } from "kleur/colors";
import { Color, colorize } from "./colorize";

describe("colorize", () => {
  const TEST = "TEST";

  it("colors the text using kleur", () => {
    expect(colorize(Color.WHITE, TEST)).toEqual(white(TEST));
    expect(colorize(Color.BLUE, TEST)).toEqual(blue(TEST));
    expect(colorize(Color.GREEN, TEST)).toEqual(green(TEST));
    expect(colorize(Color.RED, TEST)).toEqual(red(TEST));
    expect(colorize(Color.YELLOW, TEST)).toEqual(yellow(TEST));
  });

  it("returns the argument if an invalid Color enum is given", () => {
    expect(colorize(-1, TEST)).toEqual(TEST);
  });
});
