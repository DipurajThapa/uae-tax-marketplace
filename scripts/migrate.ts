import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDb } from "../src/db/client";
import { loadEnv } from "./env";

loadEnv();
await migrate(getDb(), { migrationsFolder: "./drizzle" });
console.log("migrations applied");
await closeDb();
