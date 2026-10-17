import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.ts";
import { user } from "../drizzle/auth-schema.ts";
import {
  DEFAULT_PIPELINE_STEPS,
  PROCESSING_DURATION_HOURS,
  type PipelineStep,
  type ProjectStatus,
  projects,
} from "../drizzle/project-schema.ts";

export function getProcessingDeadline(startedAt: Date | null) {
  if (!startedAt) {
    return null;
  }
  const deadline = new Date(startedAt);
  deadline.setHours(deadline.getHours() + PROCESSING_DURATION_HOURS);
  return deadline;
}

export function getSecondsRemaining(startedAt: Date | null) {
  const deadline = getProcessingDeadline(startedAt);
  if (!deadline) {
    return PROCESSING_DURATION_HOURS * 60 * 60;
  }
  const diff = Math.floor((deadline.getTime() - Date.now()) / 1000);
  return Math.max(0, diff);
}

export function serializeProject(
  project: typeof projects.$inferSelect,
  userInfo?: { name: string; email: string } | null,
) {
  return {
    ...project,
    userName: userInfo?.name ?? null,
    userEmail: userInfo?.email ?? null,
    secondsRemaining: getSecondsRemaining(project.processingStartedAt),
    processingDeadline: getProcessingDeadline(project.processingStartedAt)?.toISOString() ?? null,
  };
}

export async function getProjectByUserId(userId: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  return project ?? null;
}

export async function getProjectById(id: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  return project ?? null;
}

export async function listAllProjects() {
  return db
    .select({
      project: projects,
      userName: user.name,
      userEmail: user.email,
    })
    .from(projects)
    .innerJoin(user, eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));
}

type CreateProjectInput = {
  userId: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  layoutType: string;
  features: string[];
};

export async function createProject(input: CreateProjectInput) {
  const existing = await getProjectByUserId(input.userId);
  if (existing && existing.status !== "delivered") {
    return { error: "You already have an active project." as const, project: existing };
  }

  const now = new Date();

  const [project] = await db
    .insert(projects)
    .values({
      userId: input.userId,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      backgroundColor: input.backgroundColor,
      layoutType: input.layoutType,
      features: input.features,
      pipelineSteps: DEFAULT_PIPELINE_STEPS,
      status: "processing",
      processingStartedAt: now,
    })
    .returning();

  return { project };
}

export async function approveProject(projectId: string, adminId: string) {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({
      approvedAt: now,
      approvedBy: adminId,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();

  return project ?? null;
}

export async function updatePipelineSteps(
  projectId: string,
  pipelineSteps: PipelineStep[],
) {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({
      pipelineSteps,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();

  return project ?? null;
}

export async function updateProjectAssets(
  projectId: string,
  assets: {
    githubUrl?: string | null;
    s3Bucket?: string | null;
    figmaFileUrl?: string | null;
    figmaFileName?: string | null;
    zipFileUrl?: string | null;
    zipFileName?: string | null;
  },
) {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({
      ...assets,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();

  return project ?? null;
}

export async function deliverProject(projectId: string) {
  const now = new Date();
  const [project] = await db
    .update(projects)
    .set({
      status: "delivered" satisfies ProjectStatus,
      deliveredAt: now,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();

  return project ?? null;
}

export async function deleteProject(projectId: string) {
  const [project] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  return project ?? null;
}
