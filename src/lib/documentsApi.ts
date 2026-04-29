/**
 * Cliente para la API de documentos en Convex.
 *
 * Reutiliza el mismo deployment de Convex compartido entre las apps
 * (mismo backend que cleantime-hub). Las funciones `documents:*` y las
 * tablas `docCategories` / `documents` ya están desplegadas allí.
 *
 * Si VITE_CONVEX_URL no está definida, las llamadas fallarán: la pantalla
 * de documentos requiere conexión a la nube (los archivos se guardan en
 * Convex Storage, no en localStorage).
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const CONVEX_URL =
  (import.meta.env.VITE_CONVEX_URL as string | undefined) ??
  "https://polite-ocelot-652.eu-west-1.convex.cloud";

let _client: ConvexHttpClient | null = null;
function getClient(): ConvexHttpClient {
  if (!_client) {
    _client = new ConvexHttpClient(CONVEX_URL);
  }
  return _client;
}

export type DocCategoryId = string & { __brand: "docCategoryId" };
export type DocumentId = string & { __brand: "documentId" };
export type StorageId = string & { __brand: "storageId" };

export interface DocCategory {
  _id: DocCategoryId;
  _creationTime: number;
  name: string;
  order: number;
}

export interface DocumentRecord {
  _id: DocumentId;
  _creationTime: number;
  name: string;
  categoryId: DocCategoryId;
  storageId: StorageId;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export const documentsCloudEnabled = !!CONVEX_URL;

export async function listCategories(): Promise<DocCategory[]> {
  return (await getClient().query(anyApi.documents.listCategories, {})) as DocCategory[];
}

export async function addCategory(name: string): Promise<DocCategoryId> {
  return (await getClient().mutation(anyApi.documents.addCategory, { name })) as DocCategoryId;
}

export async function renameCategory(id: DocCategoryId, name: string): Promise<void> {
  await getClient().mutation(anyApi.documents.renameCategory, { id, name });
}

export async function deleteCategory(id: DocCategoryId): Promise<void> {
  await getClient().mutation(anyApi.documents.deleteCategory, { id });
}

export async function listDocuments(
  categoryId?: DocCategoryId
): Promise<DocumentRecord[]> {
  const args = categoryId ? { categoryId } : {};
  return (await getClient().query(anyApi.documents.listDocuments, args)) as DocumentRecord[];
}

export async function generateUploadUrl(): Promise<string> {
  return (await getClient().mutation(anyApi.documents.generateUploadUrl, {})) as string;
}

export async function saveDocument(args: {
  name: string;
  categoryId: DocCategoryId;
  storageId: StorageId;
  fileType: string;
  fileSize: number;
}): Promise<DocumentId> {
  return (await getClient().mutation(anyApi.documents.saveDocument, args)) as DocumentId;
}

export async function deleteDocument(id: DocumentId): Promise<void> {
  await getClient().mutation(anyApi.documents.deleteDocument, { id });
}

export async function getDownloadUrl(storageId: StorageId): Promise<string | null> {
  return (await getClient().query(anyApi.documents.getDownloadUrl, { storageId })) as
    | string
    | null;
}

/**
 * Sube un archivo a Convex Storage y crea el registro en la tabla `documents`.
 */
export async function uploadDocument(
  file: File,
  name: string,
  categoryId: DocCategoryId
): Promise<DocumentId> {
  const uploadUrl = await generateUploadUrl();
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error("upload_failed");
  const { storageId } = (await res.json()) as { storageId: StorageId };
  return await saveDocument({
    name: name.trim() || file.name,
    categoryId,
    storageId,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
