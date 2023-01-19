declare namespace imageToAscii {
  interface ImageToAsciiOptions  {

  }
}

declare function imageToAscii(
  source: string|Buffer,
  options: imageToAscii.ImageToAsciiOptions,
  callback: (err: unknown, converted: string) => void);

export as namespace imageToAscii;
export = imageToAscii;
