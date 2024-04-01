#!/usr/bin/env node
import fs, { createWriteStream } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { crush } from 'html-crush'; // https://codsen.com/os/html-crush
import archiver from 'archiver'; // https://www.archiverjs.com/
import clipboard from 'clipboardy'; // https://github.com/sindresorhus/clipboardy
import signale from 'signale'; // https://github.com/klaudiosinani/signale

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

  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
    this.dirPath = path.dirname(this.FilePath);
    this.imagesDirPath = path.join(this.dirPath, 'images');
    this.fileName = path.basename(this.FilePath, '.html');
    this.newFileName = `${this.fileName}.min.html`;
  }

  #stopWithError(errorMessage) {
    signale.fatal(errorMessage);

    process.exit(1);
  }

  #getImagesSrc(htmlString) {
    let matches;
    const srcList = [];

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

      signale.success('Convert to a string');

      return data;
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

  async archiveContent() {
    try {
      const archive = archiver(
        'zip',
        { zlib: { level: 9 } },
      );

      const outputArchiveFilePath = path.resolve(
        this.dirPath,
        `${this.fileName}.zip`,
      );

      const output = createWriteStream(outputArchiveFilePath);

      const htmlMinify = await this.#minifyHtml();

      output.on('finish', () => {
        const htmlFileSize = this.log.cleanedLength / 1e3;

        signale.success('Create archive');
        signale.info(`HTML file size: ${htmlFileSize.toFixed(2)} KB ${this.log.percentageReducedOfOriginal}%`);

        if (htmlFileSize >= 100) signale.warn('The size of the HTML file exceeds 100 KB');

        signale.info(`Images: ${this.#imagesCount}`);
        signale.info(`Total size: ${(archive.pointer() / 1e6).toFixed(2)} MB`);
        signale.info(`Path: ${outputArchiveFilePath}`);
        signale.info('Archive path copied to clipboard.');

        clipboard.writeSync(outputArchiveFilePath);

        performance.mark('B');
        performance.measure('A to B', 'A', 'B');

        const [measure] = performance.getEntriesByName('A to B');

        signale.log(`Time: ${(measure.duration / 1e3).toFixed(2)} s`);

        performance.clearMarks();
        performance.clearMeasures();
      });

      output.on('error', (error) => this.#stopWithError(error.message));

      archive.pipe(output);
      archive.append(htmlMinify, { name: this.newFileName });

      if (fs.existsSync(this.imagesDirPath)) {
        const imageSrcList = this.#getImagesSrc(htmlMinify);

        imageSrcList.forEach((src) => {
          const imagePath = path.join(this.dirPath, src);

          if (fs.existsSync(imagePath)) {
            // console.log(fs.statSync(imagePath).size / 1e3);
            archive.file(
              imagePath,
              { name: `images/${path.basename(imagePath)}` },
            );

            this.#imagesCount += 1;
          } else {
            signale.warn(`Image file ${imagePath} is missing`);
          }
        });
      } else {
        signale.warn('Images directory is missing');
      }

      archive.on('error', (error) => this.#stopWithError(error.message));

      return await archive.finalize();
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }
}

const htmlFilePath = process.argv[2];

if (htmlFilePath && htmlFilePath.slice(-4) === 'html' && fs.existsSync(htmlFilePath)) {
  performance.mark('A');

  new Cahe(htmlFilePath).archiveContent();
} else {
  signale.fatal(
    'The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
