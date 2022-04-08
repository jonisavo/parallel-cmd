import { white, yellow, red, green, blue } from "kleur/colors";

export enum Color {
  WHITE,
  YELLOW,
  RED,
  GREEN,
  BLUE,
}

export function colorize(color: Color, text: string): string {
  switch (color) {
    case Color.WHITE:
      return white(text);
    case Color.YELLOW:
      return yellow(text);
    case Color.RED:
      return red(text);
    case Color.GREEN:
      return green(text);
    case Color.BLUE:
      return blue(text);
    default:
      return text;
  }
}
