import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

function keyFromSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("AUTH_SECRET (or TOKEN_ENCRYPTION_KEY) is required for token encryption");
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt OAuth tokens before persisting. Format: iv:tag:ciphertext (hex). */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyFromSecret(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export class TokenDecryptError extends Error {
  constructor(message = "저장된 OAuth 토큰을 복호화할 수 없습니다") {
    super(message);
    this.name = "TokenDecryptError";
  }
}

export function decryptToken(payload: string): string {
  // Auth.js가 암호화 전에 저장한 plaintext 호환
  if (!payload.includes(":")) return payload;
  const parts = payload.split(":");
  if (parts.length !== 3) return payload;
  const [ivHex, tagHex, dataHex] = parts;
  if (!ivHex || !tagHex || !dataHex) return payload;
  // hex 형식이 아니면 암호화본이 아님
  if (![ivHex, tagHex, dataHex].every((p) => /^[0-9a-f]+$/i.test(p))) {
    return payload;
  }
  try {
    const decipher = createDecipheriv(ALGO, keyFromSecret(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // 예전에는 암호문을 그대로 반환 → Google이 400 invalid_grant 를 냄
    throw new TokenDecryptError(
      "AUTH_SECRET이 바뀌었거나 토큰이 손상되었습니다. Google 계정을 다시 연결해 주세요.",
    );
  }
}
