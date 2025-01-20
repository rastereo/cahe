import dotenv from 'dotenv';
import { join } from 'path';
import { cleanEnv, str, url, host, num } from 'envalid';

dotenv.config({ path: join(process.cwd(), '.env') });

const env = cleanEnv(process.env, {
  WEBLETTER_TOKEN: str(),
  WEBLETTER_URL: url(),
  PROXY: host(),
  COMPRESSION_RATIO: num({ default: 8 }),
  STEP_IMAGE_QUALITY: num({ default: 5 }),
  GATE_IMAGE_SIZE: num({ default: 5e5 }),
  CSS_FILE_NAME: str({ default: 'style' }),
  IMAGE_DIR_NAME: str({ default: 'images' }),
});

export default env;
