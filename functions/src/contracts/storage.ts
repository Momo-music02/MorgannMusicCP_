import admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();

const bucket = admin.storage().bucket();

export async function readFileBuffer(path: string): Promise<Buffer> {
  const [buf] = await bucket.file(path).download();
  return buf;
}

export async function saveBuffer(path: string, data: Uint8Array | Buffer, contentType: string): Promise<void> {
  await bucket.file(path).save(Buffer.from(data), {
    resumable: false,
    contentType,
    metadata: { cacheControl: "private, max-age=0, no-store" }
  });
}

export async function createDownloadUrl(path: string, expiresInMinutes = 20): Promise<string> {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  const [url] = await bucket.file(path).getSignedUrl({ action: "read", expires });
  return url;
}
