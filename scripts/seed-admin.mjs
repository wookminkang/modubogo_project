// master 슈퍼관리자 1명 시드 (일회용)
//
// 실행:  node --env-file=.env.local scripts/seed-admin.mjs
//        (또는 비밀번호를 env 로: SEED_PASSWORD='...' node --env-file=.env.local scripts/seed-admin.mjs)
//
// scrypt 해시 포맷은 src/lib/auth-crypto.ts 와 동일하게 유지해야 한다
// (scheme "scrypt", salt 16바이트 hex, keylen 64). .ts 트랜스파일 회피 위해 복제.

import { createClient } from "@supabase/supabase-js";
import { scryptSync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.\n" +
      "  node --env-file=.env.local scripts/seed-admin.mjs"
  );
  process.exit(1);
}

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(pw, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

let password = process.env.SEED_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("master 비밀번호: ");
  rl.close();
}
if (!password || password.length < 4) {
  console.error("비밀번호가 너무 짧습니다.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from("admin_users")
  .upsert(
    {
      username: "master",
      name: "알리다고",
      role: "super",
      password_hash: hashPassword(password),
    },
    { onConflict: "username" }
  )
  .select("id, username, name, role")
  .single();

if (error) {
  console.error("시드 실패:", error);
  process.exit(1);
}
console.log("시드 완료:", data);
