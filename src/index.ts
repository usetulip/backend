import { adminAuth } from "./lib/admin-auth.ts";
import { clientAuth } from "./lib/client-auth.ts";
import { handlePreflight, withCors } from "./lib/cors.ts";
import { getAdminSession, getClientSession } from "./lib/session.ts";
import { syncAdminAccount } from "./lib/sync-admin.ts";
import { handleAdminProjectRoutes } from "./routes/admin-projects.ts";
import { handleProjectRoutes } from "./routes/projects.ts";

const port = Number(process.env.PORT ?? 4000);

await syncAdminAccount();

Bun.serve({
  port,
  async fetch(request) {
    const preflight = handlePreflight(request);
    if (preflight) {
      return preflight;
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/admin-auth")) {
      const response = await adminAuth.handler(request);
      return withCors(request, response);
    }

    if (url.pathname.startsWith("/api/auth")) {
      const response = await clientAuth.handler(request);
      return withCors(request, response);
    }

    if (url.pathname === "/api/me" && request.method === "GET") {
      const session = await getClientSession(request);

      return withCors(
        request,
        Response.json(session ?? { user: null, session: null }),
      );
    }

    if (url.pathname === "/api/admin/me" && request.method === "GET") {
      const session = await getAdminSession(request);

      return withCors(
        request,
        Response.json(session ?? { user: null, session: null }),
      );
    }

    const projectResponse = await handleProjectRoutes(request, url.pathname);
    if (projectResponse) {
      return projectResponse;
    }

    const adminResponse = await handleAdminProjectRoutes(request, url.pathname);
    if (adminResponse) {
      return adminResponse;
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return withCors(request, Response.json({ status: "ok" }));
    }

    return withCors(request, new Response("Not found", { status: 404 }));
  },
});

console.log(`Auth API listening on http://localhost:${port}`);
