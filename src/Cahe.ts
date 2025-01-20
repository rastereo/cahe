import {
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';
import fetch from 'node-fetch';
import archiver, { Archiver } from 'archiver';
import clipboard from 'clipboardy';
import signale from 'signale';
import sharp from 'sharp';
import extract from 'extract-zip';
import { HttpsProxyAgent } from 'https-proxy-agent';

// eslint-disable-next-line import/no-unresolved
import { WebletterData } from './types.js';
// eslint-disable-next-line import/no-unresolved
import ImageUtils from './utils/ImageUtils.js';
// eslint-disable-next-line import/no-unresolved
import HTMLUtils from './utils/HTMLUtils.js';

class Cahe {
  // static #regexImageTag =
  //   /<img\s[^>]*?src\s*=\s*['\\"]([^'\\"]*?)['\\"][^>]*?>/g;

  static #extractDirName = 'build';

  static #configEmailFileName = 'config.json';

  // #COMPRESSION_RATIO = 8;

  imagesSum = 0;

  // #imageDirName = 'images';

  #indexFileName = 'index.html';

  filePath: string;

  dirPath: string;

  imagesDirPath: string;

  fileName: string;

  cssFilePath: string;

  outputArchiveFilePath: string;

  isWebVersion: boolean;

  isExtractZipFile: boolean;

  webletterUrl: string;

  webletterKey: string;

  proxy: string;

  htmlString: string;

  cssString: string | null;

  htmlOriginalSize: number;

  minifyHtmlLog: { cleanedLength: number };

  imageSrcList: { path: string; gateWidth?: number }[];

  archiveSize: number;

  emailConfig: { webletterUrl: string | null };

  gateImagesSize: number;

  compressionRatio: number;

  imageDirName: string;

  cssFileName: string;

  constructor(
    htmlFilePath: string,
    webletterUrl: string,
    webletterKey: string,
    proxy: string,
    isWebVersion: boolean,
    isExtractZipFile: boolean,
    compressionRatio: number,
    gateImagesSize: number,
    imageDirName: string,
    cssFileName: string,
  ) {
    this.filePath = htmlFilePath;
    this.dirPath = dirname(this.filePath);
    this.imageDirName = imageDirName;
    this.imagesDirPath = join(this.dirPath, imageDirName);
    this.fileName = basename(this.filePath, '.html');
    this.cssFileName = cssFileName;
    this.cssFilePath = join(this.dirPath, `${this.cssFileName}.css`);
    this.outputArchiveFilePath = resolve(this.dirPath, `${this.fileName}.zip`);
    this.isWebVersion = isWebVersion;
    this.isExtractZipFile = isExtractZipFile;
    this.webletterUrl = webletterUrl;
    this.webletterKey = webletterKey;
    this.proxy = proxy;
    this.htmlString =
      this.filePath && readFileSync(resolve(this.filePath), 'utf-8');
    this.cssString = existsSync(this.cssFilePath)
      ? readFileSync(resolve(this.cssFilePath), 'utf-8')
      : null;
    this.htmlOriginalSize = Buffer.byteLength(this.htmlString);
    this.archiveContent = this.archiveContent.bind(this);
    this.minifyHtmlLog = { cleanedLength: 0 };
    this.imageSrcList = [];
    this.archiveSize = 0;
    this.emailConfig = { webletterUrl: null };
    this.gateImagesSize = gateImagesSize;
    this.compressionRatio = compressionRatio;

    if (!this.htmlString) {
      throw new Error(
        'HTML file is empty. Please check the file and try again',
      );
    }
  }

  static #stopWithError(errorMessage: string | unknown): void {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static async extractArchive(archivePath: string) {
    try {
      const absolutePath = resolve(archivePath);

      const buildPath = join(dirname(absolutePath), this.#extractDirName);

      await extract(absolutePath, { dir: buildPath });

      signale.success(`Archive extract to ${buildPath} directory`);
    } catch (error) {
      this.#stopWithError(error);
    }
  }

  static async createWebletter(
    filePath: string,
    outputPath: string,
    webletterUrl: string,
    webletterKey: string,
    proxy: string,
  ) {
    try {
      if (!webletterKey) throw new Error('Webletter token is missing');

      const configEmailPath = join(outputPath, Cahe.#configEmailFileName);
      const emailConfig = existsSync(configEmailPath)
        ? JSON.parse(readFileSync(configEmailPath, 'utf-8'))
        : {};

      const { id } = emailConfig;
      const proxyAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;

      const formData = new FormData();

      const blob = new Blob([readFileSync(filePath)], {
        type: 'application/zip',
      });

      formData.append('file', blob, basename(filePath));

      const url = id
        ? `${webletterUrl}/api/webletters/${id}`
        : `${webletterUrl}/api/webletters/upload`;

      const res = await fetch(url, {
        method: id ? 'PUT' : 'POST',
        agent: proxyAgent,
        headers: {
          Authorization: webletterKey,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Webletter response was not ok');
      }

      const { data } = (await res.json()) as WebletterData;

      if (data) {
        const newConfig = Object.assign(data, emailConfig);

        newConfig.webletterUrl = `${webletterUrl}/${newConfig.id}`;

        writeFileSync(configEmailPath, JSON.stringify(newConfig, null, 2));

        signale.success('Create webletter');

        return newConfig;
      }
    } catch (error) {
      if (error instanceof Error) {
        Cahe.#stopWithError(error.message);
      }
    }
  }

  private createProcessLog(archiveSize: number) {
    const htmlInterestMiniFy =
      (this.minifyHtmlLog.cleanedLength / this.htmlOriginalSize) * 100;

    signale.info(
      `HTML file size: ${(this.minifyHtmlLog.cleanedLength / 1e3).toFixed(
        2,
      )} KB ${Number(htmlInterestMiniFy.toFixed(0)) - 100}%`,
    );

    if (this.minifyHtmlLog.cleanedLength >= 1e5)
      signale.warn('The size of the HTML file exceeds 100 KB');

    signale.info(`Images: ${this.imagesSum}`);
    signale.info(`Total size: ${(archiveSize / 1e6).toFixed(2)} MB`);
    if (this.emailConfig)
      signale.info(`Webletter: ${this.emailConfig.webletterUrl}`);
    signale.info(`Path: ${this.outputArchiveFilePath}`);
    signale.info('Archive path copied to clipboard.');
  }

  private async createImageDir(archive: Archiver) {
    try {
      const tasks = this.imageSrcList.map(async ({ path, gateWidth }) => {
        const imagePath = join(this.dirPath, path);

        if (dirname(path) === this.imageDirName && existsSync(imagePath)) {
          const { width, format } = await sharp(imagePath).metadata();

          if (width && gateWidth && width > gateWidth && format !== 'gif') {
            let resizedImage = await ImageUtils.resizeImage(
              imagePath,
              gateWidth,
            );

            if (
              resizedImage &&
              Buffer.byteLength(resizedImage) > this.gateImagesSize
            ) {
              const compressAndResizeImage = await ImageUtils.compressImage(
                resizedImage,
                basename(imagePath),
              );

              resizedImage = compressAndResizeImage || resizedImage;
            }

            if (resizedImage) {
              archive.append(resizedImage, { name: path });
            } else {
              signale.fatal(`Failed to resize or compress image: ${path}`);
            }
          } else if (
            format !== 'gif' &&
            format !== 'svg' &&
            statSync(imagePath).size >= this.gateImagesSize
          ) {
            const compressedImage = await ImageUtils.compressImage(
              await readFileSync(imagePath),
              basename(imagePath),
            );

            if (compressedImage) {
              archive.append(compressedImage, { name: path });
            } else {
              signale.warn(`Failed to compress image: ${path}`);
            }
          } else if (format === 'svg') {
            const convertedImage = await ImageUtils.convertImage(imagePath);
            const newName = `${this.imageDirName}/${basename(
              path,
              extname(path),
            )}.png`;

            this.htmlString = this.htmlString.replace(
              new RegExp(path, 'g'),
              newName,
            );

            if (convertedImage) {
              archive.append(convertedImage, { name: newName });
            } else {
              signale.warn(`Image file ${imagePath} is missing`);
            }
          } else {
            archive.file(imagePath, { name: path });
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

  public async archiveContent() {
    try {
      const archive = archiver('zip', {
        zlib: { level: this.compressionRatio },
      });
      const output = createWriteStream(this.outputArchiveFilePath);

      archive.pipe(output);

      if (existsSync(this.imagesDirPath)) {
        this.imageSrcList = ImageUtils.getImageList(this.htmlString);

        if (this.imageSrcList.length > 0) {
          await this.createImageDir(archive);
        } else {
          signale.warn('No photos available locally');
        }
      } else {
        signale.warn('Images directory is missing');
      }

      HTMLUtils.checkMetaTags(this.htmlString);

      this.htmlString = await HTMLUtils.trimAndCheckHrefLink(
        this.htmlString,
        this.proxy,
      );
      const inlineCss = await HTMLUtils.addInlineCss(
        this.htmlString,
        this.cssString,
        this.cssFileName,
      );

      if (inlineCss) {
        this.htmlString = inlineCss
      }

      this.htmlString = this.htmlString.replace(ImageUtils.regexDataWidth, '');
      this.htmlString = HTMLUtils.replaceSpecialCharacters(this.htmlString);

      const minifiedHtml = await HTMLUtils.minifyHtml(this.htmlString);

      if (minifiedHtml) {
        this.htmlString = minifiedHtml.result;
        this.minifyHtmlLog = minifiedHtml.log;
      } else {
        return Cahe.#stopWithError('HTML minification failed.');
      }

      archive.append(this.htmlString, { name: this.#indexFileName });

      output.on('error', (error) => Cahe.#stopWithError(error.message));
      archive.on('error', (error) => Cahe.#stopWithError(error.message));

      this.archiveSize = archive.pointer();

      clipboard.writeSync(this.outputArchiveFilePath);

      await archive.finalize();

      signale.success('Create archive');

      output.on('finish', async () => {
        if (this.isExtractZipFile) {
          await Cahe.extractArchive(this.outputArchiveFilePath);
        }

        if (this.isWebVersion) {
          if (this.imageSrcList) {
            this.emailConfig = await Cahe.createWebletter(
              this.outputArchiveFilePath,
              this.dirPath,
              this.webletterUrl,
              this.webletterKey,
              this.proxy,
            );
          } else {
            this.emailConfig = await Cahe.createWebletter(
              this.outputArchiveFilePath,
              this.dirPath,
              this.webletterUrl,
              this.webletterKey,
              this.proxy,
            );
          }
        }

        this.createProcessLog(this.archiveSize);
      });

      return output;
    } catch (error) {
      return Cahe.#stopWithError(error);
    }
  }
}

export default Cahe;
