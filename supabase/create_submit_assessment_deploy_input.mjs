import { readFileSync, writeFileSync } from 'node:fs';
const content = readFileSync(new URL('./functions/submit-assessment/index.ts', import.meta.url), 'utf8');
writeFileSync(new URL('./submit_assessment_deploy_input.json', import.meta.url), JSON.stringify({ project_id: 'oevgnonkqpvfvjsmovpw', name: 'submit-assessment', entrypoint_path: 'index.ts', verify_jwt: true, files: [{ name: 'index.ts', content }] }, null, 2));
