import { describe, it, expect, afterAll } from "vitest";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/** Scenario 10: a failing migration must leave the database exactly as it was (all-or-nothing). */
const admin = new Pool({ connectionString: "postgresql://app:app@localhost:5432/postgres" });
const DB = "marketplace_migration_drill";
const url = `postgresql://app:app@localhost:5432/${DB}`;

afterAll(async () => {
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.end();
});

async function tables(pool: Pool): Promise<number> {
  const r = await pool.query("select count(*)::int n from pg_tables where schemaname = 'public'");
  return r.rows[0].n;
}

describe("migration failure and recovery", () => {
  it("rolls back every pending migration when one fails, then succeeds once fixed", async () => {
    await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
    await admin.query(`CREATE DATABASE ${DB}`);
    const broken = mkdtempSync(path.join(tmpdir(), "mig-"));
    cpSync("drizzle", broken, { recursive: true });
    const journal = JSON.parse(readFileSync(path.join(broken, "meta/_journal.json"), "utf8"));
    const last = journal.entries[journal.entries.length - 1];
    journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: "9999_broken" });
    writeFileSync(path.join(broken, "meta/_journal.json"), JSON.stringify(journal));
    writeFileSync(path.join(broken, "9999_broken.sql"), "ALTER TABLE organizations ADD COLUMN ok boolean;\n--> statement-breakpoint\nSELECT * FROM table_that_does_not_exist;");

    const pool = new Pool({ connectionString: url });
    await expect(migrate(drizzle(pool), { migrationsFolder: broken })).rejects.toThrow();
    expect(await tables(pool)).toBe(0); // nothing half-applied

    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    expect(await tables(pool)).toBeGreaterThan(20);
    // Re-running is a no-op.
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    await pool.end();
  });
});
