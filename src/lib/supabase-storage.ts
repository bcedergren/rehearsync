import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(url, key);
}

export async function createSignedUploadUrl(
  bucket: string,
  objectKey: string
): Promise<{ signedUrl: string; token: string }> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(objectKey);

  if (error || !data) {
    throw new Error(`Failed to create upload URL: ${error?.message}`);
  }

  return { signedUrl: data.signedUrl, token: data.token };
}

export async function createSignedDownloadUrl(
  bucket: string,
  objectKey: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectKey, expiresIn);

  if (error || !data) {
    throw new Error(`Failed to create download URL: ${error?.message}`);
  }

  return data.signedUrl;
}

export async function uploadBuffer(
  bucket: string,
  objectKey: string,
  data: Buffer,
  mimeType: string
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectKey, data, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function readObject(
  bucket: string,
  objectKey: string
): Promise<Buffer> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(objectKey);

  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteObject(
  bucket: string,
  objectKey: string
): Promise<void> {
  const supabase = getServiceClient();
  const { error } = await supabase.storage.from(bucket).remove([objectKey]);

  if (error) {
    throw new Error(`Failed to delete object: ${error.message}`);
  }
}

export async function objectExists(
  bucket: string,
  objectKey: string
): Promise<boolean> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(objectKey.substring(0, objectKey.lastIndexOf("/")), {
      search: objectKey.substring(objectKey.lastIndexOf("/") + 1),
    });

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
