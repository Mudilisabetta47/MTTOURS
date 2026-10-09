import { execFileSync } from "node:child_process";
import { assertTestDatabase } from "./safety";

export default function setup() {
  try {
    process.loadEnvFile();
  } catch {
    // CI provides env
  }
  const url = assertTestDatabase(process.env.TEST_DATABASE_URL);
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
