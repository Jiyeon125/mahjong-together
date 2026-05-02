import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase 환경변수가 비어 있습니다. .env.local 파일을 확인해주세요.");
}

// MVP에서는 anon key를 사용하므로, Supabase 콘솔에서 RLS 정책을 반드시 설정해야 합니다.
// 개발 단계에서는 임시 공개 정책(SELECT/INSERT/UPDATE/DELETE) 또는 RLS 비활성화를 사용할 수 있습니다.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
