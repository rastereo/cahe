import {
  createWriteStream,
  existsSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, extname, join, resolve } from 'path';
import archiver, { Archiver } from 'archiver';
import clipboard from 'clipboardy';
import signale from 'signale';
import sharp from 'sharp';
import extract from 'extract-zip';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from 'axios';

// eslint-disable-next-line import/no-unresolved
import ImageUtils from './utils/ImageUtils.js';
// eslint-disable-next-line import/no-unresolved
import HTMLUtils from './utils/HTMLUtils.js';

class Cahe {
  private filePath: string;

  private dirPath: string;

  private imagesDirPath: string;

  private fileName: string;

  private cssFilePath: string;

  private outputArchiveFilePath: string;

  private isWebVersion: boolean;

  private isExtractZipFile: boolean;

  private webletterUrl: string;

  private webletterKey: string;

  private proxy: string;

  private htmlString: string;

  private cssString: string | null;

  private htmlOriginalSize: number;

  private minifyHtmlLog: { cleanedLength: number };

  private imageSrcList: { path: string; gateWidth?: number }[];

  private archiveSize: number;

  private emailConfig: { webletterUrl: string | null };

  private gateImagesSize: number;

  private compressionRatio: number;

  private htmlFileName: string;

  private imageDirName: string;

  private cssFileName: string;

  private extractDirName: string;

  private configEmailFileName: string;

  private imagesSum: number;

  constructor(
    htmlFilePath: string,
    webletterUrl: string,
    webletterKey: string,
    proxy: string,
    isWebVersion: boolean,
    isExtractZipFile: boolean,
    compressionRatio: number,
    gateImagesSize: number,
    htmlFileName: string,
    cssFileName: string,
    imageDirName: string,
    extractDirName: string,
    configEmailFileName: string,
  ) {
    this.filePath = htmlFilePath;
    this.dirPath = dirname(this.filePath);
    this.htmlFileName = htmlFileName;
    this.cssFileName = cssFileName;
    this.imageDirName = imageDirName;
    this.imagesDirPath = join(this.dirPath, imageDirName);
    this.fileName = basename(this.filePath, '.html');
    this.cssFilePath = join(this.dirPath, this.cssFileName);
    this.outputArchiveFilePath = resolve(this.dirPath, `${this.fileName}.zip`);
    this.isWebVersion = isWebVersion;
    this.isExtractZipFile = isExtractZipFile;
    this.webletterUrl = webletterUrl;
    this.webletterKey = webletterKey;
    this.proxy = proxy;
    this.minifyHtmlLog = { cleanedLength: 0 };
    this.imageSrcList = [];
    this.archiveSize = 0;
    this.emailConfig = { webletterUrl: null };
    this.gateImagesSize = gateImagesSize;
    this.compressionRatio = compressionRatio;
    this.extractDirName = extractDirName;
    this.configEmailFileName = configEmailFileName;

    this.htmlString =
      this.filePath && readFileSync(resolve(this.filePath), 'utf-8');

    this.cssString = existsSync(this.cssFilePath)
      ? readFileSync(resolve(this.cssFilePath), 'utf-8')
      : null;

    this.htmlOriginalSize = Buffer.byteLength(this.htmlString);

    this.archiveContent = this.archiveContent.bind(this);

    this.imagesSum = 0;

    if (!this.htmlString) {
      throw new Error(
        'HTML file is empty. Please check the file and try again',
      );
    }
  }

  static stopWithError(errorMessage: string | unknown): void {
    signale.fatal(errorMessage);
    process.exit(1);
  }

  static async extractArchive(
    archivePath: string,
    extractDirName: string,
  ): Promise<void> {
    try {
      const absolutePath = resolve(archivePath);

      const buildPath = join(dirname(absolutePath), extractDirName);

      await extract(absolutePath, { dir: buildPath });

      signale.success(`Archive extract to ${buildPath} directory`);
    } catch (error) {
      this.stopWithError(error);
    }
  }

  static async createWebletter(
    filePath: string,
    outputPath: string,
    webletterUrl: string,
    webletterKey: string,
    proxy: string,
    configEmailFileName: string,
  ) {
    try {
      if (!webletterKey) throw new Error('Webletter token is missing');

      const configEmailPath = join(outputPath, configEmailFileName);
      const emailConfig = existsSync(configEmailPath)
        ? JSON.parse(readFileSync(configEmailPath, 'utf-8'))
        : {};

      const { id } = emailConfig;
      
      const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;

      const formData = new FormData();

      const blob = new Blob([readFileSync(filePath)], {
        type: 'application/zip',
      });

      formData.append('file', blob, basename(filePath));

      const url = id
        ? `${webletterUrl}/api/webletters/${id}`
        : `${webletterUrl}/api/webletters/upload`;

      const { data } = await axios(url, {
        method: id ? 'PUT' : 'POST',
        httpsAgent,
        headers: {
          Authorization: webletterKey,
        },
        data: formData,
      });

      if (data) {
        const newConfig = Object.assign(data, emailConfig);

        newConfig.webletterUrl = `${webletterUrl}/${newConfig.id}`;

        writeFileSync(configEmailPath, JSON.stringify(newConfig, null, 2));

        signale.success('Create webletter');

        return newConfig;
      }

      return null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return Cahe.stopWithError(error.message);
      }

      if (error instanceof Error) {
        return Cahe.stopWithError(error.message);
      }

      return Cahe.stopWithError('An unknown error occurred');
    }
  }

  private createProcessLog(archiveSize: number): void {
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
    if (this.emailConfig.webletterUrl)
      signale.info(`Webletter: ${this.emailConfig.webletterUrl}`);
    signale.info(`Path: ${this.outputArchiveFilePath}`);
    signale.info('Archive path copied to clipboard.');
  }

  private async createImageDir(archive: Archiver): Promise<void> {
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
      Cahe.stopWithError(error);
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
        this.htmlString = inlineCss;
      }

      this.htmlString = this.htmlString.replace(ImageUtils.regexDataWidth, '');
      this.htmlString = HTMLUtils.replaceSpecialCharacters(this.htmlString);

      const minifiedHtml = await HTMLUtils.minifyHtml(this.htmlString);

      if (minifiedHtml) {
        this.htmlString = minifiedHtml.result;
        this.minifyHtmlLog = minifiedHtml.log;
      } else {
        return Cahe.stopWithError('HTML minification failed.');
      }

      archive.append(this.htmlString, { name: this.htmlFileName });

      output.on('error', (error) => Cahe.stopWithError(error.message));
      archive.on('error', (error) => Cahe.stopWithError(error.message));

      this.archiveSize = archive.pointer();

      clipboard.writeSync(this.outputArchiveFilePath);

      await archive.finalize();

      signale.success('Create archive');

      output.on('finish', async () => {
        if (this.isExtractZipFile) {
          await Cahe.extractArchive(
            this.outputArchiveFilePath,
            this.extractDirName,
          );
        }

        if (this.isWebVersion) {
          this.emailConfig = await Cahe.createWebletter(
            this.outputArchiveFilePath,
            this.dirPath,
            this.webletterUrl,
            this.webletterKey,
            this.proxy,
            this.configEmailFileName,
          );
        }

        this.createProcessLog(this.archiveSize);

        process.exit(0);
      });

      return output;
    } catch (error) {
      return Cahe.stopWithError(error);
    }
  }
}

export default Cahe;
