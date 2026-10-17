import { withCors } from "../lib/cors.ts";
import {
  createProject,
  getProjectByUserId,
  serializeProject,
} from "../lib/projects.ts";
import { requireClientUser } from "../lib/session.ts";

export async function handleProjectRoutes(
  request: Request,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/projects")) {
    return null;
  }

  if (pathname === "/api/projects/me" && request.method === "GET") {
    const authResult = await requireClientUser(request);
    if ("error" in authResult) {
      return withCors(request, authResult.error);
    }

    const project = await getProjectByUserId(authResult.session.user.id);
    return withCors(
      request,
      Response.json({ project: project ? serializeProject(project) : null }),
    );
  }

  if (pathname === "/api/projects" && request.method === "POST") {
    const authResult = await requireClientUser(request);
    if ("error" in authResult) {
      return withCors(request, authResult.error);
    }

    let body: {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      layoutType?: string;
      features?: string[];
    };

    try {
      body = await request.json();
    } catch {
      return withCors(
        request,
        Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      );
    }

    const { primaryColor, secondaryColor, backgroundColor, layoutType, features } =
      body;

    if (!primaryColor || !secondaryColor || !backgroundColor || !layoutType) {
      return withCors(
        request,
        Response.json({ error: "Missing required fields" }, { status: 400 }),
      );
    }

    const result = await createProject({
      userId: authResult.session.user.id,
      primaryColor,
      secondaryColor,
      backgroundColor,
      layoutType,
      features: features ?? [],
    });

    if ("error" in result && result.error) {
      return withCors(
        request,
        Response.json({ error: result.error, project: serializeProject(result.project) }, { status: 409 }),
      );
    }

    return withCors(
      request,
      Response.json({ project: serializeProject(result.project!) }, { status: 201 }),
    );
  }

  return withCors(request, new Response("Not found", { status: 404 }));
}
