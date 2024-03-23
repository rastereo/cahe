#!/usr/bin/env node

import { crush } from "html-crush"; // https://codsen.com/os/html-crush
import archiver from "archiver"; // https://www.archiverjs.com/
import fs from "fs";
import path from "path";

const htmlFilePath = process.argv[2];

const htmlCrushConfig = {
  lineLengthLimit: 500,
  removeIndentations: true,
  removeLineBreaks: true,
  removeHTMLComments: true,
  removeCSSComments: true,
  reportProgressFunc: null,
  reportProgressFuncFrom: 0,
  reportProgressFuncTo: 100,
};

const dirPath = getDirPath(htmlFilePath);
const fileName = getFileName(htmlFilePath);
const newFileName = createNewFileName(fileName);

function getDirPath(htmlPath) {
  for (let i = htmlPath.length - 1; i > 0; i--) {
    if (htmlPath[i] === "/" || htmlPath[i] === "\\") {
      return htmlPath.slice(0, i + 1);
    }
  }
}

function getFileName(htmlPath) {
  for (let i = htmlPath.length - 1; i > 0; i--) {
    if (htmlPath[i] === "/" || htmlPath[i] === "\\") {
      return htmlPath.slice(i + 1);
    }
  }
}

function createNewFileName(fileName) {
  return "${fileName.slice(0, -4)}min.html";
}

async function importHtmlAndConvertToString(filePath) {
  try {
    if (!filePath) {
      console.error("\x1b[31m", "Please provide a file path.");

      return;
    }
    const data = await fs.promises.readFile(path.resolve(filePath), { encoding: "utf-8" });

    console.log("\x1b[32m", "Converted to a string successfully");

    return data;
  } catch (error) {
    console.error("\x1b[31m", "Error reading the HTML file", error);
  }
}

async function minifyHtml(filePath) {
  try {
    const htmlString = await importHtmlAndConvertToString(filePath);

    const { log, result } = crush(htmlString, htmlCrushConfig);

    console.log("\x1b[32m", "Html-crush minify successfully");
    console.log("\x1b[0m", log);

    return result;
  } catch (error) {
    console.error("\x1b[31m", "HTML-Crush server error", error);
  }
}

async function writeNewHtmlFile() {
  try {
    const outputPath = path.join(dirPath, newFileName);

    const minifiedHtml = await minifyHtml(htmlFilePath);

    await fs.promises.writeFile(outputPath, minifiedHtml, "utf-8");

    console.log("\x1b[32m", `File has been write to ${dirPath}`);
  } catch (error) {
    console.error("\x1b[31m", "Error writing the file:", error);
  }
}

writeNewHtmlFile();
