import { createAuth } from "./create-auth.ts";

export const adminAuth = createAuth({
  basePath: "/api/admin-auth",
  cookiePrefix: "tulip-admin",
});
