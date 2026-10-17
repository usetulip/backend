import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export * from "./auth-schema.ts";
export * from "./project-schema.ts";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name"),
  phone: varchar("phone", { length: 256 }),
});