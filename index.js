#!/usr/bin/env node
import { existsSync } from 'fs';
import {
  dirname,
  extname,
  resolve,
} from 'path';
import { fileURLToPath } from 'url';
import signale from 'signale';
import dotenv from 'dotenv'; // https://github.com/motdotla/dotenv
import { program } from 'commander'; // https://github.com/tj/commander.js

// eslint-disable-next-line import/no-named-as-default, import/no-named-as-default-member
import Cahe from './src/Cahe.js';

const filePath = process.argv[2];
const scriptPath = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(scriptPath, '.env') });

program
  .option('-w, --web-version')
  .option('-e, --extract-zip-file');

program.parse();

const options = program.opts();

if (
  filePath
  && existsSync(filePath)
  && extname(filePath.toLowerCase()) === '.html'
) {
  try {
    const cahe = new Cahe(
      filePath,
      process.env.WEBLETTER_URL,
      process.env.WEBLETTER_TOKEN,
      process.env.PROXY,
      options.webVersion,
      options.extractZipFile,
    );

    await cahe.archiveContent();
  } catch (error) {
    signale.fatal(error);
  }
} else if (
  filePath
  && existsSync(filePath)
  && extname(filePath.toLowerCase()) === '.zip'
) {
  if (options.webVersion) {
    try {
      const webletter = await Cahe.createWebletter(
        filePath,
        dirname(filePath),
        process.env.WEBLETTER_URL,
        process.env.WEBLETTER_TOKEN,
        process.env.PROXY,
      );

      signale.info(`Webletter: ${webletter.webletterUrl}`);
    } catch (error) {
      signale.fatal(error);
    }
  } else {
    Cahe.extractArchive(filePath);
  }
} else {
  signale.fatal(
    'The path to the HTML or ZIP file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
