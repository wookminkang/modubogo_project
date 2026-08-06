import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트 (service_role 키).
 *
 * ⚠️ 절대 클라이언트 컴포넌트에서 import 하지 말 것.
 *   - service_role 키는 RLS 를 우회하므로 브라우저에 노출되면 안 됨.
 *   - 상단 `import "server-only"` 가 클라이언트 번들 유입을 빌드 타임에 차단.
 *   - import 처는 인증 모듈(admin.ts / admin-actions.ts / employee.ts / employee-actions.ts)로만 한정한다.
 *     (db.ts / bizgo.ts / supabase.ts / "use client" 파일에서 import 금지)
 *
 * 현재 용도: admin_users, employees 테이블 접근(로그인 검증·세션 유저 조회). 이 테이블들은
 * RLS on + 정책 없음이라 anon 키로는 접근 불가, service_role 만 통과한다.
 *
 * 지연 초기화: env(SUPABASE_SERVICE_ROLE_KEY)가 빌드 시점엔 없어도 모듈 평가가
 * 실패하지 않도록, 실제 사용(런타임)할 때 클라이언트를 생성한다.
 */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_URL) 환경변수가 없습니다."
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

// 사용처는 `supabaseAdmin.from(...)` 형태를 그대로 쓰되, 접근 시점에 클라이언트를 생성.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
