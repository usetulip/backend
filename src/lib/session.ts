import { adminAuth } from "./admin-auth.ts";
import { clientAuth } from "./client-auth.ts";

export async function getClientSession(request: Request) {
  return clientAuth.api.getSession({ headers: request.headers });
}

export async function getAdminSession(request: Request) {
  return adminAuth.api.getSession({ headers: request.headers });
}

export async function requireClientUser(request: Request) {
  const session = await getClientSession(request);
  if (!session?.user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role =
    session.user && "role" in session.user
      ? String(session.user.role)
      : "user";

  if (role === "admin") {
    return {
      error: Response.json(
        { error: "Admin accounts cannot access the client portal" },
        { status: 403 },
      ),
    };
  }

  return { session };
}

export async function requireAdmin(request: Request) {
  const session = await getAdminSession(request);
  if (!session?.user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role =
    session.user && "role" in session.user
      ? String(session.user.role)
      : "user";

  if (role !== "admin") {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}
