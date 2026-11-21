export function assertTestDatabase(url: string | undefined): string {
  if (!url) throw new Error('DATABASE_URL is required (see .env.test.example)');
  let name: string;
  try {
    name = new URL(url).pathname.slice(1);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (!/test/i.test(name)) {
    throw new Error(`Refusing to use the database "${name}": its name must contain "test"`);
  }
  return url;
}
