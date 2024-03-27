#!/usr/bin/env node
import { crush } from "html-crush"; // https://codsen.com/os/html-crush
import archiver from "archiver"; // https://www.archiverjs.com/
import clipboard from "clipboardy"; // https://github.com/sindresorhus/clipboardy
import fs, { createWriteStream } from "fs";
import path from "path";

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

  #showConsoleMessage(message, isError = false) {
    if (isError) {
      console.error("\x1b[31m", message, message);
    } else {
      console.log("\x1b[32m", message);
    }
  }

  async #importHtmlAndConvertToString() {
    try {
      const data = await fs.promises.readFile(path.resolve(this.FilePath), {
        encoding: "utf-8",
      });

      this.#showConsoleMessage("Converted to a string successfully");
      return data;
    } catch (error) {
      this.#showConsoleMessage(error, true);
    }
  }

  async #minifyHtml() {
    try {
      const { result } = crush(
        await this.#importHtmlAndConvertToString(),
        this.htmlCrushConfig,
      );

      this.#showConsoleMessage("Html-crush minify successfully");

      return result;
    } catch (error) {
      this.#showConsoleMessage("HTML-Crush server error", true);
    }
  }

  async archiveContent() {
    try {
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Устанавливаем уровень сжатия
      });

      // Файл вывода для архива
      const outputArchiveFilePath = path.resolve(this.dirPath, `${this.fileName}.zip`);
      const output = createWriteStream(outputArchiveFilePath);

      output.on("close", () => {
        this.#showConsoleMessage(`Archive created. Total size: ${archive.pointer() / 1e6} MB.`);
        this.#showConsoleMessage(`Archive path: ${outputArchiveFilePath}`);

        clipboard.writeSync(outputArchiveFilePath);
        this.#showConsoleMessage("Archive path copied to clipboard.");
      });

      archive.on("error", (err) => {
        throw err;
      });

      // Передаем данные архива в файл
      archive.pipe(output);

      // Добавляем минифицированный HTML-файл как строку
      archive.append(await this.#minifyHtml(), { name: this.newFileName });

      // Добавляем директорию 'image' в архив, предполагая, что она
      // расположена в той же директории, что и HTML-файл
      archive.directory(path.join(this.dirPath, "images"), "images");

      // Завершаем архивацию - это означает, что мы закончили
      // добавлять файлы, и заголовки архива теперь записаны
      await archive.finalize();
    } catch (error) {
      this.#showConsoleMessage(error, true);
    }
  }
}

if (process.argv[2] && process.argv[2].slice(-4) === "html") {
  const cahe = new Cahe(process.argv[2]);

  cahe.archiveContent();
} else {
  console.error(
    "\x1b[31m",
    "The path to the HTML file is either incorrect or missing. Please verify the path and ensure it is correctly specified.",
  );
}
