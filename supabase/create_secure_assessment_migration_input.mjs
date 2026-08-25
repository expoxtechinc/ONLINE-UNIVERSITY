import { readFileSync, writeFileSync } from 'node:fs';

const query = readFileSync(new URL('./migrations/0004_secure_assessment_submission.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./secure_assessment_migration_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'online_university_secure_assessment_submission',
  query,
}));
