#!/usr/bin/env node

// eslint-disable-next-line import/no-unresolved
import { crush } from "html-crush"; // https://codsen.com/os/html-crush
// eslint-disable-next-line no-unused-vars
import archiver from "archiver"; // https://www.archiverjs.com/
import fs from "fs";
import path from "path";

class Cahe {
  constructor(htmlFilePath) {
    this.FilePath = htmlFilePath;
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

  // eslint-disable-next-line consistent-return
  #getDirPath() {
    // eslint-disable-next-line no-plusplus
    for (let i = this.FilePath.length - 1; i > 0; i--) {
      if (this.FilePath[i] === "/" || this.FilePath[i] === "\\") {
        return this.FilePath.slice(0, i + 1);
      }
    }
  }

  // eslint-disable-next-line consistent-return
  #getFileName() {
    // eslint-disable-next-line no-plusplus
    for (let i = this.FilePath.length - 1; i > 0; i--) {
      if (this.FilePath[i] === "/" || this.FilePath[i] === "\\") {
        return this.FilePath.slice(i + 1);
      }
    }
  }

  #createNewFileName() {
    return `${this.fileName.slice(0, -4)}min.html`;
  }

  // eslint-disable-next-line consistent-return
  async #importHtmlAndConvertToString() {
    try {
      const data = await fs.promises.readFile(path.resolve(this.FilePath), {
        encoding: "utf-8",
      });

      console.log("\x1b[32m", "Converted to a string successfully");

      return data;
    } catch (error) {
      console.error("\x1b[31m", "Error reading the HTML file", error);
    }
  }

  // eslint-disable-next-line consistent-return
  async #minifyHtml(htmlString) {
    try {
      const { log, result } = crush(htmlString, this.htmlCrushConfig);

      console.log("\x1b[32m", "Html-crush minify successfully");
      console.log("\x1b[0m", log);

      return result;
    } catch (error) {
      console.error("\x1b[31m", "HTML-Crush server error", error);
    }
  }

  async writeNewHtmlFile() {
    if (!this.FilePath) {
      console.error("\x1b[31m", "Please provide a file path.");

      return;
    }

    try {
      this.dirPath = this.#getDirPath();
      this.fileName = this.#getFileName();
      this.newFileName = this.#createNewFileName();

      const outputPath = path.join(this.dirPath, this.newFileName);

      const resultHtmlString = await this.#importHtmlAndConvertToString();

      const minifiedHtml = await this.#minifyHtml(resultHtmlString);

      await fs.promises.writeFile(outputPath, minifiedHtml, "utf-8");

      console.log("\x1b[32m", `File has been write to ${this.dirPath}`);
    } catch (error) {
      console.error("\x1b[31m", "Error writing the file:", error);
    }
  }
}

const cahe = new Cahe(process.argv[2]);

cahe.writeNewHtmlFile();
