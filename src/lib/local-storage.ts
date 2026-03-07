import fs from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function saveFile(
  objectKey: string,
  data: Buffer
): Promise<void> {
  const filePath = path.join(UPLOADS_ROOT, objectKey);
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data);
}

export async function readFile(objectKey: string): Promise<Buffer> {
  const filePath = path.join(UPLOADS_ROOT, objectKey);
  return fs.readFile(filePath);
}

export async function deleteFile(objectKey: string): Promise<void> {
  const filePath = path.join(UPLOADS_ROOT, objectKey);
  await fs.unlink(filePath).catch(() => {});
}

export async function fileExists(objectKey: string): Promise<boolean> {
  const filePath = path.join(UPLOADS_ROOT, objectKey);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
