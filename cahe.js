#!/usr/bin/env node
import fs, { createWriteStream } from "fs";
import path from "path";
import { crush } from "html-crush"; // https://codsen.com/os/html-crush
import archiver from "archiver"; // https://www.archiverjs.com/
import clipboard from "clipboardy"; // https://github.com/sindresorhus/clipboardy
import signale from "signale"; // https://github.com/klaudiosinani/signale

class Cahe {
  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
    this.dirPath = path.dirname(this.FilePath);
    this.imagesDirPath = path.join(path.join(this.dirPath, "images"));
    this.fileName = path.basename(this.FilePath, ".html");
    this.newFileName = `${this.fileName}.min.html`;
    this.htmlCrushConfig = {
      lineLengthLimit: 500,
      removeIndentations: true,
      removeLineBreaks: true,
      removeHTMLComments: true,
      removeCSSComments: true,
      reportProgressFunc: null,
      reportProgressFuncFrom: 0,
      reportProgressFuncTo: 100,
    };
  }

  #stopWithError(errorMessage) {
    signale.fatal(errorMessage);

    process.exit(1);
  }

  async #importHtmlAndConvertToString() {
    try {
      const data = await fs.promises.readFile(path.resolve(this.FilePath), {
        encoding: "utf-8",
      });

      if (!data) {
        throw new Error(
          "HTML file is empty. Please check the file and try again",
        );
      }

      signale.success("Convert to a string");

      return data;
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }

  async #minifyHtml() {
    try {
      const { result, log } = crush(
        await this.#importHtmlAndConvertToString(),
        this.htmlCrushConfig,
      );

      signale.success("Html-crush minify");

      this.log = log;

      return result;
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }

  async archiveContent() {
    try {
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      const outputArchiveFilePath = path.resolve(
        this.dirPath,
        `${this.fileName}.zip`,
      );
      const output = createWriteStream(outputArchiveFilePath);

      output.on("close", () => {
        const htmlFileSize = this.log.bytesSaved / 1e3;

        signale.success("Create archive");
        signale.note(`HTML file size: ${htmlFileSize} KB`);

        if (htmlFileSize >= 100) {
          signale.warn("The size of the HTML file exceeds 100 KB");
        }

        signale.note(`Total size: ${archive.pointer() / 1e6} MB`);
        signale.note(`Path: ${outputArchiveFilePath}`);

        clipboard.writeSync(outputArchiveFilePath);

        signale.info("Archive path copied to clipboard.");
      });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);

      archive.append(await this.#minifyHtml(), { name: this.newFileName });

      if (fs.existsSync(this.imagesDirPath)) {
        archive.directory(path.join(this.dirPath, "images"), "images");
      } else {
        signale.warn("Images directory is missing");
      }

      return await archive.finalize();
    } catch (error) {
      return this.#stopWithError(error.message);
    }
  }
}

const htmlFilePath = process.argv[2];

if (
  htmlFilePath
  && htmlFilePath.slice(-4) === "html"
  && fs.existsSync(htmlFilePath)
) {
  try {
    new Cahe(htmlFilePath).archiveContent();
  } catch (error) {
    signale.fatal(error);
  }
} else {
  signale.fatal(
    "The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.",
  );
}
