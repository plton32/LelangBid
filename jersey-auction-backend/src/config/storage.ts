import fs from 'fs';
import path from 'path';

export const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../public/uploads');

export function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
  return uploadDir;
}

export function toUploadUrl(filename: string) {
  return `/uploads/${filename}`;
}
