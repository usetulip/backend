import { createAuth } from "./create-auth.ts";

export const clientAuth = createAuth({
  basePath: "/api/auth",
  cookiePrefix: "tulip-client",
});
