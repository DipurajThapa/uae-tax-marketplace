/** Drops and recreates the dev database schema. Refuses to run against anything but a local *_dev or *_test DB. */
import { sql } from "drizzle-orm";
import { loadEnv } from "./env";
loadEnv();
const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\/\w+_(dev|test)$/.test(url)) {
  console.error("Refusing to reset: DATABASE_URL is not a local *_dev/*_test database.");
  process.exit(1);
}
const { getDb, closeDb } = await import("../src/db/client");
await getDb().execute(sql`drop schema public cascade; create schema public; drop schema if exists drizzle cascade;`);
await closeDb();
console.log("schema dropped; run npm run db:migrate && npm run db:seed -- --demo");
