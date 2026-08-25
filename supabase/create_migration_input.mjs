import { readFileSync, writeFileSync } from 'node:fs';

const query = readFileSync(new URL('./migrations/0001_online_university_foundation.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./online_university_foundation_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'online_university_foundation',
  query,
}));
