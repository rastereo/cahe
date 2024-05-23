import {
  createReadStream,
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import {
  basename,
  dirname,
  extname,
  join,
  resolve,
} from 'path';
import fetch from 'node-fetch'; // https://github.com/node-fetch/node-fetch;
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

  static #regexLinkHref = /href="([^"]*)"/g;

  static #extractDirName = 'build';

  static #configEmailFileName = 'config.json';

  #COMPRESSION_RATIO = 8;

  imagesSum = 0;

  #imageDirName = 'images';

  #cssFileName = 'style';

  #indexFileName = 'index.html';

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

  constructor(htmlFilePath, netlifyKey, proxy) {
    this.filePath = htmlFilePath;
    this.dirPath = dirname(this.filePath);
    this.imagesDirPath = join(this.dirPath, this.#imageDirName);
    this.fileName = basename(this.filePath, '.html');
    this.cssFilePath = join(this.dirPath, `${this.#cssFileName}.css`);
    this.outputArchiveFilePath = resolve(this.dirPath, `${this.fileName}.zip`);

    this.netlifyKey = netlifyKey && netlifyKey;
    this.proxy = proxy;

    this.htmlString = this.filePath && readFileSync(
      resolve(this.filePath),
      'utf-8',
    );

    this.cssString = existsSync(this.cssFilePath) && readFileSync(
      resolve(this.cssFilePath),
      'utf-8',
    );

    this.htmlOriginalSize = Buffer.byteLength(this.htmlString);
    this.archiveContent = this.archiveContent.bind(this);

    if (!this.htmlString) throw new Error('HTML file is empty. Please check the file and try again');
  }

  static #stopWithError(errorMessage) {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static #trimHrefLink(htmlString) {
    const matches = Array.from(htmlString.matchAll(this.#regexLinkHref));

    let result = htmlString;

    matches.forEach((href) => {
      const url = href[1];

      result = result.replace(url, url.trim());
    });

    return result;
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

      signale.success(`Image ${basename(imagePath)} resized`);

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

      signale.success(`Image ${basename(imagePath)} converted`);

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

      signale.success(`Image ${basename(name)} compressed`);

      return compressedImage;
    } catch (error) {
      this.#stopWithError(error);
    }

    return null;
  }

  static async extractArchive(archivePath) {
    try {
      const absolutePath = resolve(archivePath);

      const buildPath = join(dirname(absolutePath), this.#extractDirName);

      await extract(
        absolutePath,
        { dir: buildPath },
      );

      signale.success(`Archive extract to ${buildPath} directory`);
    } catch (error) {
      this.#stopWithError(error);
    }
  }

  static async createWebletter(archiveFilePath, netlifyKey, proxy) {
    try {
      if (!netlifyKey) throw new Error('Netlify key is missing');

      const dirPath = dirname(archiveFilePath);
      const configEmailPath = join(dirPath, Cahe.#configEmailFileName);

      // console.log(archiveFilePath, emailConfigPath, netlifyKey, proxy);

      const emailConfig = existsSync(configEmailPath)
        ? JSON.parse(readFileSync(
          configEmailPath,
          'utf-8',
        ))
        : {};

      const { siteId } = emailConfig;
      const stream = createReadStream(archiveFilePath);
      const proxyAgent = proxy && new HttpsProxyAgent(proxy);

      const url = siteId
        ? `https://api.netlify.com/api/v1/sites/${siteId}/deploys`
        : 'https://api.netlify.com/api/v1/sites';

      const res = await fetch(url, {
        method: 'POST',
        agent: proxy && proxyAgent,
        headers: {
          'Content-Type': 'application/zip',
          Authorization: `Bearer ${netlifyKey}`,
        },
        body: stream,
      });

      if (!siteId) {
        const { id, subdomain } = await res.json();

        emailConfig.name = basename(dirPath);
        emailConfig.siteId = id;
        emailConfig.webletterUrl = `https://${subdomain}.netlify.app`;

        writeFileSync(configEmailPath, JSON.stringify(emailConfig, null, 2));
      }

      signale.success('Create webletter');

      return emailConfig;
    } catch (error) {
      return Cahe.#stopWithError(error);
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
    if (this.emailConfig) signale.info(`Webletter: ${this.emailConfig.webletterUrl}`);
    signale.info(`Path: ${this.outputArchiveFilePath}`);
    signale.info('Archive path copied to clipboard.');
  }

  async #addInlineCss(htmlString) {
    try {
      let result = htmlString;

      if (this.cssString) {
        result = this.#removeCssLinkTag(result);
        result = juice.inlineContent(result, this.cssString, this.#juiceConfig);
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
        const imagePath = join(this.dirPath, src);

        if (dirname(src) === this.#imageDirName && existsSync(imagePath)) {
          const { width, format } = await sharp(imagePath).metadata();
          const gateWidth = this.#imageWidthList[basename(src, extname(src)).split('_')[0]];

          if (gateWidth && width > gateWidth) {
            let resizedImage = await Cahe.#resizeImage(imagePath, gateWidth);

            if (Buffer.byteLength(resizedImage) > Cahe.#GATE_IMAGE_SIZE) {
              resizedImage = await Cahe.#compressImage(resizedImage, basename(imagePath));
            }

            archive.append(resizedImage, { name: src });
          } else if (
            format !== 'gif'
            && format !== 'svg'
            && statSync(imagePath).size >= Cahe.#GATE_IMAGE_SIZE
          ) {
            const compressedImage = await Cahe.#compressImage(
              await readFileSync(imagePath),
              basename(imagePath),
            );

            archive.append(compressedImage, { name: src });
          } else if (format === 'svg') {
            const convertedImage = await Cahe.#convertImage(imagePath);
            const newName = `${this.#imageDirName}/${basename(src, extname(src))}.png`;

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

  async archiveContent() {
    try {
      const archive = archiver('zip', { zlib: { level: this.#COMPRESSION_RATIO } });
      const output = createWriteStream(this.outputArchiveFilePath);

      archive.pipe(output);

      if (existsSync(this.imagesDirPath)) {
        this.imageSrcList = Cahe.#getImageSrcList(this.htmlString);

        await this.#createImageDir(archive);
      } else {
        signale.warn('Images directory is missing');
      }

      this.htmlString = Cahe.#trimHrefLink(this.htmlString);
      this.htmlString = await this.#addInlineCss(this.htmlString);
      this.htmlString = await this.#minifyHtml(this.htmlString);

      archive.append(this.htmlString, { name: this.#indexFileName });

      output.on('error', (error) => Cahe.#stopWithError(error.message));
      archive.on('error', (error) => Cahe.#stopWithError(error.message));

      await archive.finalize();

      this.archiveSize = archive.pointer();

      clipboard.writeSync(this.outputArchiveFilePath);

      signale.success('Create archive');

      output.on('finish', async () => {
        if (process.argv[3] === '-e') {
          await Cahe.extractArchive(this.outputArchiveFilePath);
        }

        if (process.argv[3] === '-w') {
          this.emailConfig = await Cahe.createWebletter(
            this.outputArchiveFilePath,
            this.netlifyKey,
            this.proxy,
          );
        }

        this.#createProcessLog(this.archiveSize);
      });

      return this;
    } catch (error) {
      return Cahe.#stopWithError(error);
    }
  }
}

export default Cahe;
