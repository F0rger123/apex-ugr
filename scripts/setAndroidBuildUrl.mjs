import { readFile, writeFile } from 'node:fs/promises';

const buildUrl = process.argv[2];
if (!buildUrl || !/^https:\/\/expo\.dev\/artifacts\/eas\/.+\.apk$/i.test(buildUrl)) {
  throw new Error('Expected an Expo APK artifact URL.');
}

const workerPath = 'functions/api/[[path]].ts';
const source = await readFile(workerPath, 'utf8');
const updated = source.replace(
  /const ANDROID_PREVIEW_URL = '[^']+';/,
  `const ANDROID_PREVIEW_URL = '${buildUrl}';`,
);

if (updated === source) throw new Error('Android download constant was not found.');
await writeFile(workerPath, updated);
