import { expect, test } from "bun:test";
import { bayer, floydSteinberg, mirror } from "../src/utils/post_process";

const image = (width: number, pixels: number[]): ImageData => ({
  width,
  height: pixels.length / width,
  data: new Uint8ClampedArray(pixels.flatMap((value) => [value, value, value, 255])),
} as ImageData);

test("mirror reverses each row and keeps alpha", () => {
  const data = image(3, [0, 128, 255, 32, 64, 96]);
  mirror(data);
  expect(Array.from(data.data.filter((_, index) => index % 4 === 0))).toEqual([255, 128, 0, 96, 64, 32]);
  expect(Array.from(data.data.filter((_, index) => index % 4 === 3))).toEqual([255, 255, 255, 255, 255, 255]);
});

test("new dither modes produce binary pixels", () => {
  for (const process of [(data: ImageData) => bayer(data, 2), (data: ImageData) => floydSteinberg(data)]) {
    const data = image(3, [40, 100, 160, 200, 230, 250]);
    process(data);
    expect(Array.from(data.data.filter((_, index) => index % 4 === 0)).every((value) => value === 0 || value === 255)).toBe(true);
  }
});
