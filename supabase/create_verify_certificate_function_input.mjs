import { readFileSync, writeFileSync } from 'node:fs';

const content = readFileSync(new URL('./functions/verify-certificate/index.ts', import.meta.url), 'utf8');
writeFileSync(new URL('./verify_certificate_function_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'verify-certificate',
  verify_jwt: false,
  entrypoint_path: 'index.ts',
  files: [{ name: 'index.ts', content }],
}));
