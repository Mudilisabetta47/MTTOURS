import { defineConfig, env } from "prisma/config";

// Local .env is optional; in CI/production variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // no .env file present
}

// Prisma reads connection strings from the environment only.
// Never commit real credentials. See .env.example.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
