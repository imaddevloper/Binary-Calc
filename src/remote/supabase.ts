import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://cmaddeurguhfywiuqvax.supabase.co";
// Publishable client key only. RLS remains the authorization boundary.
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_kmwA8yXWnjaYgYu6w5Kd_Q_LfFqAqiO";

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("[Binary-Calc] Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const browserStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-publishable-key",
  {
    auth: {
      storage: Platform.OS === "web" ? browserStorage : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  },
);

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export function startSupabaseAuthLifecycle(): () => void {
  if (Platform.OS === "web" || appStateSubscription) return () => undefined;

  const onStateChange = (state: string) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };

  appStateSubscription = AppState.addEventListener("change", onStateChange);
  if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
    supabase.auth.stopAutoRefresh();
  };
}
