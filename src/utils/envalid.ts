import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { cleanEnv, str, url, host, num } from 'envalid';
import { fileURLToPath } from 'url';

const scriptPath = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(scriptPath, '../../', '.env') });

const env = cleanEnv(process.env, {
  WEBLETTER_TOKEN: str(),
  WEBLETTER_URL: url(),
  PROXY: host({ default: '' }),
  COMPRESSION_RATIO: num({ default: 8 }),
  STEP_IMAGE_QUALITY: num({ default: 5 }),
  GATE_IMAGE_SIZE: num({ default: 5e5 }),
  HTML_FILE_NAME: str({ default: 'index.html' }),
  CSS_FILE_NAME: str({ default: 'style.css' }),
  IMAGE_DIR_NAME: str({ default: 'images' }),
  EXTRACT_DIR_NAME: str({ default: 'build' }),
  CONFIG_EMAIL_NAME: str({ default: 'config.json' }),
  AXIOS_REQUEST_TIMEOUT: num({ default: 10e3 }),
});

export default env;
