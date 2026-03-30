import type { PostProcessType } from "$/types";

export interface ImageProcessOptions {
  method: PostProcessType | "none";
  threshold: number;
  contrast: number;
}

export const calculateFitScale = (
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number,
  padding: number = 10,
): { scale: number; width: number; height: number } => {
  const availableWidth = maxWidth - padding * 2;
  const availableHeight = maxHeight - padding * 2;

  const scaleX = availableWidth / imgWidth;
  const scaleY = availableHeight / imgHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  return {
    scale,
    width: Math.floor(imgWidth * scale),
    height: Math.floor(imgHeight * scale),
  };
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

const applyContrast = (image: ImageData, contrast: number): ImageData => {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = factor * (image.data[i] - 128) + 128;
    image.data[i + 1] = factor * (image.data[i + 1] - 128) + 128;
    image.data[i + 2] = factor * (image.data[i + 2] - 128) + 128;
  }
  return image;
};

const toMonochrome = (imgData: ImageData, threshold: number): ImageData => {
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (imgData.data[i + 3] < 255) {
      imgData.data[i] = 255;
      imgData.data[i + 1] = 255;
      imgData.data[i + 2] = 255;
      imgData.data[i + 3] = 0;
      continue;
    }
    const gray = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
    const binary = gray >= threshold ? 255 : 0;
    imgData.data[i] = binary;
    imgData.data[i + 1] = binary;
    imgData.data[i + 2] = binary;
    imgData.data[i + 3] = 255;
  }
  return imgData;
};

const applyFloydSteinbergDithering = (imgData: ImageData, threshold: number): ImageData => {
  const width = imgData.width;
  const height = imgData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      const oldPixel = 0.299 * imgData.data[idx] + 0.587 * imgData.data[idx + 1] + 0.114 * imgData.data[idx + 2];
      const newPixel = oldPixel >= threshold ? 255 : 0;

      const quantError = oldPixel - newPixel;

      if (imgData.data[idx + 3] === 0) {
        imgData.data[idx] = 255;
        imgData.data[idx + 1] = 255;
        imgData.data[idx + 2] = 255;
        imgData.data[idx + 3] = 0;
      } else {
        imgData.data[idx] = newPixel;
        imgData.data[idx + 1] = newPixel;
        imgData.data[idx + 2] = newPixel;
        imgData.data[idx + 3] = 255;
      }

      if (x + 1 < width) {
        const rightIdx = idx + 4;
        imgData.data[rightIdx] += (quantError * 7) / 16;
      }

      if (y + 1 < height) {
        if (x > 0) {
          const bottomLeftIdx = idx + width * 4 - 4;
          imgData.data[bottomLeftIdx] += (quantError * 3) / 16;
        }
        const bottomIdx = idx + width * 4;
        imgData.data[bottomIdx] += (quantError * 5) / 16;
        if (x + 1 < width) {
          const bottomRightIdx = idx + width * 4 + 4;
          imgData.data[bottomRightIdx] += (quantError * 1) / 16;
        }
      }
    }
  }
  return imgData;
};

const applyBayerDithering = (imgData: ImageData, threshold: number): ImageData => {
  const src = imgData.data;
  const width = imgData.width;

  const bayerMatrix = [
    [0, 191, 48, 239, 12, 203, 60, 251],
    [128, 64, 176, 112, 140, 76, 188, 124],
    [32, 223, 16, 207, 44, 235, 28, 219],
    [160, 96, 144, 80, 172, 108, 156, 92],
    [8, 199, 56, 247, 4, 195, 52, 243],
    [136, 72, 184, 120, 132, 68, 180, 116],
    [40, 231, 24, 215, 36, 227, 20, 211],
    [168, 104, 152, 88, 164, 100, 148, 84],
  ];

  for (let i = 0; i < src.length; i += 4) {
    const x = (i / 4) % width;
    const y = Math.floor(i / 4 / width);
    const gray = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
    const bayerValue = bayerMatrix[y % 8][x % 8];
    const value = gray < threshold - bayerValue / 2 ? 0 : 255;

    src[i] = src[i + 1] = src[i + 2] = value;
  }

  return imgData;
};

export const processImage = async (
  file: File,
  options: ImageProcessOptions,
  maxPreviewSize: number = 400,
): Promise<{ blob: Blob; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const scale = Math.min(maxPreviewSize / img.width, maxPreviewSize / img.height, 1);
      const previewWidth = Math.floor(img.width * scale);
      const previewHeight = Math.floor(img.height * scale);

      canvas.width = previewWidth;
      canvas.height = previewHeight;
      ctx.drawImage(img, 0, 0, previewWidth, previewHeight);

      let imgData = ctx.getImageData(0, 0, previewWidth, previewHeight);

      if (options.contrast !== 80) {
        const contrastValue = Math.round((options.contrast / 100) * 255 - 128);
        applyContrast(imgData, contrastValue);
      }

      const thresholdValue = (options.threshold / 100) * 255;

      switch (options.method) {
        case "dither":
          applyFloydSteinbergDithering(imgData, thresholdValue);
          break;
        case "bayer":
          applyBayerDithering(imgData, thresholdValue);
          break;
        case "threshold":
          toMonochrome(imgData, thresholdValue);
          break;
        case "none":
        default:
          break;
      }

      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ blob, width: previewWidth, height: previewHeight });
        } else {
          reject(new Error("Failed to create blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

export const processFullImage = async (file: File, options: ImageProcessOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let imgData = ctx.getImageData(0, 0, img.width, img.height);

      if (options.contrast !== 80) {
        const contrastValue = Math.round((options.contrast / 100) * 255 - 128);
        applyContrast(imgData, contrastValue);
      }

      const thresholdValue = (options.threshold / 100) * 255;

      switch (options.method) {
        case "dither":
          applyFloydSteinbergDithering(imgData, thresholdValue);
          break;
        case "bayer":
          applyBayerDithering(imgData, thresholdValue);
          break;
        case "threshold":
          toMonochrome(imgData, thresholdValue);
          break;
        case "none":
        default:
          break;
      }

      ctx.putImageData(imgData, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

export const processImageElement = async (
  imgElement: HTMLImageElement,
  options: ImageProcessOptions,
  targetWidth: number,
  targetHeight: number,
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imgElement, 0, 0, targetWidth, targetHeight);

  let imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);

  if (options.contrast !== 80) {
    const contrastValue = Math.round((options.contrast / 100) * 255 - 128);
    applyContrast(imgData, contrastValue);
  }

  const thresholdValue = (options.threshold / 100) * 255;

  switch (options.method) {
    case "dither":
      applyFloydSteinbergDithering(imgData, thresholdValue);
      break;
    case "bayer":
      applyBayerDithering(imgData, thresholdValue);
      break;
    case "threshold":
      toMonochrome(imgData, thresholdValue);
      break;
    case "none":
    default:
      break;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
};
