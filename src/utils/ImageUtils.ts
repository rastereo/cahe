import { basename } from 'path';
import sharp from 'sharp';
import signale from 'signale';

// eslint-disable-next-line import/no-unresolved
import { pngConvertConfig } from './configs.js';
// eslint-disable-next-line import/no-unresolved
import env from './envalid.js';

class ImageUtils {
  static regexImageTag =
    /<img\s[^>]*?src\s*=\s*['\\"]([^'\\"]*?)['\\"][^>]*?>/g;

  static regexHTTP = /^https?:/g;

  static regexDataWidth = /data-width="\d+"/g;

  static #regexNumber = /\d+/g;

  private static stopWithError(errorMessage: string | unknown): void {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static getImageList(htmlString: string): { path: string }[] {
    const matches = Array.from(htmlString.matchAll(this.regexImageTag));
    const list: { path: string }[] = [];

    matches.forEach((img) => {
      const path = img[1];

      if (!new RegExp(this.regexHTTP).test(path)) {
        const dataWidth = img[0].match(this.regexDataWidth);
        let gateWidth;

        if (dataWidth) {
          const widthMatch = dataWidth[0].match(this.#regexNumber);
          if (widthMatch) {
            gateWidth = Number(widthMatch[0]);
          }
        }

        const result = { path, gateWidth };

        let duplicateEmail = false;

        list.forEach((item) => {
          if (item.path === result.path) duplicateEmail = true;
        });

        if (!duplicateEmail) list.push(result);
      }
    });

    return list;
  }

  static async resizeImage(
    imagePath: string,
    width: number,
  ): Promise<Buffer | null> {
    try {
      const resizeImage = await sharp(imagePath)
        .resize({ width })
        // .sharpen()
        .toBuffer();

      signale.success(`Image ${basename(imagePath)} resized`);

      return resizeImage;
    } catch (error) {
      ImageUtils.stopWithError(error);

      return null;
    }
  }

  static async convertImage(imagePath: string): Promise<Buffer | null> {
    try {
      const convertedImage = await sharp(imagePath)
        .toFormat('png', pngConvertConfig)
        // .sharpen()
        .toBuffer();

      signale.success(`Image ${basename(imagePath)} converted`);

      return convertedImage;
    } catch (error) {
      ImageUtils.stopWithError(error);

      return null;
    }
  }

  static async compressImage(
    imageBuffer: Buffer,
    name: string,
    quality: number = 100,
  ): Promise<Buffer | null> {
    try {
      const { format } = await sharp(imageBuffer).metadata();

      let compressedImage;

      if (format === 'jpg') {
        compressedImage = await sharp(imageBuffer).jpeg({ quality }).toBuffer();
      } else if (format === 'png') {
        compressedImage = await sharp(imageBuffer)
          .png({ quality })
          // .sharpen()
          .toBuffer();
      } else {
        return null;
      }

      const { size } = await sharp(compressedImage).metadata();

      if (size && size > env.GATE_IMAGE_SIZE) {
        return await this.compressImage(
          compressedImage,
          name,
          quality - env.STEP_IMAGE_QUALITY,
        );
      }

      signale.success(`Image ${basename(name)} compressed`);

      return compressedImage;
    } catch (error) {
      ImageUtils.stopWithError(error);

      return null;
    }
  }
}

export default ImageUtils;
