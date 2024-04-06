#!/usr/bin/env node
import fs, { createWriteStream } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
// import { crush } from 'html-crush'; // https://codsen.com/os/html-crush
import { comb } from 'email-comb'; // https://codsen.com/os/email-comb
import archiver from 'archiver'; // https://www.archiverjs.com/
import clipboard from 'clipboardy'; // https://github.com/sindresorhus/clipboardy
import signale from 'signale'; // https://github.com/klaudiosinani/signale
import tinify from 'tinify'; // https://tinypng.com/developers/reference/nodejs

performance.mark('A');

class Cahe {
  imagesSum = 0;

  imageDirName = 'images';

  #regexImageSrc = /src="(?!http:\/\/|https:\/\/)([^"]*)"/g;

  #GATE_IMAGE_SIZE = 400;

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

  // #htmlCrushConfig = {
  //   lineLengthLimit: 500,
  //   removeIndentations: true,
  //   removeLineBreaks: true,
  //   removeHTMLComments: true,
  //   removeCSSComments: true,
  //   reportProgressFunc: null,
  //   reportProgressFuncFrom: 0,
  //   reportProgressFuncTo: 100,
  // };

  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
    this.dirPath = path.dirname(this.FilePath);
    this.imagesDirPath = path.join(this.dirPath, this.imageDirName);
    this.fileName = path.basename(this.FilePath, '.html');
    this.newFileName = `${this.fileName}.min.html`;
    this.outputArchiveFilePath = path.resolve(this.dirPath, `${this.fileName}.zip`);
  }

  #stopWithError(errorMessage) {
    signale.fatal(errorMessage);

    process.exit(1);
  }

  #getImageSrcList(htmlString) {
    const matches = htmlString.matchAll(this.#regexImageSrc);
    const srcList = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const src of matches) {
      if (!srcList.includes(src[1])) srcList.push(src[1]);
    }

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

    clipboard.writeSync(this.outputArchiveFilePath);

    performance.mark('B');
    performance.measure('A to B', 'A', 'B');

    const [measure] = performance.getEntriesByName('A to B');

    signale.log(`Time: ${(measure.duration / 1e3).toFixed(2)} s`);

    performance.clearMarks();
    performance.clearMeasures();
  }

  async #importHtmlAndConvertToString() {
    try {
      this.htmlOriginalSize = fs.statSync(path.resolve(this.FilePath)).size;
      const data = await fs.promises.readFile(
        path.resolve(this.FilePath),
        { encoding: 'utf-8' },
      );

      if (!data) throw new Error('HTML file is empty. Please check the file and try again');

      const singleLineData = data.replace(/\n/g, '').replace(/\s\s+/g, ' ');

      signale.success('Convert to a string');

      return singleLineData;
    } catch (err) {
      return this.#stopWithError(err.message);
    }
  }

  async #minifyHtml() {
    try {
      // const { result, log } = crush(
      //   await this.#importHtmlAndConvertToString(),
      //   this.#htmlCrushConfig,
      // );

      const { result, log } = comb(
        await this.#importHtmlAndConvertToString(),
        this.#htmlCombConfig,
      );

      signale.success('Html-crush minify');

      this.minifyHtmlLog = log;

      return result;
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }

  async #compressImage(imagePath) {
    try {
      const compressedImage = await tinify.fromFile(imagePath).toBuffer(imagePath);

      signale.success(`Image ${path.basename(imagePath)} compressed`);

      return compressedImage;
    } catch (error) {
      signale.error(`Tinify ${error}`);
    }

    return null;
  }

  async #createImageDir(archive) {
    // eslint-disable-next-line no-restricted-syntax
    for (const src of this.imageSrcList) {
      const imagePath = path.join(this.dirPath, src);

      if (path.dirname(src) === this.imageDirName && fs.existsSync(imagePath)) {
        const name = `${this.imageDirName}/${path.basename(imagePath)}`;

        if (
          path.extname(imagePath) !== '.gif'
          && fs.statSync(imagePath).size / 1e3 >= this.#GATE_IMAGE_SIZE
        ) {
          // eslint-disable-next-line no-await-in-loop
          archive.append(await this.#compressImage(imagePath), { name });
        } else {
          archive.file(imagePath, { name });
        }

        this.imagesSum += 1;
      } else {
        signale.warn(`Image file ${imagePath} is missing`);
      }
    }
  }

  async archiveContent() {
    try {
      const archive = archiver('zip', { zlib: { level: this.#COMPRESSION_RATIO } });
      const output = createWriteStream(this.outputArchiveFilePath);
      const htmlMinify = await this.#minifyHtml();

      archive.pipe(output);
      archive.append(htmlMinify, { name: this.newFileName });

      if (fs.existsSync(this.imagesDirPath)) {
        this.imageSrcList = this.#getImageSrcList(htmlMinify);

        await this.#createImageDir(archive);
      } else {
        signale.warn('Images directory is missing');
      }

      output.on('finish', () => this.#createProcessLog(this.archiveSize));
      output.on('error', (error) => this.#stopWithError(error.message));

      archive.on('error', (error) => this.#stopWithError(error.message));

      await archive.finalize();

      signale.success('Create archive');

      this.archiveSize = archive.pointer();

      return this;
    } catch (error) {
      return this.#stopWithError(error);
    }
  }
}

const htmlFilePath = process.argv[2];

if (
  htmlFilePath
  && path.extname(htmlFilePath) === '.html'
  && fs.existsSync(htmlFilePath)
) {
  const dirname = path.dirname(fileURLToPath(import.meta.url));

  dotenv.config({ path: path.resolve(dirname, '.env') });

  tinify.key = process.env.TINIFY_KEY;

  if (process.env.PROXY) tinify.proxy = process.env.PROXY;

  new Cahe(htmlFilePath).archiveContent()
    .then((data) => console.log(data));
} else {
  signale.fatal(
    'The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
