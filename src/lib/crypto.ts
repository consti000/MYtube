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

export function decryptToken(payload: string): string {
  // Allow plaintext fallback for tokens already stored by Auth.js before encryption hook
  if (!payload.includes(":")) return payload;
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) return payload;
  try {
    const decipher = createDecipheriv(ALGO, keyFromSecret(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return payload;
  }
}
