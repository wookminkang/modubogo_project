import { customAlphabet } from "nanoid";

// URL용 짧은 ID. 헷갈리는 글자(0/O, 1/l/I)는 제외해 가독성 확보.
const ALPHABET =
  "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

/** 회사(병원) URL 식별자 생성 — 10자 */
export const generateCompanyNanoid = customAlphabet(ALPHABET, 10);
