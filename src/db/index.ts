import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Disable prepare for Supabase transaction-mode pooler (port 6543)
export const client = postgres(connectionString, { prepare: false });

export const db = drizzle({ client, schema });

export async function closeDb() {
  await client.end();
}
