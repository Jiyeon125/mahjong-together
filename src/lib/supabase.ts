import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabasePublicKey = supabaseAnonKey || supabasePublishableKey;

function buildSupabaseConfigErrorMessage(): string | null {
  if (!supabaseUrl && !supabasePublicKey) {
    return "Supabase 환경변수 누락: VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY(또는 VITE_SUPABASE_PUBLISHABLE_KEY)를 설정해주세요.";
  }
  if (!supabaseUrl) {
    return "Supabase 환경변수 누락: VITE_SUPABASE_URL을 설정해주세요.";
  }
  if (!supabasePublicKey) {
    return "Supabase 환경변수 누락: VITE_SUPABASE_ANON_KEY 또는 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해주세요.";
  }
  return null;
}

export const supabaseConfigErrorMessage = buildSupabaseConfigErrorMessage();

if (supabaseConfigErrorMessage) {
  console.warn(supabaseConfigErrorMessage);
}

export function assertSupabaseConfigured(): void {
  if (supabaseConfigErrorMessage) {
    throw new Error(supabaseConfigErrorMessage);
  }
}

// MVP에서는 anon key를 사용하므로, Supabase 콘솔에서 RLS 정책을 반드시 설정해야 합니다.
// 개발 단계에서는 임시 공개 정책(SELECT/INSERT/UPDATE/DELETE) 또는 RLS 비활성화를 사용할 수 있습니다.
export const supabase = createClient(supabaseUrl ?? "", supabasePublicKey ?? "");
