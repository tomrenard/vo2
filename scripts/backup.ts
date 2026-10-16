/** Saves every table to backups/<time>.json (git-ignored). Run before each migrate. */
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { connect } from "../src/db/client.ts";

const db = connect();
// Every table there is, not the schema's: the backup runs before a migration, when they differ.
const tables = await db.execute(
  sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
);
const dump: Record<string, unknown[]> = {};
for (const { table_name } of tables) {
  dump[String(table_name)] = [
    ...(await db.execute(sql`select * from ${sql.identifier(String(table_name))}`)),
  ];
}
const dir = new URL("../backups/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const file = `${dir}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify(dump));
console.log(
  `${file}: ${dump.item_states?.length ?? 0} item states, ${dump.answers?.length ?? 0} answers`,
);
process.exit(0);
