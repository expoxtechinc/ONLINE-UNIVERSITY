import { readFileSync, writeFileSync } from 'node:fs';

const content = readFileSync(new URL('./functions/submit-assessment/index.ts', import.meta.url), 'utf8');
writeFileSync(new URL('./submit_assessment_function_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'submit-assessment',
  verify_jwt: true,
  entrypoint_path: 'index.ts',
  files: [{ name: 'index.ts', content }],
}));
