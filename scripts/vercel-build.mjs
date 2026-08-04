import { spawnSync } from "node:child_process";

function run(command, args, env = process.env) {
  const label = `${command} ${args.join(" ")}`;
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Neon pooler URL → direct host (advisory lock / P1002 방지) */
function toDirectDatabaseUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("-pooler.")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
    }
    u.searchParams.delete("pgbouncer");
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", "30");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * 마이그레이션용 env: Neon pooler URL이면 direct host로 바꿉니다.
 */
function migrateEnv() {
  const raw =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    "";

  if (!raw) return process.env;

  const direct = toDirectDatabaseUrl(raw);
  if (direct !== raw) {
    console.log(
      "[build] using direct (non-pooler) DATABASE_URL for prisma migrate deploy",
    );
  }

  return {
    ...process.env,
    DATABASE_URL: direct,
    DIRECT_URL: process.env.DIRECT_URL || direct,
  };
}

function runMigrateWithRetry(maxAttempts = 5) {
  const env = migrateEnv();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "pipe",
      encoding: "utf-8",
      shell: process.platform === "win32",
      env,
    });

    if (result.status === 0) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      return;
    }

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");

    const retryable =
      output.includes("Error: P1002") ||
      output.includes("P1001") ||
      output.toLowerCase().includes("advisory lock") ||
      output.toLowerCase().includes("timed out trying to acquire") ||
      output.toLowerCase().includes("can't reach database server");

    if (!retryable || attempt === maxAttempts) {
      throw new Error(
        `prisma migrate deploy failed (attempt ${attempt}/${maxAttempts})`,
      );
    }

    const waitMs = Math.min(attempt * 8000, 30000);
    console.warn(
      `[build] migrate timeout/unreachable. retry ${attempt}/${maxAttempts} after ${waitMs}ms...`,
    );
    sleep(waitMs);
  }
}

run("npx", ["prisma", "generate"]);
runMigrateWithRetry(5);
run("npx", ["next", "build"]);
