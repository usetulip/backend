import "dotenv/config";
import { client } from "../db/index.ts";

const sql = `
CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending_approval' NOT NULL,
  "primary_color" text NOT NULL,
  "secondary_color" text NOT NULL,
  "background_color" text NOT NULL,
  "layout_type" text NOT NULL,
  "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "pipeline_steps" jsonb DEFAULT '[
    {"id":"brief","label":"Brief Received & Validated","status":"completed"},
    {"id":"orchestration","label":"AI Orchestration in Progress","status":"active"},
    {"id":"qa","label":"Human QA & Token Sync","status":"pending"},
    {"id":"compilation","label":"Asset Compilation","status":"pending"}
  ]'::jsonb NOT NULL,
  "processing_started_at" timestamp,
  "delivered_at" timestamp,
  "approved_at" timestamp,
  "approved_by" text,
  "figma_file_url" text,
  "figma_file_name" text,
  "github_url" text,
  "zip_file_url" text,
  "zip_file_name" text,
  "s3_bucket" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
`;

await client.unsafe(sql);
console.log("projects table created successfully");
await client.end();
