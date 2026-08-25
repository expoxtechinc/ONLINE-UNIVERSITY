import { readFileSync, writeFileSync } from 'node:fs';

const query = readFileSync(new URL('./migrations/0003_profile_role_hardening.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./online_university_profile_role_hardening_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'online_university_profile_role_hardening',
  query,
}));
