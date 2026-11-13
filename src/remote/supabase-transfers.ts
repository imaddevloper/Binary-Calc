import { decode, encode } from "base64-arraybuffer";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";
import { readGrantedFileBase64, writeGrantedFileBase64 } from "./storage";

const BUCKET = "binary-calc-device-files";
const MAX_MOBILE_TRANSFER_BYTES = 15 * 1024 * 1024;

type TransferRow = {
  id: string;
  owner_id: string;
  device_id: string;
  direction: "from_device" | "to_device";
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  object_path: string;
  status: string;
};

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 400) {
    throw new Error("invalid_" + name);
  }
  return value;
}

function safeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/\.\./g, "_").slice(0, 180) || "file";
}

async function getOwnerId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("supabase_auth_required");
  return user.id;
}

/** Upload a file only from a previously user-granted SAF folder. */
export async function uploadSelectedFileFromGrant(
  deviceId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const grantId = requiredString(payload.grantId, "grant_id");
  const relativePath = requiredString(payload.path, "file_path");
  const file = await readGrantedFileBase64(grantId, relativePath);
  if (file.size > MAX_MOBILE_TRANSFER_BYTES) throw new Error("file_too_large_for_mobile_transfer");

  const ownerId = await getOwnerId();
  const transferId = Crypto.randomUUID();
  const fileName = safeFileName(file.name);
  const objectPath = `${ownerId}/${deviceId}/${transferId}/${fileName}`;

  const { error: insertError } = await supabase.from("remote_file_transfers").insert({
    id: transferId,
    owner_id: ownerId,
    device_id: deviceId,
    direction: "from_device",
    file_name: fileName,
    mime_type: file.mimeType,
    size_bytes: file.size,
    object_path: objectPath,
    status: "uploading",
  });
  if (insertError) throw new Error(insertError.message);

  const bytes = decode(file.base64);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, bytes, {
    contentType: file.mimeType,
    upsert: false,
  });
  if (uploadError) {
    await supabase.from("remote_file_transfers").update({ status: "failed" }).eq("id", transferId);
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase.from("remote_file_transfers")
    .update({ status: "available" })
    .eq("id", transferId)
    .eq("device_id", deviceId);
  if (updateError) throw new Error(updateError.message);

  return {
    transferId,
    fileName,
    sizeBytes: file.size,
    direction: "from_device",
    status: "available",
  };
}

/** Download a web-uploaded object into a folder the user previously granted on this phone. */
export async function downloadSharedFileToGrant(
  deviceId: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const transferId = requiredString(payload.transfer_id, "transfer_id");
  const grantId = requiredString(payload.grant_id, "grant_id");
  const parentPath = typeof payload.path === "string" ? payload.path : "";
  const ownerId = await getOwnerId();

  const { data: transfer, error: lookupError } = await supabase
    .from("remote_file_transfers")
    .select("*")
    .eq("id", transferId)
    .eq("owner_id", ownerId)
    .eq("device_id", deviceId)
    .eq("direction", "to_device")
    .eq("status", "available")
    .maybeSingle();

  if (lookupError || !transfer) throw new Error(lookupError?.message ?? "transfer_not_available");
  const row = transfer as TransferRow;
  if (Number(row.size_bytes) > MAX_MOBILE_TRANSFER_BYTES) {
    throw new Error("file_too_large_for_mobile_transfer");
  }

  const { data, error: downloadError } = await supabase.storage.from(BUCKET).download(row.object_path);
  if (downloadError || !data) throw new Error(downloadError?.message ?? "storage_download_failed");

  const buffer = await data.arrayBuffer();
  if (buffer.byteLength > MAX_MOBILE_TRANSFER_BYTES) throw new Error("file_too_large_for_mobile_transfer");
  const base64 = encode(buffer);
  const written = await writeGrantedFileBase64(
    grantId,
    parentPath,
    safeFileName(row.file_name),
    base64,
    row.mime_type ?? "application/octet-stream",
  );

  const { error: updateError } = await supabase.from("remote_file_transfers")
    .update({ status: "completed" })
    .eq("id", transferId)
    .eq("device_id", deviceId);
  if (updateError) throw new Error(updateError.message);

  return { transferId, ...written, status: "completed" };
}
