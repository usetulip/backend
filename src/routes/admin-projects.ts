import type { PipelineStep } from "../drizzle/project-schema.ts";
import { withCors } from "../lib/cors.ts";
import {
  approveProject,
  deleteProject,
  deliverProject,
  getProjectById,
  listAllProjects,
  serializeProject,
  updatePipelineSteps,
  updateProjectAssets,
} from "../lib/projects.ts";
import { requireAdmin } from "../lib/session.ts";
import { uploadProjectFile } from "../lib/storage.ts";

export async function handleAdminProjectRoutes(
  request: Request,
  pathname: string,
): Promise<Response | null> {
  if (!pathname.startsWith("/api/admin/projects")) {
    return null;
  }

  const authResult = await requireAdmin(request);
  if ("error" in authResult) {
    return withCors(request, authResult.error);
  }

  const adminId = authResult.session.user.id;

  if (pathname === "/api/admin/projects" && request.method === "GET") {
    const allProjects = await listAllProjects();
    return withCors(
      request,
      Response.json({
        projects: allProjects.map((row) =>
          serializeProject(row.project, {
            name: row.userName,
            email: row.userEmail,
          }),
        ),
      }),
    );
  }

  const projectIdMatch = pathname.match(
    /^\/api\/admin\/projects\/([^/]+)(?:\/(approve|pipeline|assets|upload|deliver))?$/,
  );

  if (!projectIdMatch) {
    return withCors(request, new Response("Not found", { status: 404 }));
  }

  const projectId = projectIdMatch[1]!;
  const action = projectIdMatch[2];

  if (!action && request.method === "GET") {
    const project = await getProjectById(projectId);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ project: serializeProject(project) }));
  }

  if (!action && request.method === "DELETE") {
    const project = await deleteProject(projectId);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ success: true }));
  }

  if (action === "approve" && request.method === "POST") {
    const project = await approveProject(projectId, adminId);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ project: serializeProject(project) }));
  }

  if (action === "pipeline" && request.method === "PATCH") {
    let body: { pipelineSteps?: PipelineStep[] };
    try {
      body = await request.json();
    } catch {
      return withCors(
        request,
        Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      );
    }

    if (!body.pipelineSteps?.length) {
      return withCors(
        request,
        Response.json({ error: "pipelineSteps required" }, { status: 400 }),
      );
    }

    const project = await updatePipelineSteps(projectId, body.pipelineSteps);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ project: serializeProject(project) }));
  }

  if (action === "assets" && request.method === "PATCH") {
    let body: {
      githubUrl?: string | null;
      s3Bucket?: string | null;
    };
    try {
      body = await request.json();
    } catch {
      return withCors(
        request,
        Response.json({ error: "Invalid JSON body" }, { status: 400 }),
      );
    }

    const project = await updateProjectAssets(projectId, body);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ project: serializeProject(project) }));
  }

  if (action === "upload" && request.method === "POST") {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return withCors(
        request,
        Response.json({ error: "Invalid form data" }, { status: 400 }),
      );
    }

    const fileType = formData.get("fileType");
    const file = formData.get("file");

    if (
      (fileType !== "figma" && fileType !== "zip") ||
      !(file instanceof File)
    ) {
      return withCors(
        request,
        Response.json({ error: "fileType and file required" }, { status: 400 }),
      );
    }

    try {
      const uploaded = await uploadProjectFile(projectId, fileType, file);
      const assetUpdate =
        fileType === "figma"
          ? {
              figmaFileUrl: uploaded.url,
              figmaFileName: uploaded.fileName,
            }
          : {
              zipFileUrl: uploaded.url,
              zipFileName: uploaded.fileName,
            };

      const project = await updateProjectAssets(projectId, assetUpdate);
      if (!project) {
        return withCors(
          request,
          Response.json({ error: "Project not found" }, { status: 404 }),
        );
      }
      return withCors(request, Response.json({ project: serializeProject(project) }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed";
      return withCors(
        request,
        Response.json({ error: message }, { status: 500 }),
      );
    }
  }

  if (action === "deliver" && request.method === "POST") {
    const project = await deliverProject(projectId);
    if (!project) {
      return withCors(
        request,
        Response.json({ error: "Project not found" }, { status: 404 }),
      );
    }
    return withCors(request, Response.json({ project: serializeProject(project) }));
  }

  return withCors(request, new Response("Not found", { status: 404 }));
}
