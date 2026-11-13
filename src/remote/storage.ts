import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";

const GRANTS_KEY = "binarycalc.remote.folder-grants.v1";
const MAX_GRANTS = 3;
const MAX_LIST_ITEMS = 20;
const MAX_TEXT_FILE_BYTES = 2_500;
const MAX_TEXT_FILE_CHARS = 2_500;
const MAX_TEXT_WRITE_CHARS = 4_096;
const SAFE_SEGMENT = /^(?!\.{1,2}$)[^\u0000-\u001f\u007f/\\]{1,120}$/;
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "json", "csv", "log", "xml", "html", "css", "js", "ts",
  "py", "yaml", "yml", "ini", "conf", "sh",
]);

export interface FolderGrant {
  id: string;
  name: string;
  uri: string;
}

export interface FolderGrantSummary {
  id: string;
  name: string;
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  kind: "directory" | "file";
  size: number | null;
}

export type StorageCommand =
  | { type: "list_granted_directory"; payload: { grantId: string; path: string } }
  | { type: "create_directory"; payload: { grantId: string; parentPath: string; name: string } }
  | { type: "create_text_file"; payload: { grantId: string; parentPath: string; name: string; content: string } }
  | { type: "read_granted_file"; payload: { grantId: string; path: string } };

export class RemoteStorageError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "RemoteStorageError";
  }
}

function makeGrantId(): string {
  // This is an opaque selector, not an authentication secret.
  return "grant_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function safeSegment(value: unknown): value is string {
  return typeof value === "string" && SAFE_SEGMENT.test(value) && !value.includes("..");
}

function safePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 400) return false;
  if (value === "") return true;
  return value.split("/").every(safeSegment);
}

function nameFromSafUri(uri: string): string {
  const last = uri.split("/").pop() ?? "";
  const decoded = decodeURIComponent(last);
  const withoutVolume = decoded.includes(":") ? decoded.slice(decoded.lastIndexOf(":") + 1) : decoded;
  return withoutVolume.split("/").pop() ?? "";
}

async function loadGrants(): Promise<FolderGrant[]> {
  const raw = await SecureStore.getItemAsync(GRANTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FolderGrant =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as FolderGrant).id === "string" &&
      typeof (item as FolderGrant).name === "string" &&
      typeof (item as FolderGrant).uri === "string" &&
      (item as FolderGrant).uri.startsWith("content://"),
    ).slice(0, MAX_GRANTS);
  } catch {
    return [];
  }
}

async function saveGrants(grants: FolderGrant[]): Promise<void> {
  await SecureStore.setItemAsync(GRANTS_KEY, JSON.stringify(grants.slice(0, MAX_GRANTS)));
}

export async function listFolderGrants(): Promise<FolderGrantSummary[]> {
  return (await loadGrants()).map(({ id, name }) => ({ id, name }));
}

export async function addFolderGrant(): Promise<FolderGrant | null> {
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) return null;

  const uri = result.directoryUri;
  if (typeof uri !== "string" || !uri.startsWith("content://")) {
    throw new RemoteStorageError("invalid_folder_grant");
  }

  const grants = await loadGrants();
  const existing = grants.find((grant) => grant.uri === uri);
  if (existing) return existing;
  if (grants.length >= MAX_GRANTS) throw new RemoteStorageError("folder_grant_limit");

  const name = nameFromSafUri(uri) || "Selected folder";
  const grant = { id: makeGrantId(), name: name.slice(0, 80), uri };
  await saveGrants([...grants, grant]);
  return grant;
}

export async function removeFolderGrant(grantId: string): Promise<void> {
  const grants = await loadGrants();
  await saveGrants(grants.filter((grant) => grant.id !== grantId));
}

async function findGrant(grantId: string): Promise<FolderGrant> {
  const grant = (await loadGrants()).find((item) => item.id === grantId);
  if (!grant) throw new RemoteStorageError("folder_access_not_granted");
  return grant;
}

async function resolveDirectory(grant: FolderGrant, relativePath: string): Promise<string> {
  if (!safePath(relativePath)) throw new RemoteStorageError("invalid_relative_path");
  let currentUri = grant.uri;
  if (!relativePath) return currentUri;

  for (const segment of relativePath.split("/")) {
    const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(currentUri);
    let nextUri: string | null = null;
    for (const childUri of children) {
      const info = await FileSystem.getInfoAsync(childUri);
      if (info.exists && info.isDirectory && nameFromSafUri(childUri) === segment) {
        nextUri = childUri;
        break;
      }
    }
    if (!nextUri) throw new RemoteStorageError("directory_not_found");
    currentUri = nextUri;
  }
  return currentUri;
}

export async function executeStorageCommand(command: StorageCommand): Promise<unknown> {
  switch (command.type) {
    case "list_granted_directory": {
      const grant = await findGrant(command.payload.grantId);
      const directoryUri = await resolveDirectory(grant, command.payload.path);
      const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
      const entries: RemoteFileEntry[] = [];
      for (const childUri of children.slice(0, MAX_LIST_ITEMS)) {
        const info = await FileSystem.getInfoAsync(childUri);
        if (!info.exists) continue;
        const name = nameFromSafUri(childUri);
        if (!safeSegment(name)) continue;
        const kind = info.isDirectory ? "directory" : "file";
        entries.push({
          name,
          path: command.payload.path ? command.payload.path + "/" + name : name,
          kind,
          size: typeof info.size === "number" ? info.size : null,
        });
      }
      return {
        grant: { id: grant.id, name: grant.name },
        path: command.payload.path,
        truncated: children.length > MAX_LIST_ITEMS,
        entries,
      };
    }

    case "create_directory": {
      if (!safeSegment(command.payload.name) || !safePath(command.payload.parentPath)) {
        throw new RemoteStorageError("invalid_file_name");
      }
      const grant = await findGrant(command.payload.grantId);
      const parentUri = await resolveDirectory(grant, command.payload.parentPath);
      await FileSystem.StorageAccessFramework.makeDirectoryAsync(parentUri, command.payload.name);
      return { created: true, name: command.payload.name, kind: "directory" };
    }

    case "create_text_file": {
      if (
        !safeSegment(command.payload.name) ||
        !safePath(command.payload.parentPath) ||
        typeof command.payload.content !== "string" ||
        command.payload.content.length > MAX_TEXT_WRITE_CHARS
      ) {
        throw new RemoteStorageError("invalid_file_payload");
      }
      const grant = await findGrant(command.payload.grantId);
      const parentUri = await resolveDirectory(grant, command.payload.parentPath);
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        parentUri,
        command.payload.name,
        "text/plain",
      );
      await FileSystem.writeAsStringAsync(fileUri, command.payload.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return { created: true, name: command.payload.name, characters: command.payload.content.length };
    }

    case "read_granted_file": {
      if (!safePath(command.payload.path) || !command.payload.path) {
        throw new RemoteStorageError("invalid_relative_path");
      }
      const parts = command.payload.path.split("/");
      const fileName = parts.pop()!;
      if (!safeSegment(fileName)) throw new RemoteStorageError("invalid_file_name");
      const parentPath = parts.join("/");
      const grant = await findGrant(command.payload.grantId);
      const parentUri = await resolveDirectory(grant, parentPath);
      const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
      let fileUri: string | null = null;
      for (const childUri of children) {
        if (nameFromSafUri(childUri) === fileName) {
          const info = await FileSystem.getInfoAsync(childUri);
          if (info.exists && !info.isDirectory) {
            fileUri = childUri;
            break;
          }
        }
      }
      if (!fileUri) throw new RemoteStorageError("file_not_found");
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || info.isDirectory) throw new RemoteStorageError("file_not_found");
      const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
      if (!TEXT_EXTENSIONS.has(extension)) throw new RemoteStorageError("file_type_not_supported");
      if (typeof info.size !== "number" || info.size > MAX_TEXT_FILE_BYTES) {
        throw new RemoteStorageError("file_too_large_for_preview");
      }
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (content.length > MAX_TEXT_FILE_CHARS) throw new RemoteStorageError("file_too_large_for_preview");
      return { name: fileName, size: info.size, content };
    }
  }
}

export async function clearFolderGrants(): Promise<void> {
  await SecureStore.deleteItemAsync(GRANTS_KEY);
}


export interface GrantedBinaryFile {
  name: string;
  size: number;
  mimeType: string;
  base64: string;
}

const MAX_BINARY_TRANSFER_BYTES = 15 * 1024 * 1024;

/** Read one regular file from a folder the user explicitly granted through Android SAF. */
export async function readGrantedFileBase64(grantId: string, relativePath: string): Promise<GrantedBinaryFile> {
  if (!safePath(relativePath) || !relativePath) throw new RemoteStorageError("invalid_relative_path");
  const parts = relativePath.split("/");
  const fileName = parts.pop()!;
  if (!safeSegment(fileName)) throw new RemoteStorageError("invalid_file_name");

  const grant = await findGrant(grantId);
  const parentUri = await resolveDirectory(grant, parts.join("/"));
  const children = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  let fileUri: string | null = null;
  for (const childUri of children) {
    if (nameFromSafUri(childUri) !== fileName) continue;
    const info = await FileSystem.getInfoAsync(childUri);
    if (info.exists && !info.isDirectory) { fileUri = childUri; break; }
  }
  if (!fileUri) throw new RemoteStorageError("file_not_found");

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.isDirectory || typeof info.size !== "number") {
    throw new RemoteStorageError("file_not_found");
  }
  if (info.size > MAX_BINARY_TRANSFER_BYTES) {
    throw new RemoteStorageError("file_too_large_for_mobile_transfer");
  }

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", pdf: "application/pdf", txt: "text/plain", json: "application/json",
    mp4: "video/mp4", mp3: "audio/mpeg", zip: "application/zip",
  };
  return { name: fileName, size: info.size, mimeType: mimeTypes[extension] ?? "application/octet-stream", base64 };
}

/** Write downloaded bytes into a user-approved SAF folder; never accepts an absolute path. */
export async function writeGrantedFileBase64(
  grantId: string,
  parentPath: string,
  fileName: string,
  base64: string,
  mimeType: string,
): Promise<{ name: string; size: number }> {
  if (!safePath(parentPath) || !safeSegment(fileName) || typeof base64 !== "string") {
    throw new RemoteStorageError("invalid_file_payload");
  }
  if (base64.length > Math.ceil(MAX_BINARY_TRANSFER_BYTES * 4 / 3) + 16) {
    throw new RemoteStorageError("file_too_large_for_mobile_transfer");
  }
  const grant = await findGrant(grantId);
  const parentUri = await resolveDirectory(grant, parentPath);
  const normalizedMime = typeof mimeType === "string" && mimeType.length <= 127
    ? mimeType
    : "application/octet-stream";
  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    parentUri,
    fileName,
    normalizedMime,
  );
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { name: fileName, size: Math.floor(base64.length * 3 / 4) };
}
