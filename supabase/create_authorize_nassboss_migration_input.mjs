import { readFileSync, writeFileSync } from "node:fs";

const query = readFileSync(new URL("./migrations/0006_authorize_nassboss_super_admin.sql", import.meta.url), "utf8");
writeFileSync(new URL("./authorize_nassboss_super_admin_input.json", import.meta.url), JSON.stringify({
  project_id: "oevgnonkqpvfvjsmovpw",
  name: "authorize_nassboss_super_admin",
  query,
}));
