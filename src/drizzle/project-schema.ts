import {
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.ts";

export type PipelineStepStatus = "pending" | "active" | "completed";

export type PipelineStep = {
  id: string;
  label: string;
  status: PipelineStepStatus;
};

export type ProjectStatus =
  | "pending_approval"
  | "processing"
  | "delivered";

export const DEFAULT_PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "brief",
    label: "Brief Received & Validated",
    status: "completed",
  },
  {
    id: "orchestration",
    label: "AI Orchestration in Progress",
    status: "active",
  },
  {
    id: "qa",
    label: "Human QA & Token Sync",
    status: "pending",
  },
  {
    id: "compilation",
    label: "Asset Compilation",
    status: "pending",
  },
];

export const PROCESSING_DURATION_HOURS = 48;

export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").$type<ProjectStatus>().notNull().default("pending_approval"),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  backgroundColor: text("background_color").notNull(),
  layoutType: text("layout_type").notNull(),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  pipelineSteps: jsonb("pipeline_steps")
    .$type<PipelineStep[]>()
    .notNull()
    .default(DEFAULT_PIPELINE_STEPS),
  processingStartedAt: timestamp("processing_started_at"),
  deliveredAt: timestamp("delivered_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: text("approved_by"),
  figmaFileUrl: text("figma_file_url"),
  figmaFileName: text("figma_file_name"),
  githubUrl: text("github_url"),
  zipFileUrl: text("zip_file_url"),
  zipFileName: text("zip_file_name"),
  s3Bucket: text("s3_bucket"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
