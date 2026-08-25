import { readFileSync, writeFileSync } from 'node:fs';
const sql = readFileSync(new URL('./migrations/0009_course_delete_audit.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./course_delete_audit_migration_input.json', import.meta.url), JSON.stringify({ project_id: 'oevgnonkqpvfvjsmovpw', name: 'course_delete_audit', query: sql }, null, 2));
