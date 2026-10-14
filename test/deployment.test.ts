import { deepStrictEqual, equal, match } from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { test } from 'node:test';

test('deployment requires an explicit profile and account ID', () => {
  const missingProfile = spawnSync(process.execPath, ['scripts/deploy.mjs'], {
    encoding: 'utf8',
  });
  equal(missingProfile.status, 1);
  match(missingProfile.stderr, /explicit --profile/);

  const missingAccount = spawnSync(
    process.execPath,
    ['scripts/deploy.mjs', '--profile', 'deployment-test'],
    { encoding: 'utf8' },
  );
  equal(missingAccount.status, 1);
  match(missingAccount.stderr, /12-digit AWS --account-id/);
});

test('an account mismatch stops deployment before any AWS mutation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tenisu-deployment-test-'));
  const logPath = join(directory, 'calls.jsonl');
  try {
    await writeFile(
      join(directory, 'aws'),
      `#!/usr/bin/env node
const fs = require('node:fs');
fs.appendFileSync(process.env.TEST_AWS_CALL_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
process.stdout.write(JSON.stringify({ Account: '222222222222' }));
`,
      { mode: 0o700 },
    );
    const result = spawnSync(
      process.execPath,
      [
        'scripts/deploy.mjs',
        '--profile',
        'deployment-test',
        '--account-id',
        '111111111111',
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${directory}${delimiter}${process.env.PATH}`,
          TEST_AWS_CALL_LOG: logPath,
          WRITE_API_KEY: 'test-key-with-at-least-32-characters',
        },
      },
    );
    equal(result.status, 1);
    match(result.stderr, /AWS account mismatch/);
    const calls = (await readFile(logPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    deepStrictEqual(calls, [
      [
        '--profile',
        'deployment-test',
        '--region',
        'eu-west-3',
        'sts',
        'get-caller-identity',
        '--output',
        'json',
      ],
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
