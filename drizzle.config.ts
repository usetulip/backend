import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Supabase DB: limit to the public schema and our app tables only so push
  // never touches (or proposes dropping) auth/storage/realtime/vault tables.
  schemaFilter: ["public"],
  tablesFilter: ["user", "session", "account", "verification", "projects", "users"],
});
