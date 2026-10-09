import { assertTestDatabase } from "./safety";

try {
  process.loadEnvFile();
} catch {
  // CI provides env
}
process.env.DATABASE_URL = assertTestDatabase(process.env.TEST_DATABASE_URL);
process.env.APP_URL ??= "http://localhost:3000";
process.env.SESSION_SECRET ??= "test-session-secret-test-session-secret-123";
process.env.TICKET_SIGNING_SECRET ??= "test-ticket-secret-test-ticket-secret-12345";
