import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import fixture from '../src/players/infrastructure/headtohead.json' with { type: 'json' };

const { values } = parseArgs({
  options: {
    profile: { type: 'string' },
    'account-id': { type: 'string' },
    region: { type: 'string', default: 'eu-west-3' },
    stack: { type: 'string', default: 'tenisu-api' },
  },
});
const profile = values.profile;
const accountId = values['account-id'];
if (!profile) {
  throw new Error('An explicit --profile is required');
}
if (!accountId || !/^\d{12}$/.test(accountId)) {
  throw new Error('Provide the expected 12-digit AWS --account-id');
}
const key = process.env.WRITE_API_KEY;
if (
  !key ||
  key.length < 32 ||
  key.startsWith('local-development-') ||
  key.trim() !== key
) {
  throw new Error(
    'Export a new WRITE_API_KEY with at least 32 characters before deploying',
  );
}

const root = fileURLToPath(new URL('../', import.meta.url));
const env = {
  ...process.env,
  AWS_PROFILE: profile,
  AWS_DEFAULT_PROFILE: profile,
  AWS_PAGER: '',
};
for (const name of [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AWS_WEB_IDENTITY_TOKEN_FILE',
  'AWS_ROLE_ARN',
  ...Object.keys(env).filter((name) => name.startsWith('AWS_ENDPOINT_URL')),
])
  delete env[name];
const aws = (args, capture = false) =>
  execFileSync(
    'aws',
    ['--profile', profile, '--region', values.region, ...args],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      stdio: capture ? 'pipe' : 'inherit',
    },
  );
const identity = JSON.parse(
  aws(['sts', 'get-caller-identity', '--output', 'json'], true),
);
if (identity.Account !== accountId)
  throw new Error('AWS account mismatch; no deployment has been performed');
console.log(
  `Deploying ${values.stack} to verified account ${accountId} in ${values.region}`,
);
execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit', env });
execFileSync('npm', ['run', 'package:aws'], {
  cwd: root,
  stdio: 'inherit',
  env,
});
const bucket = `tenisu-artifacts-${accountId}-${values.region}`;
try {
  aws(['s3api', 'head-bucket', '--bucket', bucket], true);
} catch (error) {
  if (!/404|Not Found/.test(String(error.stderr))) throw error;
  aws([
    's3api',
    'create-bucket',
    '--bucket',
    bucket,
    ...(values.region === 'us-east-1'
      ? []
      : [
          '--create-bucket-configuration',
          `LocationConstraint=${values.region}`,
        ]),
  ]);
}
aws([
  's3api',
  'put-public-access-block',
  '--bucket',
  bucket,
  '--public-access-block-configuration',
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
]);
aws([
  'cloudformation',
  'package',
  '--template-file',
  'infra/template.yaml',
  '--s3-bucket',
  bucket,
  '--output-template-file',
  '.aws/template.yaml',
]);
await mkdir(join(root, '.aws'), { recursive: true });
const parametersDirectory = await mkdtemp(join(root, '.aws', 'deploy-'));
const parameters = join(parametersDirectory, 'parameters.json');
try {
  await writeFile(parameters, JSON.stringify([`WriteApiKey=${key}`]), {
    mode: 0o600,
    flag: 'wx',
  });
  aws([
    'cloudformation',
    'deploy',
    '--template-file',
    '.aws/template.yaml',
    '--stack-name',
    values.stack,
    '--capabilities',
    'CAPABILITY_IAM',
    '--no-fail-on-empty-changeset',
    '--parameter-overrides',
    `file://${parameters}`,
  ]);
} finally {
  await rm(parametersDirectory, { recursive: true, force: true });
}
const outputs = JSON.parse(
  aws(
    [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      values.stack,
      '--query',
      'Stacks[0].Outputs',
      '--output',
      'json',
    ],
    true,
  ),
);
const apiUrl = outputs.find(
  (output) => output.OutputKey === 'ApiUrl',
)?.OutputValue;
if (!apiUrl) throw new Error('CloudFormation did not return an API URL');
for (const player of fixture.players) {
  const response = await fetch(`${apiUrl}/api/v1/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
    body: JSON.stringify(player),
    signal: AbortSignal.timeout(30000),
  });
  if (![201, 409].includes(response.status))
    throw new Error(`Seeding failed: HTTP ${response.status}`);
}
for (const path of [
  '/api/v1/health',
  '/api/v1/players',
  '/api/v1/statistics',
  '/docs/',
  '/openapi.json',
]) {
  const response = await fetch(`${apiUrl}${path}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Deployment check failed: ${path} (${response.status})`);
}
console.log(`API: ${apiUrl}/api/v1/players\nDocumentation: ${apiUrl}/docs`);
