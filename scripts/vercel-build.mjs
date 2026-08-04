import { spawnSync } from "node:child_process";

function run(command, args) {
  const label = `${command} ${args.join(" ")}`;
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? 1}`);
  }
}

function runMigrateWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "pipe",
      encoding: "utf-8",
      shell: process.platform === "win32",
      env: process.env,
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
      output.toLowerCase().includes("advisory lock") ||
      output.toLowerCase().includes("timed out trying to acquire");

    if (!retryable || attempt === maxAttempts) {
      throw new Error(`prisma migrate deploy failed (attempt ${attempt}/${maxAttempts})`);
    }

    const waitMs = attempt * 4000;
    console.warn(
      `[build] prisma migrate deploy timeout (P1002). retry ${attempt}/${maxAttempts} after ${waitMs}ms...`,
    );
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
  }
}

run("npx", ["prisma", "generate"]);
runMigrateWithRetry(3);
run("npx", ["next", "build"]);
