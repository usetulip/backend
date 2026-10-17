const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "project-assets";

export function isStorageConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

export async function uploadProjectFile(
  projectId: string,
  fileType: "figma" | "zip",
  file: File,
): Promise<{ url: string; fileName: string }> {
  if (!isStorageConfigured()) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  const extension = fileType === "figma" ? "fig" : "zip";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${projectId}/${fileType}/${Date.now()}-${safeName || `file.${extension}`}`;

  const buffer = await file.arrayBuffer();

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: buffer,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Storage upload failed: ${body}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

  return { url: publicUrl, fileName: safeName || `file.${extension}` };
}
