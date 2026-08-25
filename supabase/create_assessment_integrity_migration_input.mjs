import { readFileSync, writeFileSync } from 'node:fs';
const sql = readFileSync(new URL('./migrations/0008_assessment_integrity.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./assessment_integrity_migration_input.json', import.meta.url), JSON.stringify({ project_id: 'oevgnonkqpvfvjsmovpw', name: 'assessment_integrity', query: sql }, null, 2));
