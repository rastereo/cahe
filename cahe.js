#!/usr/bin/env node
import fs, { createWriteStream } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch'; // https://github.com/node-fetch/node-fetch;
import dotenv from 'dotenv'; // https://github.com/motdotla/dotenv
// eslint-disable-next-line import/no-unresolved
import { comb } from 'email-comb'; // https://codsen.com/os/email-comb
import archiver from 'archiver'; // https://www.archiverjs.com/
import clipboard from 'clipboardy'; // https://github.com/sindresorhus/clipboardy
import signale from 'signale'; // https://github.com/klaudiosinani/signale
import juice from 'juice'; // https://github.com/Automattic/juice
import sharp from 'sharp'; // https://sharp.pixelplumbing.com/
import extract from 'extract-zip'; // https://github.com/max-mapper/extract-zip
import { HttpsProxyAgent } from 'https-proxy-agent'; // https://github.com/TooTallNate/proxy-agents

class Cahe {
  static #STEP_IMAGE_QUALITY = 5;

  static #GATE_IMAGE_SIZE = 5e5;

  static #regexImageSrc = /src="(?!http:\/\/|https:\/\/)([^"]*)"/g;

  static #extractDirName = 'build';

  #COMPRESSION_RATIO = 8;

  imagesSum = 0;

  #imageDirName = 'images';

  #cssFileName = 'style';

  #indexFileName = 'index.html';

  #configEmailFileName = 'config.json';

  #cssLinkTag = `<link rel="stylesheet" href="${this.#cssFileName}.css" />`;

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
    contact: 185,
  };

  constructor(htmlFilePath) {
    this.filePath = htmlFilePath;
    this.dirPath = path.dirname(this.filePath);
    this.imagesDirPath = path.join(this.dirPath, this.#imageDirName);
    this.fileName = path.basename(this.filePath, '.html');
    this.cssFilePath = path.join(this.dirPath, `${this.#cssFileName}.css`);
    this.outputArchiveFilePath = path.resolve(this.dirPath, `${this.fileName}.zip`);
    this.configEmailPath = path.join(this.dirPath, this.#configEmailFileName);

    this.htmlString = this.filePath && fs.readFileSync(
      path.resolve(this.filePath),
      { encoding: 'utf-8' },
    );

    this.emailConfig = fs.existsSync(this.configEmailPath)
      ? JSON.parse(fs.readFileSync(
        this.configEmailPath,
        { encoding: 'utf-8' },
      ))
      : {};

    this.htmlOriginalSize = Buffer.byteLength(this.htmlString);
    this.archiveContent = this.archiveContent.bind(this);
    this.scriptPath = path.dirname(fileURLToPath(import.meta.url));

    dotenv.config({ path: path.resolve(this.scriptPath, '.env') });

    this.proxyAgent = process.env.PROXY && new HttpsProxyAgent(process.env.PROXY);
  }

  static #stopWithError(errorMessage) {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static #getImageSrcList(htmlString) {
    const matches = Array.from(htmlString.matchAll(this.#regexImageSrc));
    const srcList = [];

    matches.forEach((src) => {
      const imagePath = src[1].replace('./', '');

      if (!srcList.includes(imagePath)) srcList.push(imagePath);
    });

    return srcList;
  }

  static async #resizeImage(imagePath, width) {
    try {
      const resizeImage = await sharp(imagePath)
        .resize({ width })
        .toBuffer();

      signale.success(`Image ${path.basename(imagePath)} resized`);

      return resizeImage;
    } catch (error) {
      this.#stopWithError(error);
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
      this.#stopWithError(error);
    }

    return null;
  }

  static async #compressImage(imageBuffer, name, quality = 100) {
    try {
      const { format } = await sharp(imageBuffer).metadata();

      let compressedImage;

      if (format === 'jpg') {
        compressedImage = await sharp(imageBuffer).jpeg({ quality }).toBuffer();
      } else if (format === 'png') {
        compressedImage = await sharp(imageBuffer).png({ quality }).toBuffer();
      } else {
        return null;
      }

      const { size } = await sharp(compressedImage).metadata();

      if (size > this.#GATE_IMAGE_SIZE) {
        return await this.#compressImage(compressedImage, name, quality - this.#STEP_IMAGE_QUALITY);
      }

      signale.success(`Image ${path.basename(name)} compressed`);

      return compressedImage;
    } catch (error) {
      this.#stopWithError(error);
    }

    return null;
  }

  static async extractArchive(archivePath) {
    try {
      const absolutePath = path.resolve(archivePath);

      await extract(
        absolutePath,
        { dir: path.join(path.dirname(absolutePath), this.#extractDirName) },
      );

      signale.success(`Archive extract to ${this.#extractDirName} directory`);
    } catch (error) {
      this.#stopWithError(error);
    }
  }

  #removeCssLinkTag(htmlString) {
    return htmlString.replace(this.#cssLinkTag, '');
  }

  #createProcessLog(archiveSize) {
    const htmlInterestMiniFy = (this.minifyHtmlLog.cleanedLength / this.htmlOriginalSize) * 100;

    signale.info(
      `HTML file size: ${(this.minifyHtmlLog.cleanedLength / 1e3).toFixed(2)} KB ${htmlInterestMiniFy.toFixed(0) - 100}%`,
    );

    if (this.minifyHtmlLog.cleanedLength >= 1e5) signale.warn('The size of the HTML file exceeds 100 KB');

    signale.info(`Images: ${this.imagesSum}`);
    signale.info(`Total size: ${(archiveSize / 1e6).toFixed(2)} MB`);
    if (this.emailConfig.webletterUrl) signale.info(`Webletter: ${this.emailConfig.webletterUrl}`);
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

        if (path.dirname(src) === this.#imageDirName && fs.existsSync(imagePath)) {
          const { width, format } = await sharp(imagePath).metadata();
          const gateWidth = this.#imageWidthList[path.basename(src, path.extname(src)).split('_')[0]];

          if (gateWidth && width > gateWidth) {
            let resizedImage = await Cahe.#resizeImage(imagePath, gateWidth);

            if (Buffer.byteLength(resizedImage) > Cahe.#GATE_IMAGE_SIZE) {
              resizedImage = await Cahe.#compressImage(resizedImage, path.basename(imagePath));
            }

            archive.append(resizedImage, { name: src });
          } else if (
            format !== 'gif'
            && format !== 'svg'
            && fs.statSync(imagePath).size >= Cahe.#GATE_IMAGE_SIZE
          ) {
            const compressedImage = await Cahe.#compressImage(
              await fs.readFileSync(imagePath),
              path.basename(imagePath),
            );

            archive.append(compressedImage, { name: src });
          } else if (format === 'svg') {
            const convertedImage = await Cahe.#convertImage(imagePath);
            const newName = `${this.#imageDirName}/${path.basename(src, path.extname(src))}.png`;

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

  async #createWebletter() {
    try {
      const { siteId } = this.emailConfig;
      const stream = fs.createReadStream(this.outputArchiveFilePath);

      const url = siteId
        ? `https://api.netlify.com/api/v1/sites/${siteId}/deploys`
        : 'https://api.netlify.com/api/v1/sites';

      const res = await fetch(url, {
        method: 'POST',
        agent: this.proxyAgent,
        headers: {
          'Content-Type': 'application/zip',
          Authorization: `Bearer ${process.env.NETLIFY_KEY}`,
        },
        body: stream,
      });

      if (!siteId) {
        const { id, subdomain } = await res.json();

        this.emailConfig.name = path.basename(path.resolve(this.dirPath));
        this.emailConfig.siteId = id;
        this.emailConfig.webletterUrl = `https://${subdomain}.netlify.app`;

        fs.writeFileSync(this.configEmailPath, JSON.stringify(this.emailConfig, null, 2));
      }

      signale.success('Create webletter');
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
        this.imageSrcList = Cahe.#getImageSrcList(this.htmlString);

        await this.#createImageDir(archive);
      } else {
        signale.warn('Images directory is missing');
      }

      this.htmlString = await this.#addInlineCss(this.htmlString);
      this.htmlString = await this.#minifyHtml(this.htmlString);

      archive.append(this.htmlString, { name: this.#indexFileName });

      output.on('finish', async () => {
        if (process.argv[3] === '-e') await Cahe.extractArchive(this.outputArchiveFilePath);
        if (process.argv[3] === '-w') await this.#createWebletter();

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

performance.mark('A');

const filePath = process.argv[2];

if (
  filePath
  && path.extname(filePath.toLowerCase()) === '.html'
  && fs.existsSync(filePath)
) {
  const client = new Cahe(filePath);

  await client.archiveContent();
} else if (
  filePath
  && path.extname(filePath.toLowerCase()) === '.zip'
  && fs.existsSync(filePath)
) {
  Cahe.extractArchive(filePath);
} else {
  signale.fatal(
    'The path to the HTML or ZIP file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
