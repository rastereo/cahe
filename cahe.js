#!/usr/bin/env node
import fs, { createWriteStream } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { crush } from 'html-crush'; // https://codsen.com/os/html-crush
import archiver from 'archiver'; // https://www.archiverjs.com/
import clipboard from 'clipboardy'; // https://github.com/sindresorhus/clipboardy
import signale from 'signale'; // https://github.com/klaudiosinani/signale
import tinify from 'tinify'; // https://tinypng.com/developers/reference/nodejs

performance.mark('A');

class Cahe {
  #regexImageSrc = /src="(?!http:\/\/|https:\/\/)([^"]*)"/g;

  #htmlCrushConfig = {
    lineLengthLimit: 500,
    removeIndentations: true,
    removeLineBreaks: true,
    removeHTMLComments: true,
    removeCSSComments: true,
    reportProgressFunc: null,
    reportProgressFuncFrom: 0,
    reportProgressFuncTo: 100,
  };

  #imagesCount = 0;

  #GATE_IMAGE_SIZE = 400;

  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
    this.dirPath = path.dirname(this.FilePath);
    this.imagesDirPath = path.join(this.dirPath, 'images');
    this.fileName = path.basename(this.FilePath, '.html');
    this.newFileName = `${this.fileName}.min.html`;
    this.outputArchiveFilePath = path.resolve(this.dirPath, `${this.fileName}.zip`);
  }

  // eslint-disable-next-line class-methods-use-this
  #stopWithError(errorMessage) {
    signale.fatal(errorMessage);

    process.exit(1);
  }

  #getImagesSrc(htmlString) {
    let matches;
    const srcList = [];

    // eslint-disable-next-line no-cond-assign
    while ((matches = this.#regexImageSrc.exec(htmlString)) !== null) {
      const src = matches[1];

      if (!srcList.includes(src)) srcList.push(src);
    }

    return srcList;
  }

  async #importHtmlAndConvertToString() {
    try {
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
      const { result, log } = crush(
        await this.#importHtmlAndConvertToString(),
        this.#htmlCrushConfig,
      );

      signale.success('Html-crush minify');

      this.log = log;

      return result;
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }

  // eslint-disable-next-line class-methods-use-this, consistent-return
  async #compressImage(imagePath) {
    try {
      const compressedImage = tinify.fromFile(imagePath).toBuffer(imagePath);

      signale.success(`Image ${path.basename(imagePath)} compressed`);

      return compressedImage;
    } catch (error) {
      signale.error(`Tinify ${error}`);
    }
  }

  // eslint-disable-next-line consistent-return
  async archiveContent() {
    try {
      const archive = archiver('zip', { zlib: { level: 9 } });

      const output = createWriteStream(this.outputArchiveFilePath);

      const htmlMinify = await this.#minifyHtml();

      archive.pipe(output);
      archive.append(htmlMinify, { name: this.newFileName });

      if (fs.existsSync(this.imagesDirPath)) {
        const imageSrcList = this.#getImagesSrc(htmlMinify);

        // eslint-disable-next-line no-restricted-syntax
        for (const src of imageSrcList) {
          const imagePath = path.join(this.dirPath, src);

          if (fs.existsSync(imagePath)) {
            const name = `images/${path.basename(imagePath)}`;

            if (path.extname(imagePath) !== '.gif' && fs.statSync(imagePath).size / 1e3 >= this.#GATE_IMAGE_SIZE) {
              // eslint-disable-next-line no-await-in-loop
              archive.append(await this.#compressImage(imagePath), { name });
            } else {
              archive.file(imagePath, { name });
            }

            this.#imagesCount += 1;
          } else {
            signale.warn(`Image file ${imagePath} is missing`);
          }
        }
      } else {
        signale.warn('Images directory is missing');
      }

      output.on('close', () => {
        const htmlFileSize = this.log.cleanedLength / 1e3;

        signale.success('Create archive');
        signale.info(`HTML file size: ${htmlFileSize.toFixed(2)} KB -${this.log.percentageReducedOfOriginal}%`);

        if (htmlFileSize >= 100) signale.warn('The size of the HTML file exceeds 100 KB');

        signale.info(`Images: ${this.#imagesCount}`);
        signale.info(`Total size: ${(archive.pointer() / 1e6).toFixed(2)} MB`);
        signale.info(`Path: ${this.outputArchiveFilePath}`);
        signale.info('Archive path copied to clipboard.');

        clipboard.writeSync(this.outputArchiveFilePath);

        performance.mark('B');
        performance.measure('A to B', 'A', 'B');

        const [measure] = performance.getEntriesByName('A to B');

        signale.log(`Time: ${(measure.duration / 1e3).toFixed(2)} s`);

        performance.clearMarks();
        performance.clearMeasures();
      });

      output.on('error', (error) => this.#stopWithError(error.message));

      archive.on('error', (error) => this.#stopWithError(error.message));

      await archive.finalize();
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }
}

const htmlFilePath = process.argv[2];

if (htmlFilePath && path.extname(htmlFilePath) === '.html' && fs.existsSync(htmlFilePath)) {
  // eslint-disable-next-line no-underscore-dangle
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Now you can safely use __dirname
  dotenv.config({ path: path.resolve(__dirname, '.env') });

  tinify.key = process.env.TINIFY_KEY;

  if (process.env.PROXY) tinify.proxy = process.env.PROXY;

  new Cahe(htmlFilePath).archiveContent();
} else {
  signale.fatal(
    'The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
