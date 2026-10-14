import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = fileURLToPath(new URL('../.aws/package/', import.meta.url));
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of ['dist', 'package.json', 'package-lock.json']) {
  await cp(`${root}/${file}`, `${destination}/${file}`, { recursive: true });
}
execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts'], {
  cwd: destination,
  stdio: 'inherit',
});
console.log('AWS deployment package ready in .aws/package');
