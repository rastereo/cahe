#!/usr/bin/env node
import fs, { createWriteStream } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; // https://github.com/motdotla/dotenv
import { comb } from 'email-comb'; // https://codsen.com/os/email-comb
import archiver from 'archiver'; // https://www.archiverjs.com/
import clipboard from 'clipboardy'; // https://github.com/sindresorhus/clipboardy
import signale from 'signale'; // https://github.com/klaudiosinani/signale
import tinify from 'tinify'; // https://tinypng.com/developers/reference/nodejs
import juice from 'juice'; // https://github.com/Automattic/juice
import sharp from 'sharp'; // https://sharp.pixelplumbing.com/
import extract from 'extract-zip'; // https://github.com/max-mapper/extract-zip

class Cahe {
  imagesSum = 0;

  imageDirName = 'images';

  cssFileName = 'style';

  #extractDirName = 'build';

  #regexImageSrc = /src="(?!http:\/\/|https:\/\/)([^"]*)"/g;

  #GATE_IMAGE_SIZE = 500;

  #COMPRESSION_RATIO = 8;

  #htmlCombConfig = {
    whitelist: [],
    backend: [],
    uglify: true,
    removeHTMLComments: true,
    removeCSSComments: true,
    doNotRemoveHTMLCommentsWhoseOpeningTagContains: [
      '[if',
      '[endif',
    ],
    htmlCrushOpts: {
      removeLineBreaks: true,
      removeIndentations: true,
      removeHTMLComment: true,
      removeCSSComments: true,
      lineLengthLimit: 500,
    },
    reportProgressFunc: null,
    reportProgressFuncFrom: 0,
    reportProgressFuncTo: 100,
  };

  #juiceConfig = {
    preserveImportant: true,
    resolveCSSVariables: true,
  };

  #imageWidthList = {
    banner: 700,
    image: 560,
    block: 260,
    logo: 200,
    contact: 185,
  };

  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
    this.dirPath = path.dirname(this.FilePath);
    this.imagesDirPath = path.join(this.dirPath, this.imageDirName);
    this.fileName = path.basename(this.FilePath, '.html');
    this.cssFilePath = path.join(this.dirPath, `${this.cssFileName}.css`);
    this.newFileName = `${this.fileName}.min.html`;
    this.outputArchiveFilePath = path.resolve(this.dirPath, `${this.fileName}.zip`);
    this.htmlString = this.FilePath && fs.readFileSync(
      path.resolve(this.FilePath),
      { encoding: 'utf-8' },
    );
  }

  static #stopWithError(errorMessage) {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static async #resizeImage(imagePath, width) {
    try {
      const resizeImage = await sharp(imagePath)
        .resize({ width })
        .toBuffer();

      signale.success(`Image ${path.basename(imagePath)} resized`);

      return resizeImage;
    } catch (error) {
      Cahe.#stopWithError(error);
    }

    return null;
  }

  static async #convertImage(imagePath) {
    try {
      const convertedImage = await sharp(imagePath)
        .toFormat('png', { compressionLevel: 0, palette: true, progressive: true })
        .sharpen()
        .toBuffer();

      signale.success(`Image ${path.basename(imagePath)} converted`);

      return convertedImage;
    } catch (error) {
      Cahe.#stopWithError(error);
    }

    return null;
  }

  static async #compressImage(imagePath) {
    try {
      const compressedImage = await tinify.fromFile(imagePath).toBuffer(imagePath);

      signale.success(`Image ${path.basename(imagePath)} compressed`);

      return compressedImage;
    } catch (error) {
      Cahe.#stopWithError(error);
    }

    return null;
  }

  #removeCssLinkTag(htmlString) {
    this.cssLinkTag = `<link rel="stylesheet" href="${this.cssFileName}.css" />`;

    return htmlString.replace(this.cssLinkTag, '');
  }

  #getImageSrcList(htmlString) {
    const matches = Array.from(htmlString.matchAll(this.#regexImageSrc));
    const srcList = [];

    matches.forEach((src) => {
      const imagePath = src[1].replace('./', '');

      if (!srcList.includes(imagePath)) srcList.push(imagePath);
    });

    return srcList;
  }

  #createProcessLog(archiveSize) {
    const htmlInterestMiniFy = (this.minifyHtmlLog.cleanedLength / this.htmlOriginalSize) * 100;

    signale.info(
      `HTML file size: ${(this.minifyHtmlLog.cleanedLength / 1e3).toFixed(2)} KB ${htmlInterestMiniFy.toFixed(0) - 100}%`,
    );

    if (this.minifyHtmlLog.cleanedLength >= 1e5) signale.warn('The size of the HTML file exceeds 100 KB');

    signale.info(`Images: ${this.imagesSum}`);
    signale.info(`Total size: ${(archiveSize / 1e6).toFixed(2)} MB`);
    signale.info(`Path: ${this.outputArchiveFilePath}`);
    signale.info('Archive path copied to clipboard.');

    performance.mark('B');
    performance.measure('A to B', 'A', 'B');

    const [measure] = performance.getEntriesByName('A to B');

    signale.log(`Time: ${(measure.duration / 1e3).toFixed(2)} s`);

    performance.clearMarks();
    performance.clearMeasures();
  }

  async #addInlineCss(htmlString) {
    try {
      if (!htmlString) throw new Error('HTML file is empty. Please check the file and try again');

      this.htmlOriginalSize = fs.statSync(path.resolve(this.FilePath)).size;

      let result = htmlString;

      if (fs.existsSync(this.cssFilePath)) {
        const cssString = await fs.promises.readFile(
          path.resolve(this.cssFilePath),
          { encoding: 'utf-8' },
        );

        result = this.#removeCssLinkTag(result);

        result = juice.inlineContent(result, cssString, this.#juiceConfig);
      } else {
        signale.warn('CSS file not found');

        result = juice(result, this.#juiceConfig);
      }

      signale.success('Inline CSS');

      return result;
    } catch (error) {
      return Cahe.#stopWithError(error);
    }
  }

  async #minifyHtml(htmlString) {
    try {
      const { result, log } = comb(
        htmlString,
        this.#htmlCombConfig,
      );

      signale.success('Minify HTML');

      this.minifyHtmlLog = log;

      return result;
    } catch (error) {
      return Cahe.#stopWithError(error);
    }
  }

  async #createImageDir(archive) {
    try {
      const tasks = this.imageSrcList.map(async (src) => {
        const imagePath = path.join(this.dirPath, src);

        if (path.dirname(src) === this.imageDirName && fs.existsSync(imagePath)) {
          const { width, format } = await sharp(imagePath).metadata();

          const gateWidth = this.#imageWidthList[path.basename(src, path.extname(src)).split('_')[0]];

          if (gateWidth && width > gateWidth) {
            const resizedImage = await Cahe.#resizeImage(imagePath, gateWidth);

            archive.append(resizedImage, { name: src });
          } else if (
            format !== 'gif'
            && format !== 'svg'
            && fs.statSync(imagePath).size / 1e3 >= this.#GATE_IMAGE_SIZE
          ) {
            const compressedImage = await Cahe.#compressImage(imagePath);

            archive.append(compressedImage, { name: src });
          } else if (format === 'svg') {
            const convertedImage = await Cahe.#convertImage(imagePath);

            const newName = `${this.imageDirName}/${path.basename(src, path.extname(src))}.png`;

            this.htmlString = this.htmlString.replace(new RegExp(src, 'g'), newName);

            archive.append(convertedImage, { name: newName });
          } else {
            archive.file(imagePath, { name: src });
          }

          this.imagesSum += 1;
        } else {
          signale.warn(`Image file ${imagePath} is missing`);
        }
      });

      await Promise.all(tasks);

      signale.success('Create image dir');
    } catch (error) {
      Cahe.#stopWithError(error);
    }
  }

  async #extractArchive() {
    try {
      await extract(
        this.outputArchiveFilePath,
        { dir: path.join(this.dirPath, this.#extractDirName) },
      );
    } catch (error) {
      Cahe.#stopWithError(error);
    }
  }

  async archiveContent() {
    try {
      const archive = archiver('zip', { zlib: { level: this.#COMPRESSION_RATIO } });
      const output = createWriteStream(this.outputArchiveFilePath);

      archive.pipe(output);

      if (fs.existsSync(this.imagesDirPath)) {
        this.imageSrcList = this.#getImageSrcList(this.htmlString);

        await this.#createImageDir(archive);
      } else {
        signale.warn('Images directory is missing');
      }

      this.htmlString = await this.#addInlineCss(this.htmlString);
      this.htmlString = await this.#minifyHtml(this.htmlString);

      archive.append(this.htmlString, { name: this.newFileName });

      fs.writeFileSync(path.join(this.dirPath, this.newFileName), this.htmlString);

      output.on('finish', () => {
        if (process.argv[3] === '-e') {
          this.#extractArchive();

          signale.success(`Archive extract to ${this.#extractDirName} directory`);
        }

        this.#createProcessLog(this.archiveSize);
      });
      output.on('error', (error) => Cahe.#stopWithError(error.message));

      archive.on('error', (error) => Cahe.#stopWithError(error.message));

      await archive.finalize();

      signale.success('Create archive');

      this.archiveSize = archive.pointer();

      clipboard.writeSync(this.outputArchiveFilePath);

      return this;
    } catch (error) {
      return Cahe.#stopWithError(error);
    }
  }
}

const htmlFilePath = process.argv[2];

if (
  htmlFilePath
  && path.extname(htmlFilePath.toLowerCase()) === '.html'
  && fs.existsSync(htmlFilePath)
) {
  performance.mark('A');

  const dirname = path.dirname(fileURLToPath(import.meta.url));

  dotenv.config({ path: path.resolve(dirname, '.env') });

  tinify.key = process.env.TINIFY_KEY;

  if (process.env.PROXY) tinify.proxy = process.env.PROXY;

  new Cahe(htmlFilePath).archiveContent();
} else {
  signale.fatal(
    'The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
