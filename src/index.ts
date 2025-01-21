#!/usr/bin/env node
import { existsSync } from 'fs';
import { dirname, extname } from 'path';
import signale from 'signale';
import { program } from 'commander';

// eslint-disable-next-line import/no-unresolved
import Cahe from './Cahe.js';
// eslint-disable-next-line import/no-unresolved
import env from './utils/envalid.js';

const filePath = process.argv[2];

program.option('-w, --web-version').option('-e, --extract-zip-file');

program.parse();

const options = program.opts();

if (
  filePath &&
  existsSync(filePath) &&
  extname(filePath.toLowerCase()) === '.html'
) {
  try {
    const cahe = new Cahe(
      filePath,
      env.WEBLETTER_URL,
      env.WEBLETTER_TOKEN,
      env.PROXY,
      options.webVersion,
      options.extractZipFile,
      env.COMPRESSION_RATIO,
      env.GATE_IMAGE_SIZE,
      env.HTML_FILE_NAME,
      env.CSS_FILE_NAME,
      env.IMAGE_DIR_NAME,
      env.EXTRACT_DIR_NAME,
      env.CONFIG_EMAIL_NAME,
    );

    await cahe.archiveContent();
  } catch (error) {
    signale.fatal(error);
  }
} else if (
  filePath &&
  existsSync(filePath) &&
  extname(filePath.toLowerCase()) === '.zip'
) {
  if (options.webVersion) {
    try {
      const webletter = await Cahe.createWebletter(
        filePath,
        dirname(filePath),
        env.WEBLETTER_URL,
        env.WEBLETTER_TOKEN,
        env.PROXY,
        env.CONFIG_EMAIL_NAME,
      );

      signale.info(`Webletter: ${webletter.webletterUrl}`);
    } catch (error) {
      signale.fatal(error);
    }
  } else {
    Cahe.extractArchive(filePath, env.EXTRACT_DIR_NAME);
  }
} else {
  signale.fatal(
    'The path to the HTML or ZIP file is either incorrect or missing. Please verify the path and ensure it is correctly specified.',
  );
}
