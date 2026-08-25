import { readFileSync, writeFileSync } from 'node:fs';

const query = readFileSync(new URL('./migrations/0005_harden_public_certificate_verification.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./harden_certificate_verification_migration_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'online_university_harden_public_certificate_verification',
  query,
}));
