import { readFileSync, writeFileSync } from 'node:fs';

const query = readFileSync(new URL('./migrations/0002_security_hardening.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./online_university_security_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'online_university_security_hardening',
  query,
}));
