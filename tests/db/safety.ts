/** Refuse to run destructive test helpers against anything that is not clearly a test database. */
export function assertTestDatabase(url: string | undefined): string {
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!/_test$|^test_/.test(name)) throw new Error(`Refusing to use non-test database "${name}"`);
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "postgres", "db"].includes(host) && process.env.CI !== "true") {
    throw new Error(`Refusing to run DB tests against remote host "${host}"`);
  }
  return url;
}
