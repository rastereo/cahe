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

  async #importHtmlAndConvertToString() {
    try {
      const data = await fs.promises.readFile(path.resolve(this.FilePath), {
        encoding: "utf-8",
      });

      signale.success("Converte to a string");

      return data;
    } catch (error) {
      return signale.fatal(error.message);
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
      return signale.fatal(error.message);
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
        signale.success("Archive create");
        signale.note(`HTML file size: ${this.log.bytesSaved / 1e3} KB.`);
        signale.note(`Total size: ${archive.pointer() / 1e6} MB.`);
        signale.note(`Path: ${outputArchiveFilePath}`);

        clipboard.writeSync(outputArchiveFilePath);
        signale.info("Archive path copied to clipboard.");
      });

      archive.on("error", (err) => {
        throw err;
      });

      archive.pipe(output);

      archive.append(await this.#minifyHtml(), { name: this.newFileName });

      archive.directory(path.join(this.dirPath, "images"), "images");

      await archive.finalize();
    } catch (error) {
      return signale.fatal(error.message);
    }
  }
}

if (process.argv[2] && process.argv[2].slice(-4) === "html") {
  try {
    const cahe = new Cahe(process.argv[2]);

    cahe.archiveContent();
  } catch (error) {
    signale.fatal(error);
  }
} else {
  signale.fatal(
    "The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified."
  );
}
