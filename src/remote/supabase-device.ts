import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "./supabase";

const INSTALLATION_ID_KEY = "binarycalc.supabase.installation-id.v1";

function createUuid(): string {
  // Installation identifier only; it is not an authentication credential.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function getInstallationId(): Promise<string> {
  const saved = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (saved && /^[0-9a-f-]{36}$/i.test(saved)) return saved;
  const created = createUuid();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

export async function registerCurrentDevice(): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("supabase_auth_required");

  const installationId = await getInstallationId();
  const deviceName =
    Constants.deviceName ||
    Constants.expoConfig?.name ||
    (Platform.OS === "android" ? "Android device" : "Mobile device");

  const { data, error } = await supabase
    .from("remote_devices")
    .upsert(
      {
        owner_id: user.id,
        installation_id: installationId,
        display_name: deviceName.slice(0, 80),
        platform: Platform.OS === "ios" ? "ios" : Platform.OS === "web" ? "web" : "android",
        app_version: Constants.expoConfig?.version ?? null,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,installation_id" },
    )
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(error?.message ?? "device_registration_failed");
  return data.id as string;
}

export async function updateCurrentDeviceHeartbeat(deviceId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("supabase_auth_required");

  const { error } = await supabase
    .from("remote_devices")
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
}

export async function unregisterCurrentDevice(deviceId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("supabase_auth_required");

  const { error } = await supabase
    .from("remote_devices")
    .delete()
    .eq("id", deviceId)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
}
