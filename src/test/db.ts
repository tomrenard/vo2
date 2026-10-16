import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { user } from "@/db/schema";

/** A fresh in-memory Postgres with every migration applied, installed as the app's db(). */
export async function testDb() {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
  (globalThis as { vo2Db?: unknown }).vo2Db = db;
  await db.insert(user).values([{ id: "u1", name: "Tom", email: "tom@example.com" }]);
  return db;
}
