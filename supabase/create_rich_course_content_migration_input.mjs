import { readFileSync, writeFileSync } from 'node:fs';

const sql = readFileSync(new URL('./migrations/0007_rich_course_content.sql', import.meta.url), 'utf8');
writeFileSync(new URL('./rich_course_content_migration_input.json', import.meta.url), JSON.stringify({
  project_id: 'oevgnonkqpvfvjsmovpw',
  name: 'rich_course_content',
  query: sql,
}, null, 2));
