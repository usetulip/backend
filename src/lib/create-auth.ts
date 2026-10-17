import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "../db/index.ts";
import * as schema from "../drizzle/auth-schema.ts";

const trustedOrigins = [
  process.env.FRONTEND_URL ?? "http://localhost:3000",
  process.env.ADMIN_URL ?? "http://localhost:3001",
];

export function createAuth({
  basePath,
  cookiePrefix,
}: {
  basePath: string;
  cookiePrefix: string;
}) {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    basePath,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "user",
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const adminEmail = process.env.ADMIN_EMAIL;
            if (adminEmail && user.email === adminEmail) {
              return {
                data: {
                  ...user,
                  role: "admin",
                },
              };
            }
            return { data: user };
          },
        },
      },
    },
    advanced: {
      cookiePrefix,
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: false,
        httpOnly: true,
      },
    },
    plugins: [
      admin({
        defaultRole: "user",
        adminRoles: ["admin"],
      }),
    ],
  });
}
