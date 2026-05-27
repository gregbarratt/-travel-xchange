import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "travel-xchange-media";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error("Upload a JPG, PNG, WebP, or GIF image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image uploads must be 5MB or smaller.");
  }
}

export async function uploadPublicImage(
  supabase: SupabaseClient,
  file: File,
  folder: string,
  label: string,
) {
  validateImageFile(file);

  const extension = getImageExtension(file);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "-");
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "-");
  const path = `${safeFolder}/${safeLabel}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(getMediaUploadErrorMessage(error.message));
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function getImageExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName;
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "gif";
}

function getMediaUploadErrorMessage(message: string) {
  if (
    message.toLowerCase().includes("bucket") ||
    message.toLowerCase().includes("storage")
  ) {
    return "Media uploads are not installed yet. Run supabase/phase-29-profile-media.sql in Supabase, then refresh this page.";
  }

  return message;
}
