import { supabase } from "./supabase";
import { executeStorageCommand } from "./storage";
import type { StorageCommand } from "./storage";
import { downloadSharedFileToGrant, uploadSelectedFileFromGrant } from "./supabase-transfers";

type SupabaseCommand = {
  id: string;
  owner_id: string;
  device_id: string;
  command_type: string;
  payload: Record<string, unknown>;
  status: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStorageCommand(command: SupabaseCommand): StorageCommand | null {
  const payload = command.payload ?? {};
  switch (command.command_type) {
    case "list_granted_folder":
      return {
        type: "list_granted_directory",
        payload: { grantId: asString(payload.grantId), path: asString(payload.path) },
      };
    case "read_granted_file":
      return {
        type: "read_granted_file",
        payload: { grantId: asString(payload.grantId), path: asString(payload.path) },
      };
    case "create_folder":
      return {
        type: "create_directory",
        payload: {
          grantId: asString(payload.grantId),
          parentPath: asString(payload.parentPath),
          name: asString(payload.name),
        },
      };
    case "create_text_file":
      return {
        type: "create_text_file",
        payload: {
          grantId: asString(payload.grantId),
          parentPath: asString(payload.parentPath),
          name: asString(payload.name),
          content: asString(payload.content),
        },
      };
    default:
      return null;
  }
}

async function acknowledge(
  command: SupabaseCommand,
  status: "completed" | "failed",
  result: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from("remote_commands")
    .update({
      status,
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("id", command.id)
    .eq("device_id", command.device_id)
    .eq("status", "claimed");

  if (error) throw new Error(error.message);
}

/**
 * Processes commands for the registered device only.
 * The app must call this while it is active; Realtime/FCM wake-up is a separate stage.
 */
export async function processPendingSupabaseCommands(deviceId: string): Promise<number> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("supabase_auth_required");

  const { data, error } = await supabase
    .from("remote_commands")
    .select("id,owner_id,device_id,command_type,payload,status")
    .eq("owner_id", user.id)
    .eq("device_id", deviceId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) throw new Error(error.message);
  let processed = 0;

  for (const item of (data ?? []) as SupabaseCommand[]) {
    // Conditional update prevents two active pollers from claiming the same command.
    const { data: claimed, error: claimError } = await supabase
      .from("remote_commands")
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("device_id", deviceId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) throw new Error(claimError.message);
    if (!claimed) continue;

    try {
      let result: Record<string, unknown>;
      if (item.command_type === "ping" || item.command_type === "get_status") {
        result = {
          ok: true,
          platform: "android",
          appVersion: "1.0.0",
          execution: "foreground",
          completedAt: new Date().toISOString(),
        };
      } else if (item.command_type === "download_shared_file") {
        result = await downloadSharedFileToGrant(deviceId, item.payload);
      } else if (item.command_type === "upload_selected_file") {
        result = await uploadSelectedFileFromGrant(deviceId, item.payload);
      } else {
        const storageCommand = toStorageCommand(item);
        if (!storageCommand) throw new Error("unsupported_command_type");
        const output = await executeStorageCommand(storageCommand);
        result = { ok: true, output };
      }
      await acknowledge(item, "completed", result);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message.slice(0, 120) : "command_execution_failed";
      await acknowledge(item, "failed", { ok: false, error: code });
    }
    processed += 1;
  }

  return processed;
}
