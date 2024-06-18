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
import Cahe from './src/Cahe.js';

const filePath = process.argv[2];
const scriptPath = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(scriptPath, '.env') });

if (
  filePath
  && existsSync(filePath)
  && extname(filePath.toLowerCase()) === '.html'
) {
  try {
    const cahe = new Cahe(filePath, process.env.NETLIFY_KEY, process.env.PROXY);

    await cahe.archiveContent();
  } catch (error) {
    signale.fatal(error);
  }
} else if (
  filePath
  && existsSync(filePath)
  && extname(filePath.toLowerCase()) === '.zip'
) {
  if (process.argv[3] === '-w' || process.argv[4] === '-w') {
    try {
      const webletter = await Cahe.createWebletter(
        filePath,
        process.env.NETLIFY_KEY,
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
